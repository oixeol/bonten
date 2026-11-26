import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChannelType, RolePermission } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  private async access(userId: string, communityId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: {
        members: { where: { userId }, include: { role: true } },
        roles: { where: { OR: [{ isDefault: true }, { name: '@everyone' }] } },
      },
    });
    if (!community) throw new NotFoundException('Community not found');
    const owner = community.ownerId === userId;
    const member = community.members[0];
    if (!owner && !member) throw new ForbiddenException('Not a community member');
    if (member?.role && member.role.communityId !== communityId) {
      throw new ForbiddenException('Invalid community role');
    }
    const permissions = new Set<RolePermission>([
      ...community.roles.flatMap((role) => role.permissions),
      ...(member?.role?.permissions ?? []),
    ]);
    return owner || permissions.has(RolePermission.ADMIN) || permissions.has(RolePermission.MANAGE_CHANNELS);
  }

  private async requireManager(userId: string, communityId: string) {
    if (!await this.access(userId, communityId)) {
      throw new ForbiddenException('Missing MANAGE_CHANNELS permission');
    }
  }

  private async channel(id: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: { community: { select: { id: true, name: true } } },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    return channel;
  }

  async create(userId: string, communityId: string, data: { name: string; type: ChannelType; isPrivate?: boolean }) {
    await this.requireManager(userId, communityId);
    return this.prisma.channel.create({
      data: { communityId, name: data.name, type: data.type, isPrivate: data.isPrivate ?? false },
    });
  }

  async findById(userId: string, id: string) {
    const channel = await this.channel(id);
    const canManage = await this.access(userId, channel.communityId);
    // ponytail: no channel ACL exists; add explicit grants when private membership is supported.
    if (channel.isPrivate && !canManage) throw new ForbiddenException('Private channel');
    return channel;
  }

  async listByCommunity(userId: string, communityId: string) {
    const canManage = await this.access(userId, communityId);
    return this.prisma.channel.findMany({
      where: { communityId, ...(!canManage ? { isPrivate: false } : {}) },
      orderBy: { position: 'asc' },
    });
  }

  async update(userId: string, id: string, data: { name?: string; isPrivate?: boolean; position?: number }) {
    const channel = await this.channel(id);
    await this.requireManager(userId, channel.communityId);
    return this.prisma.channel.update({
      where: { id },
      data: { name: data.name, isPrivate: data.isPrivate, position: data.position },
    });
  }

  async delete(userId: string, id: string) {
    const channel = await this.channel(id);
    await this.requireManager(userId, channel.communityId);
    await this.prisma.channel.delete({ where: { id } });
    return { success: true };
  }
}
