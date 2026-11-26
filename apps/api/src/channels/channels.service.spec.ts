import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChannelType, RolePermission } from '@prisma/client';
import { ChannelsService } from './channels.service';

function setup(permissions: RolePermission[] = [], userId = 'member', member = true) {
  const community = {
    ownerId: 'owner', roles: [] as { permissions: RolePermission[] }[],
    members: member ? [{ role: { communityId: 'community', permissions } }] : [],
  };
  const channel = { id: 'channel', communityId: 'community', isPrivate: true };
  const prisma = {
    community: { findUnique: jest.fn().mockResolvedValue(community) },
    channel: {
      findUnique: jest.fn().mockResolvedValue(channel), findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    },
  };
  return { service: new ChannelsService(prisma as never), prisma, community, channel, userId };
}

describe('ChannelsService authorization', () => {
  it.each(['create', 'update', 'delete'] as const)('blocks ordinary member %s', async (operation) => {
    const { service, prisma } = setup();
    const result = operation === 'create'
      ? service.create('member', 'community', { name: 'voice', type: ChannelType.VOICE })
      : operation === 'update' ? service.update('member', 'channel', { isPrivate: false })
        : service.delete('member', 'channel');
    await expect(result).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.channel[operation]).not.toHaveBeenCalled();
  });

  it.each([RolePermission.ADMIN, RolePermission.MANAGE_CHANNELS])('allows %s mutations and private reads', async (permission) => {
    const { service, prisma } = setup([permission]);
    await service.create('member', 'community', { name: 'voice', type: ChannelType.VOICE });
    await service.findById('member', 'channel');
    await service.update('member', 'channel', { isPrivate: false });
    await service.delete('member', 'channel');
    expect(prisma.channel.create).toHaveBeenCalled();
    expect(prisma.channel.update).toHaveBeenCalled();
    expect(prisma.channel.delete).toHaveBeenCalled();
  });

  it('allows owner even without membership', async () => {
    const { service, prisma } = setup([], 'owner', false);
    await service.findById('owner', 'channel');
    await service.listByCommunity('owner', 'community');
    await service.update('owner', 'channel', { name: 'renamed' });
    expect(prisma.channel.findMany).toHaveBeenCalledWith({ where: { communityId: 'community' }, orderBy: { position: 'asc' } });
  });

  it('blocks nonmembers even with default ADMIN', async () => {
    const { service, community, prisma } = setup([], 'outsider', false);
    community.roles.push({ permissions: [RolePermission.ADMIN] });
    await expect(service.listByCommunity('outsider', 'community')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.findById('outsider', 'channel')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.update('outsider', 'channel', { isPrivate: false })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.channel.update).not.toHaveBeenCalled();
  });

  it('filters private channels and allows public read for member', async () => {
    const { service, prisma, channel } = setup();
    await expect(service.findById('member', 'channel')).rejects.toBeInstanceOf(ForbiddenException);
    channel.isPrivate = false;
    await expect(service.findById('member', 'channel')).resolves.toEqual(channel);
    await service.listByCommunity('member', 'community');
    expect(prisma.channel.findMany).toHaveBeenCalledWith({
      where: { communityId: 'community', isPrivate: false }, orderBy: { position: 'asc' },
    });
  });

  it('includes default permissions but rejects foreign role', async () => {
    const { service, community } = setup();
    community.roles.push({ permissions: [RolePermission.MANAGE_CHANNELS] });
    await expect(service.findById('member', 'channel')).resolves.toBeDefined();
    community.members[0].role.communityId = 'foreign';
    await expect(service.findById('member', 'channel')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 404 without writing missing channel', async () => {
    const { service, prisma } = setup();
    prisma.channel.findUnique.mockResolvedValue(null);
    await expect(service.delete('member', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.channel.delete).not.toHaveBeenCalled();
  });

  it('never forwards nested writes or communityId to Prisma', async () => {
    const { service, prisma } = setup([RolePermission.ADMIN]);
    await service.update('member', 'channel', { name: 'safe', communityId: 'foreign', community: { update: { ownerId: 'member' } } } as never);
    expect(prisma.channel.update).toHaveBeenCalledWith({
      where: { id: 'channel' }, data: { name: 'safe', isPrivate: undefined, position: undefined },
    });
  });
});
