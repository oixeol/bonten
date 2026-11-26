import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvitesService {
  constructor(private prisma: PrismaService) {}

  async create(communityId: string, createdBy: string, data: { maxUses?: number; expiresAt?: Date }) {
    const code = Math.random().toString(36).substring(2, 10);
    return this.prisma.invite.create({
      data: {
        communityId,
        createdBy,
        code,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findByCode(code: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { code },
      include: {
        community: { select: { id: true, name: true, isPrivate: true } },
      },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invite expired');
    }
    if (invite.maxUses && invite.uses >= invite.maxUses) {
      throw new ForbiddenException('Invite exhausted');
    }
    return invite;
  }

  async useInvite(code: string, _userId: string) {
    void _userId; // reserved for future validation/auditing
    const invite = await this.findByCode(code);
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    });
    return invite.community;
  }

  async listByCommunity(communityId: string) {
    return this.prisma.invite.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: { select: { id: true, username: true, displayName: true } },
      },
    });
  }

  async revoke(id: string) {
    await this.prisma.invite.delete({ where: { id } });
    return { success: true };
  }
}