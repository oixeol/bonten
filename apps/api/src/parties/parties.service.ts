import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isUUID } from 'class-validator';

@Injectable()
export class PartiesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, gameId: string, mode?: string) {
    // Verificar se já está em uma party ativa
    const existing = await this.prisma.partyMember.findFirst({
      where: { userId, party: { status: { in: ['lobby', 'in_queue'] } } },
    });
    if (existing) throw new ForbiddenException('Already in an active party');

    const party = await this.prisma.party.create({
      data: { leaderId: userId, gameId, mode, isOpen: false, status: 'lobby' },
    });

    await this.prisma.partyMember.create({
      data: { partyId: party.id, userId, ready: false },
    });

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
    return party;
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

    return invite;
  }

  async acceptInvite(inviteId: string, userId: string) {
    const invite = await this.prisma.partyInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.invitedUserId !== userId) throw new NotFoundException('Invite not found');
    if (invite.status !== 'pending') throw new ForbiddenException('Invite already processed');
    if (invite.expiresAt < new Date()) {
      await this.prisma.partyInvite.update({ where: { id: inviteId }, data: { status: 'expired' } });
      throw new ForbiddenException('Invite expired');
    }

    // Verificar se já está em party
    const existing = await this.prisma.partyMember.findFirst({
      where: { userId, party: { status: { in: ['lobby', 'in_queue'] } } },
    });
    if (existing) throw new ForbiddenException('Already in a party');

    await this.prisma.partyInvite.update({ where: { id: inviteId }, data: { status: 'accepted' } });

    await this.prisma.partyMember.create({
      data: { partyId: invite.partyId, userId, ready: false },
    });

    return { accepted: true, partyId: invite.partyId };
  }

  async declineInvite(inviteId: string, userId: string) {
    const invite = await this.prisma.partyInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.invitedUserId !== userId) throw new NotFoundException('Invite not found');

    await this.prisma.partyInvite.update({ where: { id: inviteId }, data: { status: 'rejected' } });
    return { declined: true };
  }

  async leave(partyId: string, userId: string) {
    const member = await this.prisma.partyMember.findFirst({
      where: { partyId, userId },
    });
    if (!member) throw new NotFoundException('Not a member');

    const party = await this.prisma.party.findUnique({ where: { id: partyId } });
    if (!party) throw new NotFoundException('Party not found');

    await this.prisma.partyMember.delete({ where: { id: member.id } });

    // Se o líder saiu, transferir liderança ou deletar party
    if (party.leaderId === userId) {
      const remaining = await this.prisma.partyMember.findFirst({ where: { partyId } });
      if (remaining) {
        await this.prisma.party.update({ where: { id: partyId }, data: { leaderId: remaining.userId } });
      } else {
        await this.prisma.party.update({ where: { id: partyId }, data: { status: 'finished' } });
      }
    }

    return { left: true };
  }

  async setReady(partyId: string, userId: string, ready: boolean) {
    const member = await this.prisma.partyMember.findFirst({ where: { partyId, userId } });
    if (!member) throw new NotFoundException('Not a member');

    await this.prisma.partyMember.update({ where: { id: member.id }, data: { ready } });
    return { ready };
  }

  async toggleOpen(partyId: string, userId: string) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } });
    if (!party) throw new NotFoundException('Party not found');
    if (party.leaderId !== userId) throw new ForbiddenException('Only leader can change lobby type');

    await this.prisma.party.update({ where: { id: partyId }, data: { isOpen: !party.isOpen } });
    return { isOpen: !party.isOpen };
  }

  async removeMember(partyId: string, leaderId: string, targetUserId: string) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } });
    if (!party) throw new NotFoundException('Party not found');
    if (party.leaderId !== leaderId) throw new ForbiddenException('Only leader can remove members');

    const member = await this.prisma.partyMember.findFirst({ where: { partyId, userId: targetUserId } });
    if (!member) throw new NotFoundException('Member not found');

    await this.prisma.partyMember.delete({ where: { id: member.id } });
    return { removed: true };
  }

  async listAvailable(gameId?: string) {
    return this.prisma.party.findMany({
      where: {
        status: 'lobby',
        isOpen: true,
        ...(gameId ? { gameId } : {}),
      },
      include: { members: { include: { user: true } }, game: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}