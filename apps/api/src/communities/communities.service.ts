import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunitiesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: { name: string; description?: string; isPrivate?: boolean }) {
    const inviteCode = Math.random().toString(36).substring(2, 10);
    return this.prisma.community.create({
      data: {
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate ?? false,
        ownerId: userId,
        inviteCode,
        roles: {
          create: { name: '@everyone', permissions: [], position: 0 },
        },
      },
      include: {
        roles: true,
      },
    }).then(async (community) => {
      const defaultRole = community.roles.find((r) => r.name === '@everyone');
      if (defaultRole) {
        await this.prisma.communityMember.create({
          data: {
            communityId: community.id,
            userId,
            roleId: defaultRole.id,
          },
        });
      }
      return community;
    });
  }

  async findById(id: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        roles: { orderBy: { position: 'asc' } },
      },
    });
    if (!community) throw new NotFoundException('Community not found');
    return community;
  }

  async findByInviteCode(code: string) {
    const community = await this.prisma.community.findUnique({
      where: { inviteCode: code },
      include: {
        owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
    if (!community) throw new NotFoundException('Invalid invite code');
    return community;
  }

  async listUserCommunities(userId: string) {
    return this.prisma.community.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        roles: { orderBy: { position: 'asc' } },
      },
    });
  }

  async joinByInvite(userId: string, code: string) {
    const community = await this.findByInviteCode(code);
    const existing = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId } },
    });
    if (existing) throw new ForbiddenException('Already a member');
    return this.prisma.communityMember.create({
      data: { communityId: community.id, userId },
    });
  }

  async leave(userId: string, communityId: string) {
    const member = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (!member) throw new NotFoundException('Not a member');
    await this.prisma.communityMember.delete({ where: { id: member.id } });
    return { success: true };
  }

  async update(userId: string, communityId: string, data: { name?: string; description?: string }) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new NotFoundException('Community not found');
    if (community.ownerId !== userId) throw new ForbiddenException('Only the owner can update the community');
    // ponytailed: only name/description; other fields would require explicit DTO.
    return this.prisma.community.update({
      where: { id: communityId },
      data: { name: data.name, description: data.description },
    });
  }

  async delete(userId: string, communityId: string) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new NotFoundException('Community not found');
    if (community.ownerId !== userId) throw new ForbiddenException('Only the owner can delete the community');
    await this.prisma.community.delete({ where: { id: communityId } });
    return { success: true };
  }
}