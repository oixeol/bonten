import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { isUUID } from 'class-validator';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { UpdatePartyRolesDto } from './dto/update-party-roles.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class PartiesService {
  private readonly inviteCodeTtlMs = 24 * 60 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(userId: string, gameId: string, mode?: string) {
    const party = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const existing = await tx.partyMember.findFirst({
        where: { userId, party: { status: { in: ['lobby', 'in_queue'] } } },
      });
      if (existing) throw new ForbiddenException('Already in an active party');

      const party = await tx.party.create({
        data: {
          leaderId: userId,
          gameId,
          mode,
          isOpen: false,
          status: 'lobby',
          inviteCode: this.createInviteCode(),
          inviteCodeExpiresAt: new Date(Date.now() + this.inviteCodeTtlMs),
        },
      });
      await tx.partyMember.create({
        data: { partyId: party.id, userId, ready: false },
      });
      return party;
    });
    this.notifyPartyChanged(party.id, 'created', userId);
    return party;
  }

  async findById(id: string) {
    if (!isUUID(id)) throw new BadRequestException('Invalid party UUID');
    const party = await this.prisma.party.findUnique({
      where: { id },
      include: {
        members: { include: { user: true } },
        game: true,
        invites: { where: { status: 'pending' }, include: { invitedUser: true, inviter: true } },
      },
    });
    if (!party) throw new NotFoundException('Party not found');
    const { inviteCode, inviteCodeExpiresAt, ...safeParty } = party;
    void inviteCode;
    void inviteCodeExpiresAt;
    return safeParty;
  }

  async findMine(userId: string) {
    const membership = await this.prisma.partyMember.findFirst({
      where: { userId, party: { status: { in: ['lobby', 'in_queue'] } } },
      include: {
        party: {
          include: {
            members: { include: { user: true } },
            game: true,
          },
        },
      },
    });
    return membership?.party ?? null;
  }

  async joinByCode(userId: string, code: string) {
    const minuteWindow = Math.floor(Date.now() / 60_000);
    const attemptCount = Number(await this.redis.eval(
      "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count",
      1,
      `parties:join-by-code:${userId}:${minuteWindow}`,
      60,
    ));
    if (attemptCount > 10) {
      throw new HttpException('Too many lobby code attempts. Try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (code.length < 16 || code.length > 36) throw new NotFoundException('Lobby not found');

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const candidate = await tx.party.findFirst({
        where: { inviteCode: code },
        select: { id: true },
      });
      if (!candidate) throw new NotFoundException('Lobby not found');
      await tx.$queryRaw`SELECT "id" FROM "parties" WHERE "id" = ${candidate.id}::uuid FOR UPDATE`;

      const party = await tx.party.findUnique({
        where: { id: candidate.id },
        include: { members: true },
      });
      if (
        !party ||
        party.status !== 'lobby' ||
        party.inviteCode !== code ||
        !party.inviteCodeExpiresAt ||
        party.inviteCodeExpiresAt <= new Date()
      ) {
        throw new NotFoundException('Lobby not found');
      }

      let currentMembership = await tx.partyMember.findFirst({
        where: { userId, party: { status: { in: ['lobby', 'in_queue'] } } },
        include: { party: { include: { members: true } } },
      });
      if (currentMembership?.partyId === party.id) {
        return { joined: true, partyId: party.id, mode: party.mode };
      }

      if (currentMembership) {
        await tx.$queryRaw`SELECT "id" FROM "parties" WHERE "id" = ${currentMembership.partyId}::uuid FOR UPDATE`;
        currentMembership = await tx.partyMember.findFirst({
          where: { userId, party: { status: { in: ['lobby', 'in_queue'] } } },
          include: { party: { include: { members: true } } },
        });
      }

      if (party.members.length >= 5) throw new BadRequestException('Lobby is full');
      if (currentMembership?.party.status === 'in_queue') {
        throw new ForbiddenException('Leave the matchmaking queue before joining another lobby');
      }
      if (currentMembership && currentMembership.party.members.length > 1) {
        throw new ForbiddenException('Leave your current lobby before joining another');
      }

      if (currentMembership) {
        await tx.partyMember.delete({ where: { id: currentMembership.id } });
        if (currentMembership.party.leaderId === userId) {
          const remaining = await tx.partyMember.findFirst({ where: { partyId: currentMembership.partyId } });
          await tx.party.update({
            where: { id: currentMembership.partyId },
            data: remaining ? { leaderId: remaining.userId } : { status: 'finished' },
          });
        }
      }

      await tx.partyMember.create({
        data: { partyId: party.id, userId, ready: false },
      });
      return { joined: true, partyId: party.id, mode: party.mode };
    });
    if (result.joined) this.notifyPartyChanged(result.partyId, 'member_joined', userId);
    return result;
  }

  async invite(partyId: string, inviterId: string, targetUserId: string) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } });
    if (!party) throw new NotFoundException('Party not found');
    if (party.leaderId !== inviterId) throw new ForbiddenException('Only leader can invite');

    // Verificar se o convidado já está em uma party
    const existing = await this.prisma.partyMember.findFirst({
      where: { userId: targetUserId, party: { status: { in: ['lobby', 'in_queue'] } } },
    });
    if (existing) throw new ForbiddenException('User already in a party');

    // Verificar se já foi convidado
    const existingInvite = await this.prisma.partyInvite.findFirst({
      where: { partyId, invitedUserId: targetUserId, status: 'pending' },
    });
    if (existingInvite) throw new ForbiddenException('Already invited');

    const invite = await this.prisma.partyInvite.create({
      data: {
        partyId,
        invitedUserId: targetUserId,
        invitedBy: inviterId,
        status: 'pending',
        expiresAt: new Date(Date.now() + 60 * 1000),
      },
    });

    // Notificação
    await this.prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'COMMUNITY_INVITE',
        title: 'Convite para Party',
        body: 'Você foi convidado para uma party.',
        metadata: { partyId, inviteId: invite.id, inviteType: 'party' },
      },
    });
    this.realtime.emitUserUpdate(targetUserId, 'party.invite', { partyId, inviteId: invite.id });

    return invite;
  }

  async acceptInvite(inviteId: string, userId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const invite = await tx.partyInvite.findUnique({ where: { id: inviteId } });
      if (!invite || invite.invitedUserId !== userId) throw new NotFoundException('Invite not found');
      if (invite.status !== 'pending') throw new ForbiddenException('Invite already processed');
      if (invite.expiresAt < new Date()) {
        await tx.partyInvite.update({ where: { id: inviteId }, data: { status: 'expired' } });
        return { expired: true as const };
      }

      await tx.$queryRaw`SELECT "id" FROM "parties" WHERE "id" = ${invite.partyId}::uuid FOR UPDATE`;
      const party = await tx.party.findUnique({
        where: { id: invite.partyId },
        include: { members: true },
      });
      if (!party || party.status !== 'lobby') throw new ForbiddenException('Lobby is not available');
      if (party.members.length >= 5) throw new BadRequestException('Lobby is full');

      const existing = await tx.partyMember.findFirst({
        where: { userId, party: { status: { in: ['lobby', 'in_queue'] } } },
      });
      if (existing) throw new ForbiddenException('Already in a party');

      await tx.partyInvite.update({ where: { id: inviteId }, data: { status: 'accepted' } });
      await tx.partyMember.create({
        data: { partyId: invite.partyId, userId, ready: false },
      });
      return { accepted: true, partyId: invite.partyId };
    });
    if ('expired' in result) throw new ForbiddenException('Invite expired');
    this.notifyPartyChanged(result.partyId, 'invite_accepted', userId);
    return result;
  }

  async declineInvite(inviteId: string, userId: string) {
    const invite = await this.prisma.partyInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.invitedUserId !== userId) throw new NotFoundException('Invite not found');

    await this.prisma.partyInvite.update({ where: { id: inviteId }, data: { status: 'rejected' } });
    this.realtime.emitUserUpdate(invite.invitedBy, 'party.updated', {
      partyId: invite.partyId,
      reason: 'invite_declined',
    });
    return { declined: true };
  }

  async leave(partyId: string, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "parties" WHERE "id" = ${partyId}::uuid FOR UPDATE`;
      const member = await tx.partyMember.findFirst({ where: { partyId, userId } });
      if (!member) throw new NotFoundException('Not a member');

      const party = await tx.party.findUnique({ where: { id: partyId } });
      if (!party) throw new NotFoundException('Party not found');
      if (party.status === 'in_queue') {
        throw new ForbiddenException('Cancel matchmaking before leaving the lobby');
      }

      await tx.partyMember.delete({ where: { id: member.id } });
      if (party.leaderId === userId) {
        const remaining = await tx.partyMember.findFirst({ where: { partyId } });
        await tx.party.update({
          where: { id: partyId },
          data: remaining ? { leaderId: remaining.userId } : { status: 'finished' },
        });
      }
    });
    this.notifyPartyChanged(partyId, 'member_left', userId);
    this.realtime.revokePartySubscription(userId, partyId);
    return { left: true };
  }

  async setReady(partyId: string, userId: string, ready: boolean) {
    const member = await this.prisma.partyMember.findFirst({ where: { partyId, userId } });
    if (!member) throw new NotFoundException('Not a member');

    await this.prisma.partyMember.update({ where: { id: member.id }, data: { ready } });
    this.notifyPartyChanged(partyId, 'member_ready', userId);
    return { ready };
  }

  async updateMemberRoles(partyId: string, userId: string, roles: UpdatePartyRolesDto) {
    if (roles.role === undefined) {
      throw new BadRequestException('A role must be provided');
    }

    const updatedMember = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "parties" WHERE "id" = ${partyId}::uuid FOR UPDATE`;

      const party = await tx.party.findUnique({ where: { id: partyId } });
      if (!party) throw new NotFoundException('Party not found');
      if (party.status !== 'lobby') throw new ForbiddenException('Role preferences cannot change while queued');

      const member = await tx.partyMember.findFirst({ where: { partyId, userId } });
      if (!member) throw new NotFoundException('Not a member');
      const game = await tx.game.findUnique({
        where: { id: roles.gameId },
        select: { roles: true },
      });
      if (!game) throw new NotFoundException('Game not found');
      if (roles.role && !game.roles.includes(roles.role)) {
        throw new BadRequestException('Selected role is not available for this game');
      }
      if (roles.role) {
        const duplicateRole = await tx.partyMember.findFirst({
          where: { partyId, userId: { not: userId }, role: roles.role },
        });
        if (duplicateRole) throw new BadRequestException('Another lobby member already selected this role');
      }

      return tx.partyMember.update({
        where: { id: member.id },
        data: { role: roles.role },
      });
    });
    this.notifyPartyChanged(partyId, 'role_updated', userId);
    return updatedMember;
  }

  async toggleOpen(partyId: string, userId: string) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } });
    if (!party) throw new NotFoundException('Party not found');
    if (party.leaderId !== userId) throw new ForbiddenException('Only leader can change lobby type');

    await this.prisma.party.update({ where: { id: partyId }, data: { isOpen: !party.isOpen } });
    this.notifyPartyChanged(partyId, 'visibility_updated', userId);
    return { isOpen: !party.isOpen };
  }

  async regenerateInviteCode(partyId: string, userId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "parties" WHERE "id" = ${partyId}::uuid FOR UPDATE`;
      const party = await tx.party.findUnique({ where: { id: partyId } });
      if (!party) throw new NotFoundException('Party not found');
      if (party.leaderId !== userId) throw new ForbiddenException('Only leader can manage the lobby code');
      if (party.status !== 'lobby') throw new ForbiddenException('Lobby code cannot change while queued');

      return tx.party.update({
        where: { id: partyId },
        data: {
          inviteCode: this.createInviteCode(),
          inviteCodeExpiresAt: new Date(Date.now() + this.inviteCodeTtlMs),
        },
        select: { inviteCode: true, inviteCodeExpiresAt: true },
      });
    });
    this.notifyPartyChanged(partyId, 'invite_code_regenerated', userId);
    return result;
  }

  async revokeInviteCode(partyId: string, userId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "parties" WHERE "id" = ${partyId}::uuid FOR UPDATE`;
      const party = await tx.party.findUnique({ where: { id: partyId } });
      if (!party) throw new NotFoundException('Party not found');
      if (party.leaderId !== userId) throw new ForbiddenException('Only leader can manage the lobby code');
      if (party.status !== 'lobby') throw new ForbiddenException('Lobby code cannot change while queued');

      await tx.party.update({
        where: { id: partyId },
        data: { inviteCode: null, inviteCodeExpiresAt: null },
      });
      return { revoked: true };
    });
    this.notifyPartyChanged(partyId, 'invite_code_revoked', userId);
    return result;
  }

  async removeMember(partyId: string, leaderId: string, targetUserId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${targetUserId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "parties" WHERE "id" = ${partyId}::uuid FOR UPDATE`;
      const party = await tx.party.findUnique({ where: { id: partyId } });
      if (!party) throw new NotFoundException('Party not found');
      if (party.leaderId !== leaderId) throw new ForbiddenException('Only leader can remove members');
      if (party.status === 'in_queue') {
        throw new ForbiddenException('Cancel matchmaking before removing a lobby member');
      }

      const member = await tx.partyMember.findFirst({ where: { partyId, userId: targetUserId } });
      if (!member) throw new NotFoundException('Member not found');
      await tx.partyMember.delete({ where: { id: member.id } });
      return { removed: true };
    });
    this.notifyPartyChanged(partyId, 'member_removed', targetUserId);
    this.realtime.revokePartySubscription(targetUserId, partyId);
    return result;
  }

  async listAvailable(gameId?: string) {
    const parties = await this.prisma.party.findMany({
      where: {
        status: 'lobby',
        isOpen: true,
        ...(gameId ? { gameId } : {}),
      },
      include: { members: { include: { user: true } }, game: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return parties.map((party) => {
      const { inviteCode, inviteCodeExpiresAt, ...safeParty } = party;
      void inviteCode;
      void inviteCodeExpiresAt;
      return safeParty;
    });
  }

  private createInviteCode() {
    return randomBytes(12).toString('base64url');
  }

  private notifyPartyChanged(partyId: string, reason: string, userId?: string) {
    const payload = { partyId, reason };
    this.realtime.emitPartyUpdate(partyId, 'party.updated', payload);
    if (userId) this.realtime.emitUserUpdate(userId, 'party.updated', payload);
    this.realtime.emitLobbyUpdate(payload);
  }
}