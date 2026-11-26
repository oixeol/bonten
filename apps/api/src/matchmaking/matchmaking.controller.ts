import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MatchmakingService } from './matchmaking.service';
import { ParseUUIDPipe } from '@nestjs/common';

@Controller('matchmaking')
@UseGuards(AuthGuard)
export class MatchmakingController {
  constructor(private mm: MatchmakingService) {}

  @Post('queue')
  async joinQueue(@CurrentUser() user: { id: string }, @Body() body: { gameId: string; mode: string; region: string }) {
    return this.mm.joinQueue(user.id, body.gameId, body.mode, body.region);
  }

  @Delete('queue')
  async leaveQueue(@CurrentUser() user: { id: string }) {
    return this.mm.leaveQueue(user.id);
  }

  @Get('queue/status')
  async status(@CurrentUser() user: { id: string }) {
    return this.mm.getQueueStatus(user.id);
  }

  @Get('match/:id')
  async getMatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.mm.getMatch(id);
  }

  @Post('match/:id/accept')
  async accept(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.mm.acceptMatch(id, user.id);
  }

  @Post('match/:id/decline')
  async decline(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.mm.declineMatch(id, user.id);
  }
}