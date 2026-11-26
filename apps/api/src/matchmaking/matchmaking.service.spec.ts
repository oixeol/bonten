import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';

const partyId = '00000000-0000-4000-8000-000000000001';
const gameId = '00000000-0000-4000-8000-000000000002';
const userId = '00000000-0000-4000-8000-000000000003';

const tx = {
  $queryRaw: jest.fn(),
  game: { findUnique: jest.fn() },
  partyMember: { findFirst: jest.fn(), count: jest.fn() },
  party: { updateMany: jest.fn() },
  matchmakingQueue: { findFirst: jest.fn(), create: jest.fn() },
  match: { findFirst: jest.fn(), updateMany: jest.fn() },
};

const prisma = {
  $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
  match: { findFirst: jest.fn() },
};

describe('MatchmakingService queue admission', () => {
  let service: MatchmakingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MatchmakingService(prisma as never);
    tx.$queryRaw.mockResolvedValue([]);
    tx.game.findUnique.mockResolvedValue({ partySizesAllowed: [1, 2, 3, 5] });
    tx.partyMember.findFirst.mockResolvedValue(null);
    tx.partyMember.count.mockResolvedValue(1);
    tx.matchmakingQueue.findFirst.mockResolvedValue(null);
    tx.party.updateMany.mockResolvedValue({ count: 1 });
    tx.matchmakingQueue.create.mockResolvedValue({ id: 'queue-entry', status: 'waiting' });
    tx.match.findFirst.mockResolvedValue(null);
    tx.match.updateMany.mockResolvedValue({ count: 1 });
    prisma.match.findFirst.mockResolvedValue(null);
  });

  it.each([1, 2, 3, 5])('accepts a configured party size of %i', async (size) => {
    if (size > 1) {
      tx.partyMember.findFirst.mockResolvedValue({ partyId, party: { status: 'lobby' } });
      tx.partyMember.count.mockResolvedValue(size);
    }

    await expect(service.joinQueue(userId, gameId, 'competitive', 'BR'))
      .resolves.toMatchObject({ id: 'queue-entry', status: 'waiting' });
    expect(tx.matchmakingQueue.create).toHaveBeenCalledWith({
      data: {
        gameId,
        mode: 'competitive',
        region: 'BR',
        userId: size === 1 ? userId : null,
        partyId: size === 1 ? null : partyId,
        status: 'waiting',
      },
    });
  });

  it('rejects a four-player party before creating a queue entry', async () => {
    tx.game.findUnique.mockResolvedValue({ partySizesAllowed: [1, 2, 3, 4, 5] });
    tx.partyMember.findFirst.mockResolvedValue({ partyId, party: { status: 'lobby' } });
    tx.partyMember.count.mockResolvedValue(4);

    await expect(service.joinQueue(userId, gameId, 'competitive', 'BR'))
      .rejects.toThrow(new BadRequestException(
        'Lobbies com 4 jogadores não podem entrar na fila. Remova um jogador ou convide mais um.',
      ));
    expect(tx.matchmakingQueue.create).not.toHaveBeenCalled();
  });

  it('uses the game-specific allowed party sizes', async () => {
    tx.game.findUnique.mockResolvedValue({ partySizesAllowed: [1, 2] });
    tx.partyMember.findFirst.mockResolvedValue({ partyId, party: { status: 'lobby' } });
    tx.partyMember.count.mockResolvedValue(3);

    await expect(service.joinQueue(userId, gameId, 'ranked', 'BR'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(tx.matchmakingQueue.create).not.toHaveBeenCalled();
  });

  it('serializes queue admission and rejects a party already queued', async () => {
    tx.partyMember.findFirst.mockResolvedValue({ partyId, party: { status: 'in_queue' } });

    await expect(service.joinQueue(userId, gameId, 'competitive', 'BR'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.game.findUnique).not.toHaveBeenCalled();
  });

  it('only returns a match to one of its participants', async () => {
    await expect(service.getMatch(partyId, userId)).rejects.toBeInstanceOf(NotFoundException);

    const match = { id: partyId, players: [] };
    prisma.match.findFirst.mockResolvedValue(match);
    await expect(service.getMatch(partyId, userId)).resolves.toBe(match);
    expect(prisma.match.findFirst).toHaveBeenLastCalledWith({
      where: { id: partyId, players: { some: { userId } } },
      include: { players: { include: { user: true } }, result: true, game: true },
    });
  });

  it('allows only a participant to decline a pending match', async () => {
    tx.match.findFirst.mockResolvedValue({ id: partyId, status: 'pending' });

    await expect(service.declineMatch(partyId, userId)).resolves.toEqual({ declined: true });
    expect(tx.match.updateMany).toHaveBeenCalledWith({
      where: { id: partyId, status: 'pending' },
      data: { status: 'cancelled' },
    });

    tx.match.findFirst.mockResolvedValue(null);
    await expect(service.declineMatch(partyId, userId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not decline a match after confirmation has started', async () => {
    tx.match.findFirst.mockResolvedValue({ id: partyId, status: 'in_progress' });

    await expect(service.declineMatch(partyId, userId)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.match.updateMany).not.toHaveBeenCalled();
  });
});
