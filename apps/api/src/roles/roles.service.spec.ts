import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RolePermission } from '@prisma/client';
import { RolesService } from './roles.service';

function setup(permissions: RolePermission[] = []) {
  const role = { id: 'role', communityId: 'community', permissions: [] as RolePermission[] };
  const community = {
    ownerId: 'owner', roles: [] as { permissions: RolePermission[] }[],
    members: [{ role: { communityId: 'community', permissions } }],
  };
  const target = { communityId: 'community', role: { permissions: [] as RolePermission[] } };
  const prisma = {
    community: { findUnique: jest.fn().mockResolvedValue(community) },
    role: { findUnique: jest.fn().mockResolvedValue(role), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    communityMember: { findUnique: jest.fn().mockResolvedValue(target), update: jest.fn() },
  };
  return { service: new RolesService(prisma as never), prisma, role, target, community };
}

describe('RolesService authorization', () => {
  it('blocks member creating, changing, deleting and assigning own role', async () => {
    const { service, prisma } = setup();
    await expect(service.create('member', 'community', { name: 'admin', permissions: [RolePermission.ADMIN] })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.update('member', 'role', { permissions: [RolePermission.ADMIN] })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.delete('member', 'role')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.assignRole('member', 'self', 'role')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.role.create).not.toHaveBeenCalled();
    expect(prisma.role.update).not.toHaveBeenCalled();
    expect(prisma.role.delete).not.toHaveBeenCalled();
    expect(prisma.communityMember.update).not.toHaveBeenCalled();
  });

  it('MANAGE_ROLES cannot grant ADMIN or permissions it lacks', async () => {
    const { service, role } = setup([RolePermission.MANAGE_ROLES]);
    await expect(service.create('member', 'community', { name: 'admin', permissions: [RolePermission.ADMIN] })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.update('member', 'role', { permissions: [RolePermission.MANAGE_CHANNELS] })).rejects.toBeInstanceOf(ForbiddenException);
    role.permissions = [RolePermission.ADMIN];
    await expect(service.assignRole('member', 'self', 'role')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.update('member', 'role', { permissions: [] })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.delete('member', 'role')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('cannot downgrade target with higher permissions', async () => {
    const { service, target, prisma } = setup([RolePermission.MANAGE_ROLES]);
    target.role.permissions = [RolePermission.ADMIN];
    await expect(service.assignRole('member', 'admin-member', 'role')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.communityMember.update).not.toHaveBeenCalled();
  });

  it.each(['owner', 'admin', 'manager'])('allows authorized %s within permissions', async (actor) => {
    const { service, prisma } = setup(actor === 'admin' ? [RolePermission.ADMIN] : [RolePermission.MANAGE_ROLES]);
    await service.create(actor, 'community', { name: 'role', permissions: [RolePermission.MANAGE_ROLES] });
    await service.update(actor, 'role', { permissions: [RolePermission.MANAGE_ROLES] });
    await service.assignRole(actor, 'target', 'role');
    await service.delete(actor, 'role');
    expect(prisma.role.create).toHaveBeenCalled();
    expect(prisma.communityMember.update).toHaveBeenCalled();
  });

  it('rejects cross-community assignment even for owner', async () => {
    const { service, target, prisma } = setup();
    target.communityId = 'foreign';
    await expect(service.assignRole('owner', 'target', 'role')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.communityMember.update).not.toHaveBeenCalled();
  });

  it('rejects foreign actor role and outsiders', async () => {
    const { service, community } = setup([RolePermission.ADMIN]);
    community.members[0].role.communityId = 'foreign';
    await expect(service.update('member', 'role', { name: 'bad' })).rejects.toBeInstanceOf(ForbiddenException);
    community.members = [];
    await expect(service.listByCommunity('outsider', 'community')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.findById('outsider', 'role')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('honors default permissions and owner without membership', async () => {
    const { service, community } = setup();
    community.roles.push({ permissions: [RolePermission.MANAGE_ROLES] });
    await expect(service.create('member', 'community', { name: 'role' })).resolves.toBeUndefined();
    community.members = [];
    await expect(service.create('owner', 'community', { name: 'admin', permissions: [RolePermission.ADMIN] })).resolves.toBeUndefined();
  });

  it('does not forward unknown fields or nested writes', async () => {
    const { service, prisma } = setup([RolePermission.ADMIN]);
    await service.update('member', 'role', { name: 'safe', communityId: 'foreign', members: { updateMany: {} } } as never);
    expect(prisma.role.update).toHaveBeenCalledWith({
      where: { id: 'role' }, data: { name: 'safe', color: undefined, permissions: undefined },
    });
  });
});
