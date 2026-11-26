import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RankingService } from './ranking.service';
import { ParseUUIDPipe } from '@nestjs/common';

@Controller('ranking')
@UseGuards(AuthGuard)
export class RankingController {
  constructor(private ranking: RankingService) {}

  @Get('leaderboard/:gameId')
  async leaderboard(@Param('gameId', ParseUUIDPipe) gameId: string, @Query('mode') mode?: string, @Query('seasonId') seasonId?: string, @Query('limit') limit?: string) {
    return this.ranking.getLeaderboard(gameId, mode || 'ranked', seasonId, limit ? parseInt(limit) : 50);
  }

  @Get('teams/:gameId')
  async teamLeaderboard(@Param('gameId', ParseUUIDPipe) gameId: string, @Query('seasonId') seasonId?: string, @Query('limit') limit?: string) {
    return this.ranking.getTeamLeaderboard(gameId, seasonId, limit ? parseInt(limit) : 50);
  }

  @Get('player/:userId/:gameId')
  async playerStats(@Param('userId', ParseUUIDPipe) userId: string, @Param('gameId', ParseUUIDPipe) gameId: string) {
    return this.ranking.getPlayerStats(userId, gameId);
  }

  @Get('player/:userId/:gameId/history')
  async playerHistory(@Param('userId', ParseUUIDPipe) userId: string, @Param('gameId', ParseUUIDPipe) gameId: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.ranking.getPlayerMatchHistory(userId, gameId, limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0);
  }
}