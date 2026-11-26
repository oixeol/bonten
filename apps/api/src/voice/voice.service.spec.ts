import { RolePermission } from '@prisma/client';

const cid = '11111111-1111-4111-8111-111111111111';
const did = '22222222-2222-4222-8222-222222222222';
const owner = '44444444-4444-4444-8444-444444444444';
const user = '55555555-5555-5555-8555-555555555555';

function makeMockChannel(isPrivate: boolean, permissions: RolePermission[] = [RolePermission.CONNECT_VOICE, RolePermission.SPEAK]) {
  return {
    id: did, communityId: cid, type: 'VOICE', isPrivate,
    community: { ownerId: owner, members: [{ userId: user, role: { communityId: cid, permissions } }],
      roles: [{ isDefault: true, communityId: cid, permissions: [] }] },
  };
}

describe('VoiceService authorization', () => {
  const prisma = { channel: { findUnique: jest.fn().mockResolvedValue(makeMockChannel(false)) } };
  type MockConfig = { getOrThrow: (k: string) => any; get: (k: string) => any };
  const config: MockConfig = {
    getOrThrow: (k: string) => ({
      'livekit.apiKey': 'k',
      'livekit.apiSecret': 's',
      'livekit.wsUrl': `ws://localhost:7880`,
      'livekit.internalUrl': 'ws://localhost:7880',
      nodeEnv: 'test',
    }[k]),
    get: (k: string) => ({
      'livekit.internalUrl': 'ws://localhost:7880',
      nodeEnv: 'test',
    }[k]),
  };
  const { VoiceService } = require('./voice.service');
  let svc: InstanceType<typeof VoiceService>;

  beforeEach(() => {
    prisma.channel.findUnique.mockReset().mockResolvedValue(makeMockChannel(false));
    svc = new VoiceService(config as any, prisma as any);
  });

  it('rejects non-member', async () => {
    prisma.channel.findUnique.mockReset().mockResolvedValue({ ...makeMockChannel(false), community: { ownerId: owner, members: [], roles: [{ isDefault: true, communityId: cid, permissions: [] }] } });
    await expect(svc.createToken({ userId: user, username: 'x', communityId: cid, channelId: did })).rejects.toThrow('Not a community member');
  });
  it('rejects private channel without manage', async () => {
    prisma.channel.findUnique.mockReset().mockResolvedValue(makeMockChannel(true, [RolePermission.CONNECT_VOICE]));
    await expect(svc.createToken({ userId: user, username: 'x', communityId: cid, channelId: did })).rejects.toThrow('Private voice channel');
  });
  it('rejects malformed UUID', async () => {
    await expect(svc.createToken({ userId: user, username: 'x', communityId: 'bad', channelId: did })).rejects.toThrow('Invalid community or channel UUID');
  });
  it('authorizes member with CONNECT_VOICE', async () => {
    const token = await svc.createToken({ userId: user, username: 'test', communityId: cid, channelId: did });
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });
  it('authorizes private channel for owner', async () => {
    prisma.channel.findUnique.mockReset().mockResolvedValue({ ...makeMockChannel(true, [RolePermission.CONNECT_VOICE]), community: { ownerId: owner, members: [], roles: [] } });
    const token = await svc.createToken({ userId: owner, username: 'owner', communityId: cid, channelId: did });
    expect(typeof token).toBe('string');
  });
  it('owner can create private voice channel', async () => {
    await expect(svc.createToken({ userId: owner, username: 'owner', communityId: cid, channelId: did })).resolves.toBeDefined();
  });
});