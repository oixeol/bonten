import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TeamsService } from './teams.service';
import { ParseUUIDPipe } from '@nestjs/common';

@Controller('teams')
@UseGuards(AuthGuard)
export class TeamsController {
  constructor(private teams: TeamsService) {}

  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() body: any) {
    return this.teams.create(user.id, body);
  }

  @Get()
  async list(@Query('gameId') gameId?: string, @Query('region') region?: string, @Query('search') search?: string) {
    return this.teams.listOpen(gameId, region, search);
  }

  @Get('mine')
  async listMine(@CurrentUser() user: { id: string }) {
    return this.teams.listMine(user.id);
  }

  @Get('invite/:code')
  async byCode(@Param('code') code: string) {
    return this.teams.findByInviteCode(code);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.teams.findById(id);
  }

  @Put(':id')
  async update(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.teams.update(id, user.id, body);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() body: { confirmName: string }) {
    return this.teams.delete(id, user.id, body.confirmName);
  }

  @Post(':id/join')
  async joinByCode(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) _id: string, @Body() body: { code: string }) {
    return this.teams.joinByCode(body.code, user.id);
  }

  @Post(':id/apply')
  async apply(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() body: { message?: string }) {
    return this.teams.requestJoin(id, user.id, body.message);
  }

  @Get(':id/applications')
  async listApplications(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.teams.listApplications(id, user.id);
  }

  @Post(':id/applications/:userId/approve')
  async approveApp(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.teams.approveApplication(id, user.id, userId);
  }

  @Post(':id/applications/:userId/reject')
  async rejectApp(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.teams.rejectApplication(id, user.id, userId);
  }

  @Post(':id/invite')
  async invite(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() body: { userId: string }) {
    return this.teams.inviteUser(id, user.id, body.userId);
  }

  @Delete(':id/leave')
  async leave(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.teams.leave(id, user.id);
  }

  @Post(':id/transfer')
  async transfer(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() body: { newOwnerId: string }) {
    return this.teams.transferOwnership(id, user.id, body.newOwnerId);
  }

  @Put(':id/members/:userId/role')
  async updateRole(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) targetUserId: string, @Body() body: { role: string }) {
    return this.teams.updateMemberRole(id, user.id, targetUserId, body.role);
  }

  @Put(':id/rosters/:rosterId')
  async updateRoster(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Param('rosterId', ParseUUIDPipe) rosterId: string, @Body() body: { showOwner?: boolean }) {
    return this.teams.updateRoster(id, user.id, rosterId, body);
  }

  @Put(':id/rosters/:rosterId/members/:userId')
  async updateRosterMember(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Param('rosterId', ParseUUIDPipe) rosterId: string, @Param('userId', ParseUUIDPipe) targetUserId: string, @Body() body: { role: string | null }) {
    return this.teams.updateRosterMember(id, user.id, rosterId, targetUserId, body.role);
  }

  @Delete(':id/members/:userId')
  async removeMember(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) targetUserId: string) {
    return this.teams.removeMember(id, user.id, targetUserId);
  }

  @Put(':id/members/:userId/move')
  async moveMember(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) targetUserId: string, @Body() body: { toReserve: boolean }) {
    return this.teams.moveMember(id, user.id, targetUserId, body.toReserve);
  }

  @Post(':id/invite-code/regenerate')
  async regenCode(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.teams.regenerateInviteCode(id, user.id);
  }

  @Post(':id/invite-code/disable')
  async disableCode(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.teams.disableInviteCode(id, user.id);
  }

  @Get(':id/history')
  async history(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.teams.getHistory(id, user.id);
  }
}