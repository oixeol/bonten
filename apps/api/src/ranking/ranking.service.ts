import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RankingService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard(gameId: string, mode: string, seasonId?: string, limit = 50) {
    return this.prisma.playerRating.findMany({
      where: {
        gameId,
        mode,
        ...(seasonId ? { seasonId } : {}),
      },
      include: { user: true },
      orderBy: { rating: 'desc' },
      take: limit,
    });
  }

  async getTeamLeaderboard(gameId: string, seasonId?: string, limit = 50) {
    return this.prisma.teamRating.findMany({
      where: {
        gameId,
        ...(seasonId ? { seasonId } : {}),
      },
      include: { team: true },
      orderBy: { rating: 'desc' },
      take: limit,
    });
  }

  async getTeamRank(teamId: string, gameId: string, scope: string) {
    if (scope !== 'global' && scope !== 'regional') {
      throw new BadRequestException('Invalid ranking scope');
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { region: true },
    });
    if (!team) throw new NotFoundException('Team not found');

    const rating = await this.prisma.teamRating.findFirst({
      where: { teamId, gameId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!rating) return null;

    const rankedTeams = {
      gameId,
      seasonId: rating.seasonId,
      ...(scope === 'regional' ? { team: { region: team.region } } : {}),
    };
    const [ahead, total] = await Promise.all([
      this.prisma.teamRating.count({
        where: { ...rankedTeams, rating: { gt: rating.rating } },
      }),
      this.prisma.teamRating.count({ where: rankedTeams }),
    ]);

    return {
      rank: ahead + 1,
      total,
      region: scope === 'regional' ? team.region : null,
      rating: rating.rating,
    };
  }

  async getPlayerStats(userId: string, gameId: string) {
    const rating = await this.prisma.playerRating.findFirst({
      where: { userId, gameId },
      include: { season: true },
    });

    const matches = await this.prisma.matchPlayer.findMany({
      where: { userId, match: { gameId } },
      include: { match: true },
      orderBy: { match: { createdAt: 'desc' } },
      take: 20,
    });

    // Aggregate champion/agent/weapon/composition stats
    const championStats: Record<string, { games: number; wins: number }> = {};
    for (const mp of matches) {
      const stats = mp.stats as any;
      const key = stats?.champion || stats?.agent || stats?.weapon || stats?.composition || 'unknown';
      if (!championStats[key]) championStats[key] = { games: 0, wins: 0 };
      championStats[key].games++;
      // Determine win: check match result
    }

    return {
      rating,
      recentMatches: matches,
      championStats,
      totalMatches: matches.length,
    };
  }

  async getPlayerMatchHistory(userId: string, gameId: string, limit = 20, offset = 0) {
    return this.prisma.matchPlayer.findMany({
      where: { userId, match: { gameId } },
      include: { match: true, user: true },
      orderBy: { match: { createdAt: 'desc' } },
      take: limit,
      skip: offset,
    });
  }

  async updateRatingAfterMatch(matchId: string) {
    // Placeholder: Elo update logic
    // In production: calculate rating changes based on match result
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { players: true, result: true },
    });
    if (!match || !match.result) return;

    // Simple Elo: winner +25, loser -25
    // This is a placeholder; real implementation uses Glicko-2 or Elo with K-factor
    return { updated: true };
  }
}