import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MatchmakingService } from './matchmaking.service';
import { ParseUUIDPipe } from '@nestjs/common';
import { JoinQueueDto } from './dto/join-queue.dto';

@Controller('matchmaking')
@UseGuards(AuthGuard)
export class MatchmakingController {
  constructor(private mm: MatchmakingService) {}

  @Post('queue')
  async joinQueue(@CurrentUser() user: { id: string }, @Body() body: JoinQueueDto) {
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
  async getMatch(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.mm.getMatch(id, user.id);
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