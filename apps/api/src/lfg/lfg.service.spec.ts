import { BadRequestException } from '@nestjs/common';
import { LfgService } from './lfg.service';

const userId = '00000000-0000-4000-8000-000000000001';
const listingId = '00000000-0000-4000-8000-000000000002';
const partyId = '00000000-0000-4000-8000-000000000003';
const gameId = '00000000-0000-4000-8000-000000000004';
const applicantId = '00000000-0000-4000-8000-000000000005';

const tx = {
  $queryRaw: jest.fn(),
  game: { findUnique: jest.fn() },
  party: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  partyMember: { create: jest.fn(), findFirst: jest.fn() },
  playerRating: { findMany: jest.fn() },
  lfgListing: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  lfgApplication: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
};

const prisma = {
  $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
  lfgListing: { findMany: jest.fn(), findUnique: jest.fn() },
  playerRating: { findMany: jest.fn() },
};

const realtime = {
  emitUserUpdate: jest.fn(),
  emitPartyUpdate: jest.fn(),
  emitLobbyUpdate: jest.fn(),
};

describe('LfgService', () => {
  let service: LfgService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LfgService(prisma as never, realtime as never);
    tx.$queryRaw.mockResolvedValue([]);
    tx.game.findUnique.mockResolvedValue({ roles: [] });
    tx.partyMember.findFirst.mockResolvedValue(null);
    tx.playerRating.findMany.mockResolvedValue([]);
    tx.lfgApplication.findUnique.mockResolvedValue(null);
    prisma.playerRating.findMany.mockResolvedValue([]);
    prisma.lfgListing.findMany.mockResolvedValue([]);
  });

  it('rejects invalid MMR ranges before creating a social listing', async () => {
    await expect(service.create(userId, {
      gameId,
      mode: 'casual',
      region: 'BR',
      targetSize: 2,
      minimumRating: 1500,
      maximumRating: 1000,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('shows only listings within the current player rating range', async () => {
    prisma.lfgListing.findMany.mockResolvedValue([
      { id: 'compatible', minimumRating: 900, maximumRating: 1100 },
      { id: 'incompatible', minimumRating: 1200, maximumRating: 1500 },
    ]);
    prisma.playerRating.findMany.mockResolvedValue([
      { rating: 1000, season: { active: true } },
    ]);

    await expect(service.list(userId, { gameId, mode: 'casual', region: 'BR' }))
      .resolves.toEqual([{ id: 'compatible', minimumRating: 900, maximumRating: 1100 }]);
  });

  it('accepts a social application by adding the player to the party, not the queue', async () => {
    tx.lfgListing.findUnique.mockResolvedValue({
      id: listingId,
      creatorId: userId,
      partyId,
      targetSize: 2,
      status: 'active',
      expiresAt: new Date(Date.now() + 60_000),
      desiredRole: null,
      game: { roles: [] },
    });
    tx.lfgApplication.findUnique.mockResolvedValue({
      id: 'application-id',
      listingId,
      applicantId,
      role: null,
      status: 'pending',
    });
    tx.party.findUnique.mockResolvedValue({
      id: partyId,
      status: 'lobby',
      members: [{ userId }],
    });
    tx.lfgApplication.update.mockResolvedValue({ id: 'application-id', status: 'accepted' });

    await expect(service.acceptApplication(listingId, 'application-id', userId))
      .resolves.toEqual({ accepted: true, partyId });
    expect(tx.partyMember.create).toHaveBeenCalledWith({
      data: { partyId, userId: applicantId, role: null, ready: false },
    });
    expect(tx.lfgListing.update).toHaveBeenCalledWith({
      where: { id: listingId },
      data: { status: 'filled' },
    });
  });
});
