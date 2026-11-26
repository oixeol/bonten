import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
        select: { partySizesAllowed: true, slug: true },
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

      return queueEntry;
    });

    return entry;
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
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status !== 'pending') throw new ConflictException('Match is not awaiting confirmation');

    const player = await this.prisma.matchPlayer.findFirst({
      where: { matchId, userId },
    });
    if (!player) throw new ForbiddenException('Not a participant');

    const result = await this.prisma.matchResult.findUnique({ where: { matchId } });
    if (!result) throw new NotFoundException('Match result not found');

    // Determine which team the player is on
    const isTeamA = player.team === 'A';
    await this.prisma.matchResult.update({
      where: { matchId },
      data: isTeamA ? { confirmedByA: true } : { confirmedByB: true },
    });

    // Check if both confirmed
    const updated = await this.prisma.matchResult.findUnique({ where: { matchId } });
    if (updated?.confirmedByA && updated?.confirmedByB) {
      await this.prisma.match.update({ where: { id: matchId }, data: { status: 'in_progress', startedAt: new Date() } });
    }

    return { accepted: true, matchStarted: updated?.confirmedByA && updated?.confirmedByB };
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