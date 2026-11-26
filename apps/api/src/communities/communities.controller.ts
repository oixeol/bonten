import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CommunitiesService } from './communities.service';

@Controller('communities')
@UseGuards(AuthGuard)
export class CommunitiesController {
  constructor(private communitiesService: CommunitiesService) {}

  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() body: { name: string; description?: string; isPrivate?: boolean }) {
    return this.communitiesService.create(user.id, body);
  }

  @Get()
  async list(@CurrentUser() user: { id: string }) {
    return this.communitiesService.listUserCommunities(user.id);
  }

  @Get('invite/:code')
  async findByInvite(@Param('code') code: string) {
    return this.communitiesService.findByInviteCode(code);
  }

  @Post('join/:code')
  async join(@CurrentUser() user: { id: string }, @Param('code') code: string) {
    return this.communitiesService.joinByInvite(user.id, code);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.communitiesService.findById(id);
  }

  @Put(':id')
  async update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.communitiesService.update(user.id, id, body);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.communitiesService.delete(user.id, id);
  }

  @Post(':id/leave')
  async leave(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.communitiesService.leave(user.id, id);
  }
}