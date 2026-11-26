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
  partyMember: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  party: { updateMany: jest.fn() },
  matchmakingQueue: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  matchmakingQueueMember: { createMany: jest.fn() },
  match: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
  matchPlayer: { findFirst: jest.fn(), count: jest.fn(), createMany: jest.fn(), updateMany: jest.fn() },
  matchResult: { create: jest.fn() },
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
    tx.game.findUnique.mockResolvedValue({
      partySizesAllowed: [1, 2, 3, 5],
      slug: 'lol',
      playersPerMatch: 10,
      teamSize: 5,
      hasTeams: true,
      roles: [],
    });
    tx.partyMember.findFirst.mockResolvedValue(null);
    tx.partyMember.findMany.mockResolvedValue([]);
    tx.partyMember.count.mockResolvedValue(1);
    tx.matchmakingQueue.findFirst.mockResolvedValue(null);
    tx.matchmakingQueue.findMany.mockResolvedValue([]);
    tx.party.updateMany.mockResolvedValue({ count: 1 });
    tx.matchmakingQueue.create.mockResolvedValue({ id: 'queue-entry', status: 'waiting' });
    tx.matchmakingQueue.findUnique.mockResolvedValue({ id: 'queue-entry', status: 'matched', matchId: 'match-id' });
    tx.matchmakingQueue.updateMany.mockResolvedValue({ count: 0 });
    tx.matchmakingQueueMember.createMany.mockResolvedValue({ count: 1 });
    tx.match.findFirst.mockResolvedValue(null);
    tx.match.findUnique.mockResolvedValue({ id: 'match-id', status: 'pending' });
    tx.match.create.mockResolvedValue({ id: 'match-id' });
    tx.match.updateMany.mockResolvedValue({ count: 1 });
    tx.match.update.mockResolvedValue({ id: 'match-id', status: 'in_progress' });
    tx.matchPlayer.findFirst.mockResolvedValue({ id: 'match-player', acceptedAt: null });
    tx.matchPlayer.count.mockResolvedValue(0);
    tx.matchPlayer.createMany.mockResolvedValue({ count: 0 });
    tx.matchPlayer.updateMany.mockResolvedValue({ count: 1 });
    tx.matchResult.create.mockResolvedValue({ matchId: 'match-id' });
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
    tx.game.findUnique.mockResolvedValue({
      partySizesAllowed: [1, 2, 3, 4, 5],
      slug: 'lol',
      playersPerMatch: 10,
      teamSize: 5,
      hasTeams: true,
      roles: [],
    });
    tx.partyMember.findFirst.mockResolvedValue({ partyId, party: { status: 'lobby' } });
    tx.partyMember.count.mockResolvedValue(4);

    await expect(service.joinQueue(userId, gameId, 'competitive', 'BR'))
      .rejects.toThrow(new BadRequestException(
        'Lobbies com 4 jogadores não podem entrar na fila. Remova um jogador ou convide mais um.',
      ));
    expect(tx.matchmakingQueue.create).not.toHaveBeenCalled();
  });

  it('uses the game-specific allowed party sizes', async () => {
    tx.game.findUnique.mockResolvedValue({
      partySizesAllowed: [1, 2],
      slug: 'tft',
      playersPerMatch: 8,
      teamSize: 1,
      hasTeams: false,
      roles: [],
    });
    tx.partyMember.findFirst.mockResolvedValue({ partyId, party: { status: 'lobby' } });
    tx.partyMember.count.mockResolvedValue(3);

    await expect(service.joinQueue(userId, gameId, 'ranked', 'BR'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(tx.matchmakingQueue.create).not.toHaveBeenCalled();
  });

  it('requires and snapshots one configured role for solo queue entries', async () => {
    tx.game.findUnique.mockResolvedValue({
      partySizesAllowed: [1, 2, 3, 5],
      slug: 'lol',
      playersPerMatch: 10,
      teamSize: 5,
      hasTeams: true,
      roles: ['top', 'jungle', 'mid', 'adc', 'support'],
    });
    await service.joinQueue(userId, gameId, 'ranked', 'BR', 'mid');

    expect(tx.matchmakingQueueMember.createMany).toHaveBeenCalledWith({
      data: [{
        queueId: 'queue-entry',
        userId,
        role: 'mid',
      }],
    });
  });

  it('snapshots every party member preference without splitting the party', async () => {
    tx.partyMember.findFirst.mockResolvedValue({ partyId, party: { status: 'lobby' } });
    tx.partyMember.count.mockResolvedValue(2);
    tx.partyMember.findMany.mockResolvedValue([
      { userId, role: 'top' },
      { userId: '00000000-0000-4000-8000-000000000004', role: 'support' },
    ]);
    tx.game.findUnique.mockResolvedValue({
      partySizesAllowed: [1, 2, 3, 5],
      slug: 'lol',
      playersPerMatch: 10,
      teamSize: 5,
      hasTeams: true,
      roles: ['top', 'jungle', 'mid', 'adc', 'support'],
    });

    await service.joinQueue(userId, gameId, 'ranked', 'BR');

    expect(tx.matchmakingQueueMember.createMany).toHaveBeenCalledWith({
      data: [
        { queueId: 'queue-entry', userId, role: 'top' },
        { queueId: 'queue-entry', userId: '00000000-0000-4000-8000-000000000004', role: 'support' },
      ],
    });
  });

  it('creates a match from whole queue groups and assigns balanced team slots', async () => {
    const queuedGroups = [
      {
        id: 'queue-entry',
        members: [{ userId, role: null }],
      },
      {
        id: 'duo-one',
        members: ['a', 'b'].map((suffix) => ({
          userId: `duo-one-${suffix}`,
          role: null,
        })),
      },
      {
        id: 'duo-two',
        members: ['a', 'b'].map((suffix) => ({
          userId: `duo-two-${suffix}`,
          role: null,
        })),
      },
      {
        id: 'trio-one',
        members: ['a', 'b', 'c'].map((suffix) => ({
          userId: `trio-one-${suffix}`,
          role: null,
        })),
      },
      {
        id: 'duo-three',
        members: ['a', 'b'].map((suffix) => ({
          userId: `duo-three-${suffix}`,
          role: null,
        })),
      },
    ];
    tx.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(queuedGroups.map(({ id }) => ({ id })));
    tx.matchmakingQueue.findMany.mockResolvedValue(queuedGroups);
    tx.matchmakingQueue.updateMany.mockResolvedValue({ count: 5 });

    await expect(service.joinQueue(userId, gameId, 'competitive', 'BR'))
      .resolves.toMatchObject({ status: 'matched', matchId: 'match-id' });

    expect(tx.matchPlayer.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ userId, team: 'A' }),
        expect.objectContaining({ userId: 'duo-one-a', team: 'A' }),
        expect.objectContaining({ userId: 'trio-one-a', team: 'B' }),
      ]),
    });
    expect(tx.matchmakingQueue.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['queue-entry', 'duo-one', 'duo-two', 'trio-one', 'duo-three'] }, status: 'waiting' },
      data: { status: 'matched', matchId: 'match-id' },
    });
    expect(tx.matchResult.create).toHaveBeenCalledWith({ data: { matchId: 'match-id' } });
  });

  it('creates an eight-player FFA match without team or role assignments', async () => {
    const queuedGroups = Array.from({ length: 8 }, (_, index) => ({
      id: index === 0 ? 'queue-entry' : `queue-${index}`,
      members: [{
        userId: index === 0 ? userId : `user-${index}`,
        role: null,
      }],
    }));
    tx.game.findUnique.mockResolvedValue({
      partySizesAllowed: [1, 2],
      slug: 'tft',
      playersPerMatch: 8,
      teamSize: 1,
      hasTeams: false,
      roles: [],
    });
    tx.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(queuedGroups.map(({ id }) => ({ id })));
    tx.matchmakingQueue.findMany.mockResolvedValue(queuedGroups);
    tx.matchmakingQueue.updateMany.mockResolvedValue({ count: 8 });

    await expect(service.joinQueue(userId, gameId, 'ranked', 'BR'))
      .resolves.toMatchObject({ status: 'matched', matchId: 'match-id' });
    expect(tx.matchPlayer.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ userId, team: null, role: null }),
        expect.objectContaining({ userId: 'user-7', team: null, role: null }),
      ]),
    });
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

  it('returns queued parties to their lobbies after a match is declined', async () => {
    tx.match.findFirst.mockResolvedValue({ id: partyId, status: 'pending' });
    tx.matchmakingQueue.findMany.mockResolvedValue([{ id: 'queue-entry', partyId }]);

    await expect(service.declineMatch(partyId, userId)).resolves.toEqual({ declined: true });

    expect(tx.matchmakingQueue.updateMany).toHaveBeenCalledWith({
      where: { matchId: partyId, status: 'matched' },
      data: { status: 'cancelled', matchId: null },
    });
    expect(tx.party.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [partyId] }, status: 'in_queue' },
      data: { status: 'lobby' },
    });
  });

  it('does not decline a match after confirmation has started', async () => {
    tx.match.findFirst.mockResolvedValue({ id: partyId, status: 'in_progress' });

    await expect(service.declineMatch(partyId, userId)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.match.updateMany).not.toHaveBeenCalled();
  });

  it('starts a match only after every participant checks in', async () => {
    tx.matchPlayer.count.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    await expect(service.acceptMatch(partyId, userId))
      .resolves.toEqual({ accepted: true, matchStarted: false });
    expect(tx.match.update).not.toHaveBeenCalled();

    tx.matchPlayer.count.mockReset().mockResolvedValueOnce(2).mockResolvedValueOnce(2);
    await expect(service.acceptMatch(partyId, '00000000-0000-4000-8000-000000000004'))
      .resolves.toEqual({ accepted: true, matchStarted: true });
    expect(tx.match.update).toHaveBeenCalledWith({
      where: { id: partyId },
      data: { status: 'in_progress', startedAt: expect.any(Date) },
    });
  });
});
