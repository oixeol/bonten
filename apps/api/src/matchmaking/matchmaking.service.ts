import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assignTeamRoles, findMatchGroups, QueueMatchMember } from './matchmaker';

@Injectable()
export class MatchmakingService {
  constructor(private prisma: PrismaService) {}

  async joinQueue(
    userId: string,
    gameId: string,
    mode: string,
    region: string,
    primaryRole?: string | null,
    secondaryRole?: string | null,
  ) {
    const entry = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`;

      const partyMember = await tx.partyMember.findFirst({
        where: { userId, party: { status: { in: ['lobby', 'in_queue'] } } },
        include: { party: true },
      });
      if (partyMember?.party.status === 'in_queue') {
        throw new ForbiddenException('Already in queue');
      }

      if (partyMember) {
        await tx.$queryRaw`SELECT "id" FROM "parties" WHERE "id" = ${partyMember.partyId}::uuid FOR UPDATE`;
      }

      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: {
          partySizesAllowed: true,
          slug: true,
          playersPerMatch: true,
          teamSize: true,
          hasTeams: true,
        },
      });
      if (!game) throw new NotFoundException('Game not found');
      if (secondaryRole && !primaryRole) {
        throw new BadRequestException('A primary role is required when a secondary role is selected');
      }
      if (primaryRole && primaryRole === secondaryRole) {
        throw new BadRequestException('Primary and secondary roles must be different');
      }
      if (game.slug !== 'lol' && (primaryRole || secondaryRole)) {
        throw new BadRequestException('Role preferences are only available for League of Legends');
      }
      if (partyMember && (primaryRole || secondaryRole)) {
        throw new BadRequestException('Set route preferences individually in the lobby before queueing');
      }

      const partySize = partyMember
        ? await tx.partyMember.count({ where: { partyId: partyMember.partyId } })
        : 1;
      if (partySize === 4) {
        throw new BadRequestException('Lobbies com 4 jogadores não podem entrar na fila. Remova um jogador ou convide mais um.');
      }
      if (!game.partySizesAllowed.includes(partySize)) {
        throw new BadRequestException(
          `Este jogo permite grupos de ${game.partySizesAllowed.join(', ')} jogadores; o lobby atual tem ${partySize}.`,
        );
      }

      const queueScope = partyMember ? { partyId: partyMember.partyId } : { userId };
      const existingQueue = await tx.matchmakingQueue.findFirst({
        where: { ...queueScope, status: { in: ['waiting', 'matched'] } },
      });
      if (existingQueue) throw new ForbiddenException('Already in queue');

      if (partyMember) {
        const updatedParty = await tx.party.updateMany({
          where: { id: partyMember.partyId, status: 'lobby' },
          data: { status: 'in_queue', gameId },
        });
        if (updatedParty.count !== 1) throw new ForbiddenException('Party is not available for matchmaking');
      }

      const queueEntry = await tx.matchmakingQueue.create({
        data: {
          gameId,
          mode,
          region,
          userId: partyMember ? null : userId,
          partyId: partyMember?.partyId ?? null,
          status: 'waiting',
        },
      });

      const members = partyMember
        ? await tx.partyMember.findMany({
            where: { partyId: partyMember.partyId },
            select: { userId: true, primaryRole: true, secondaryRole: true },
          })
        : [{ userId, primaryRole: primaryRole ?? null, secondaryRole: secondaryRole ?? null }];
      await tx.matchmakingQueueMember.createMany({
        data: members.map((member) => ({
          queueId: queueEntry.id,
          userId: member.userId,
          primaryRole: game.slug === 'lol' ? member.primaryRole : null,
          secondaryRole: game.slug === 'lol' ? member.secondaryRole : null,
        })),
      });

      const matchId = await this.createMatchIfReady(tx, gameId, mode, region, game);
      if (!matchId) return queueEntry;
      const matchedEntry = await tx.matchmakingQueue.findUnique({ where: { id: queueEntry.id } });
      if (!matchedEntry) throw new NotFoundException('Queue entry not found after match creation');
      return matchedEntry;
    });

    return entry;
  }

  private async createMatchIfReady(
    tx: Prisma.TransactionClient,
    gameId: string,
    mode: string,
    region: string,
    game: { playersPerMatch: number; teamSize: number; hasTeams: boolean },
  ) {
    const scope = `${gameId}:${mode}:${region}`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${scope}, 0))`;

    const lockedQueueEntries = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "matchmaking_queues"
      WHERE "gameId" = ${gameId}::uuid
        AND "mode" = ${mode}
        AND "region" = ${region}
        AND "status" = 'waiting'
      ORDER BY "joinedAt" ASC, "id" ASC
      LIMIT 100
      FOR UPDATE SKIP LOCKED
    `;
    const queueIds = lockedQueueEntries.map(({ id }) => id);
    if (queueIds.length === 0) return null;

    const queuedGroups = await tx.matchmakingQueue.findMany({
      where: { id: { in: queueIds } },
      orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
      include: {
        members: {
          select: { userId: true, primaryRole: true, secondaryRole: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const assignments = findMatchGroups(
      queuedGroups.map((entry) => ({ id: entry.id, members: entry.members })),
      game.playersPerMatch,
      game.hasTeams,
      game.teamSize,
    );
    if (!assignments) return null;

    const match = await tx.match.create({
      data: { gameId, mode, region, status: 'pending' },
    });
    const matchPlayers: Array<{
      matchId: string;
      userId: string;
      team: 'A' | 'B' | null;
      role: string | null;
    }> = [];

    if (game.hasTeams) {
      for (const team of ['A', 'B'] as const) {
        const members = assignments
          .filter((assignment) => assignment.team === team)
          .flatMap((assignment) => assignment.group.members);
        const roles = assignTeamRoles(members);
        members.forEach((member: QueueMatchMember, index) => {
          matchPlayers.push({
            matchId: match.id,
            userId: member.userId,
            team,
            role: roles[index] ?? null,
          });
        });
      }
    } else {
      for (const assignment of assignments) {
        for (const member of assignment.group.members) {
          matchPlayers.push({ matchId: match.id, userId: member.userId, team: null, role: null });
        }
      }
    }

    await tx.matchPlayer.createMany({ data: matchPlayers });
    await tx.matchResult.create({ data: { matchId: match.id } });
    const updatedQueueEntries = await tx.matchmakingQueue.updateMany({
      where: { id: { in: assignments.map(({ group }) => group.id) }, status: 'waiting' },
      data: { status: 'matched', matchId: match.id },
    });
    if (updatedQueueEntries.count !== assignments.length) {
      throw new ConflictException('Queue entries changed while creating the match');
    }

    return match.id;
  }

  async leaveQueue(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const partyMember = await tx.partyMember.findFirst({
        where: { userId, party: { status: 'in_queue' } },
      });
      if (partyMember) {
        await tx.$queryRaw`SELECT "id" FROM "parties" WHERE "id" = ${partyMember.partyId}::uuid FOR UPDATE`;
      }

      const queueScope = partyMember ? { partyId: partyMember.partyId } : { userId };
      const queueEntry = await tx.matchmakingQueue.findFirst({
        where: { ...queueScope, status: 'waiting' },
      });
      if (!queueEntry) throw new NotFoundException('Not in queue');

      await tx.matchmakingQueue.update({
        where: { id: queueEntry.id },
        data: { status: 'cancelled' },
      });
      if (partyMember) {
        await tx.party.updateMany({
          where: { id: partyMember.partyId, status: 'in_queue' },
          data: { status: 'lobby' },
        });
      }
    });

    return { left: true };
  }

  async getQueueStatus(userId: string) {
    const partyMember = await this.prisma.partyMember.findFirst({
      where: { userId, party: { status: 'in_queue' } },
    });
    const queueScope = partyMember ? { partyId: partyMember.partyId } : { userId };
    const entry = await this.prisma.matchmakingQueue.findFirst({
      where: { ...queueScope, status: { in: ['waiting', 'matched'] } },
      include: { game: true },
      orderBy: { joinedAt: 'desc' },
    });
    return entry;
  }

  async acceptMatch(matchId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "matches" WHERE "id" = ${matchId}::uuid FOR UPDATE`;
      const match = await tx.match.findUnique({ where: { id: matchId } });
      if (!match) throw new NotFoundException('Match not found');
      if (match.status !== 'pending') throw new ConflictException('Match is not awaiting confirmation');

      const player = await tx.matchPlayer.findFirst({ where: { matchId, userId } });
      if (!player) throw new ForbiddenException('Not a participant');

      await tx.matchPlayer.updateMany({
        where: { matchId, userId, acceptedAt: null },
        data: { acceptedAt: new Date() },
      });

      const acceptedPlayers = await tx.matchPlayer.count({ where: { matchId, acceptedAt: { not: null } } });
      const totalPlayers = await tx.matchPlayer.count({ where: { matchId } });
      const matchStarted = totalPlayers > 0 && acceptedPlayers === totalPlayers;
      if (matchStarted) {
        await tx.match.update({
          where: { id: matchId },
          data: { status: 'in_progress', startedAt: new Date() },
        });
      }

      return { accepted: true, matchStarted };
    });
  }

  async declineMatch(matchId: string, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findFirst({
        where: { id: matchId, players: { some: { userId } } },
        select: { id: true, status: true },
      });
      if (!match) throw new NotFoundException('Match not found');
      if (match.status !== 'pending') throw new ConflictException('Match is not awaiting confirmation');

      const updated = await tx.match.updateMany({
        where: { id: matchId, status: 'pending' },
        data: { status: 'cancelled' },
      });
      if (updated.count !== 1) throw new ConflictException('Match is no longer awaiting confirmation');

      const queueEntries = await tx.matchmakingQueue.findMany({
        where: { matchId, status: 'matched' },
        select: { id: true, partyId: true },
      });
      await tx.matchmakingQueue.updateMany({
        where: { matchId, status: 'matched' },
        data: { status: 'cancelled', matchId: null },
      });
      const partyIds = queueEntries.flatMap((entry) => entry.partyId ? [entry.partyId] : []);
      if (partyIds.length > 0) {
        await tx.party.updateMany({
          where: { id: { in: partyIds }, status: 'in_queue' },
          data: { status: 'lobby' },
        });
      }
    });

    return { declined: true };
  }

  async getMatch(matchId: string, userId: string) {
    const match = await this.prisma.match.findFirst({
      where: { id: matchId, players: { some: { userId } } },
      include: { players: { include: { user: true } }, result: true, game: true },
    });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }
}