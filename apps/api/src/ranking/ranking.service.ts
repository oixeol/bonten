import { Injectable } from '@nestjs/common';
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