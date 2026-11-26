import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { InvitesService } from './invites.service';

@Controller('invites')
@UseGuards(AuthGuard)
export class InvitesController {
  constructor(private invitesService: InvitesService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() body: { communityId: string; maxUses?: number; expiresAt?: string },
  ) {
    return this.invitesService.create(body.communityId, user.id, {
      maxUses: body.maxUses,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    return this.invitesService.findByCode(code);
  }

  @Post('use/:code')
  async useInvite(@CurrentUser() user: { id: string }, @Param('code') code: string) {
    return this.invitesService.useInvite(code, user.id);
  }

  @Get('community/:communityId')
  async listByCommunity(@Param('communityId') communityId: string) {
    return this.invitesService.listByCommunity(communityId);
  }

  @Delete(':id')
  async revoke(@Param('id') id: string) {
    return this.invitesService.revoke(id);
  }
}