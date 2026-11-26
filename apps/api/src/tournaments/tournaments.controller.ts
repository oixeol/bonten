import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
// CurrentUser available if needed
import { TournamentsService } from './tournaments.service';
import { ParseUUIDPipe } from '@nestjs/common';

@Controller('tournaments')
@UseGuards(AuthGuard)
export class TournamentsController {
  constructor(private tournaments: TournamentsService) {}

  @Post()
  async create(@Body() body: { name: string; gameId: string; format: string; startDate?: string; endDate?: string }) {
    return this.tournaments.create(body);
  }

  @Get()
  async list(@Query('gameId') gameId?: string, @Query('status') status?: string) {
    return this.tournaments.list(gameId, status);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.tournaments.findById(id);
  }

  @Post(':id/register')
  async register(@Param('id', ParseUUIDPipe) id: string, @Body() body: { teamId: string }) {
    return this.tournaments.registerTeam(id, body.teamId);
  }

  @Delete(':id/register/:teamId')
  async unregister(@Param('id', ParseUUIDPipe) id: string, @Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.tournaments.unregisterTeam(id, teamId);
  }

  @Put(':id/status')
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() body: { status: string }) {
    return this.tournaments.updateStatus(id, body.status);
  }

  @Post(':id/bracket')
  async generateBracket(@Param('id', ParseUUIDPipe) id: string) {
    return this.tournaments.generateBracket(id);
  }
}