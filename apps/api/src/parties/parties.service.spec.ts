import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
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
  },
  party: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  partyInvite: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
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

  it('lets a user join a closed lobby using its group code', async () => {
    const partyId = '00000000-0000-4000-8000-000000000001';
    const party = { id: partyId, status: 'lobby', isOpen: false, mode: 'competitive', members: [] };
    mockPrisma.party.findUnique.mockResolvedValue(party);
    mockPrisma.partyMember.findFirst.mockResolvedValue(null);
    mockPrisma.partyMember.create.mockResolvedValue({ partyId, userId: 'user-id' });

    await expect(service.joinByCode('user-id', partyId)).resolves.toEqual({
      joined: true,
      partyId,
      mode: 'competitive',
    });
    expect(mockPrisma.partyMember.create).toHaveBeenCalledWith({
      data: { partyId, userId: 'user-id', ready: false },
    });
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
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
});
