import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RankingService } from './ranking.service';

describe('RankingService team rank', () => {
  const teamId = 'team-id';
  const gameId = 'game-id';
  const seasonId = 'season-id';
  let prisma: {
    team: { findUnique: jest.Mock };
    teamRating: { findFirst: jest.Mock; count: jest.Mock };
  };
  let service: RankingService;

  beforeEach(() => {
    prisma = {
      team: { findUnique: jest.fn().mockResolvedValue({ region: 'BR' }) },
      teamRating: {
        findFirst: jest.fn().mockResolvedValue({ rating: 1200, seasonId, updatedAt: new Date() }),
        count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(10),
      },
    };
    service = new RankingService(prisma as unknown as PrismaService);
  });

  it('limits regional rank calculations to the team region', async () => {
    await expect(service.getTeamRank(teamId, gameId, 'regional')).resolves.toEqual({
      rank: 3,
      total: 10,
      region: 'BR',
      rating: 1200,
    });

    expect(prisma.teamRating.count).toHaveBeenNthCalledWith(1, {
      where: { gameId, seasonId, team: { region: 'BR' }, rating: { gt: 1200 } },
    });
    expect(prisma.teamRating.count).toHaveBeenNthCalledWith(2, {
      where: { gameId, seasonId, team: { region: 'BR' } },
    });
  });

  it('calculates the global rank without a region filter', async () => {
    await expect(service.getTeamRank(teamId, gameId, 'global')).resolves.toEqual({
      rank: 3,
      total: 10,
      region: null,
      rating: 1200,
    });

    expect(prisma.teamRating.count).toHaveBeenNthCalledWith(1, {
      where: { gameId, seasonId, rating: { gt: 1200 } },
    });
    expect(prisma.teamRating.count).toHaveBeenNthCalledWith(2, {
      where: { gameId, seasonId },
    });
  });

  it('rejects unsupported ranking scopes', async () => {
    await expect(service.getTeamRank(teamId, gameId, 'friends')).rejects.toBeInstanceOf(BadRequestException);
  });
});
