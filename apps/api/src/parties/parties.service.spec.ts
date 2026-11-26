import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { PartiesService } from './parties.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

const mockPrisma = {
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
  partyMember: {
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  party: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  partyInvite: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  game: { findUnique: jest.fn() },
};
const mockRedis = { eval: jest.fn() };

describe('PartiesService', () => {
  let service: PartiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartiesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();
    service = module.get<PartiesService>(PartiesService);
    jest.clearAllMocks();
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation((callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma));
    mockRedis.eval.mockResolvedValue(1);
  });

  it('finds the current user party with its lobby members and game', async () => {
    const party = { id: 'party-id', members: [], game: { id: 'game-id' } };
    mockPrisma.partyMember.findFirst.mockResolvedValue({ party });

    await expect(service.findMine('user-id')).resolves.toBe(party);
    expect(mockPrisma.partyMember.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-id', party: { status: { in: ['lobby', 'in_queue'] } } },
      include: {
        party: {
          include: {
            members: { include: { user: true } },
            game: true,
          },
        },
      },
    });
  });

  it('does not expose invite codes through public party lookup', async () => {
    mockPrisma.party.findUnique.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      inviteCode: 'abcdefghijklmnop',
      inviteCodeExpiresAt: new Date(),
      members: [],
      game: {},
      invites: [],
    });

    const party = await service.findById('00000000-0000-4000-8000-000000000001');
    expect(party).not.toHaveProperty('inviteCode');
    expect(party).not.toHaveProperty('inviteCodeExpiresAt');
  });

  it('lets a user join a closed lobby using its active group code', async () => {
    const partyId = '00000000-0000-4000-8000-000000000001';
    const code = 'abcdefghijklmnop';
    const party = {
      id: partyId,
      status: 'lobby',
      isOpen: false,
      mode: 'competitive',
      inviteCode: code,
      inviteCodeExpiresAt: new Date(Date.now() + 60_000),
      members: [],
    };
    mockPrisma.party.findFirst.mockResolvedValue({ id: partyId });
    mockPrisma.party.findUnique.mockResolvedValue(party);
    mockPrisma.partyMember.findFirst.mockResolvedValue(null);
    mockPrisma.partyMember.create.mockResolvedValue({ partyId, userId: 'user-id' });

    await expect(service.joinByCode('user-id', code)).resolves.toEqual({
      joined: true,
      partyId,
      mode: 'competitive',
    });
    expect(mockPrisma.partyMember.create).toHaveBeenCalledWith({
      data: { partyId, userId: 'user-id', ready: false },
    });
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('rejects expired or rotated lobby codes', async () => {
    const partyId = '00000000-0000-4000-8000-000000000001';
    mockPrisma.party.findFirst.mockResolvedValue({ id: partyId });
    mockPrisma.party.findUnique.mockResolvedValue({
      id: partyId,
      status: 'lobby',
      inviteCode: 'a-different-code',
      inviteCodeExpiresAt: new Date(Date.now() + 60_000),
      members: [],
    });

    await expect(service.joinByCode('user-id', 'abcdefghijklmnop'))
      .rejects.toMatchObject({ status: 404 });
    expect(mockPrisma.partyMember.create).not.toHaveBeenCalled();
  });

  it('rate limits lobby code attempts per user', async () => {
    mockRedis.eval.mockResolvedValue(11);

    await expect(service.joinByCode('user-id', 'not-a-code'))
      .rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expect.stringMatching(/^parties:join-by-code:user-id:/),
      60,
    );
    expect(mockPrisma.party.findUnique).not.toHaveBeenCalled();
  });

  it('updates only the requesting member role preferences while in the lobby', async () => {
    const member = {
      id: 'member-id',
      partyId: 'party-id',
      userId: 'user-id',
      role: 'top',
    };
    mockPrisma.party.findUnique.mockResolvedValue({ id: 'party-id', status: 'lobby' });
    mockPrisma.partyMember.findFirst.mockResolvedValueOnce(member).mockResolvedValueOnce(null);
    mockPrisma.game.findUnique.mockResolvedValue({ roles: ['top', 'jungle', 'mid', 'adc', 'support'] });
    mockPrisma.partyMember.update.mockResolvedValue({ ...member, role: 'support' });

    await expect(service.updateMemberRoles('party-id', 'user-id', { gameId: 'game-id', role: 'support' }))
      .resolves.toMatchObject({ role: 'support' });
    expect(mockPrisma.partyMember.update).toHaveBeenCalledWith({
      where: { id: 'member-id' },
      data: { role: 'support' },
    });
  });

  it('rejects duplicate roles in the same lobby', async () => {
    mockPrisma.party.findUnique.mockResolvedValue({ id: 'party-id', status: 'lobby' });
    mockPrisma.partyMember.findFirst.mockResolvedValueOnce({
      id: 'member-id',
      role: null,
    }).mockResolvedValueOnce({ id: 'other-member', userId: 'other-user' });
    mockPrisma.game.findUnique.mockResolvedValue({ roles: ['top', 'jungle', 'mid', 'adc', 'support'] });

    await expect(service.updateMemberRoles('party-id', 'user-id', { gameId: 'game-id', role: 'top' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.partyMember.update).not.toHaveBeenCalled();
  });
});
