import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RolePermission } from '@prisma/client';

@Injectable()
export class RolesService {
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
    return { admin: owner || permissions.has(RolePermission.ADMIN), permissions };
  }

  private async requireManager(userId: string, communityId: string, affectedPermissions: RolePermission[]) {
    const { admin, permissions } = await this.access(userId, communityId);
    if (!admin && (!permissions.has(RolePermission.MANAGE_ROLES) ||
      affectedPermissions.some((permission) => !permissions.has(permission)))) {
      throw new ForbiddenException('Cannot manage roles beyond your permissions');
    }
  }

  private async role(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(userId: string, communityId: string, data: { name: string; color?: string; permissions?: RolePermission[] }) {
    await this.requireManager(userId, communityId, data.permissions ?? []);
    return this.prisma.role.create({
      data: {
        communityId,
        name: data.name,
        color: data.color,
        permissions: data.permissions ?? [],
      },
    });
  }

  async findById(userId: string, id: string) {
    const role = await this.role(id);
    await this.access(userId, role.communityId);
    return role;
  }

  async listByCommunity(userId: string, communityId: string) {
    await this.access(userId, communityId);
    return this.prisma.role.findMany({
      where: { communityId },
      orderBy: { position: 'asc' },
    });
  }

  async update(userId: string, id: string, data: { name?: string; color?: string; permissions?: RolePermission[] }) {
    const role = await this.role(id);
    await this.requireManager(userId, role.communityId, [...role.permissions, ...(data.permissions ?? [])]);
    return this.prisma.role.update({
      where: { id },
      data: { name: data.name, color: data.color, permissions: data.permissions },
    });
  }

  async delete(userId: string, id: string) {
    const role = await this.role(id);
    await this.requireManager(userId, role.communityId, role.permissions);
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }

  async assignRole(userId: string, memberId: string, roleId: string) {
    const role = await this.role(roleId);
    const member = await this.prisma.communityMember.findUnique({
      where: { id: memberId }, include: { role: true },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.communityId !== role.communityId) {
      throw new BadRequestException('Role and member must belong to the same community');
    }
    await this.requireManager(userId, role.communityId, [...role.permissions, ...(member.role?.permissions ?? [])]);
    return this.prisma.communityMember.update({ where: { id: memberId }, data: { roleId } });
  }
}
