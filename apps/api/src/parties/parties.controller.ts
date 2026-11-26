import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PartiesService } from './parties.service';
import { ParseUUIDPipe } from '@nestjs/common';

@Controller('parties')
@UseGuards(AuthGuard)
export class PartiesController {
  constructor(private parties: PartiesService) {}

  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() body: { gameId: string; mode?: string }) {
    return this.parties.create(user.id, body.gameId, body.mode);
  }

  @Get()
  async listAvailable(@Query('gameId') gameId?: string) {
    return this.parties.listAvailable(gameId);
  }

  @Get('mine')
  async findMine(@CurrentUser() user: { id: string }) {
    return this.parties.findMine(user.id);
  }

  @Post('join-by-code')
  async joinByCode(@CurrentUser() user: { id: string }, @Body() body: { code: string }) {
    return this.parties.joinByCode(user.id, body.code);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.parties.findById(id);
  }

  @Post(':id/invite')
  async invite(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() body: { userId: string }) {
    return this.parties.invite(id, user.id, body.userId);
  }

  @Post('invites/:id/accept')
  async acceptInvite(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.parties.acceptInvite(id, user.id);
  }

  @Post('invites/:id/decline')
  async declineInvite(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.parties.declineInvite(id, user.id);
  }

  @Delete(':id/leave')
  async leave(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.parties.leave(id, user.id);
  }

  @Put(':id/ready')
  async setReady(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() body: { ready: boolean }) {
    return this.parties.setReady(id, user.id, body.ready);
  }

  @Put(':id/open')
  async toggleOpen(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.parties.toggleOpen(id, user.id);
  }

  @Delete(':id/members/:userId')
  async removeMember(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.parties.removeMember(id, user.id, userId);
  }
}