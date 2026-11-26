import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FriendsService } from './friends.service';

@Controller('friends')
@UseGuards(AuthGuard)
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Get()
  async getFriends(@CurrentUser() user: { id: string }) {
    return this.friendsService.getFriends(user.id);
  }

  @Get('pending')
  async getPendingRequests(@CurrentUser() user: { id: string }) {
    return this.friendsService.getPendingRequests(user.id);
  }

  @Get('blocked')
  async getBlockedUsers(@CurrentUser() user: { id: string }) {
    return this.friendsService.getBlockedUsers(user.id);
  }

  @Post('send')
  async sendRequest(
    @CurrentUser() user: { id: string },
    @Body() body: { username: string },
  ) {
    return this.friendsService.sendRequest(user.id, body.username);
  }

  @Post('accept/:id')
  async acceptRequest(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.friendsService.acceptRequest(user.id, id);
  }

  @Post('reject/:id')
  async rejectRequest(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.friendsService.rejectRequest(user.id, id);
  }

  @Post('block/:userId')
  async blockUser(
    @CurrentUser() user: { id: string },
    @Param('userId') targetUserId: string,
  ) {
    return this.friendsService.blockUser(user.id, targetUserId);
  }

  @Delete('unblock/:id')
  async unblock(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.friendsService.unblock(user.id, id);
  }

  @Delete(':id')
  async removeFriend(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.friendsService.removeFriend(user.id, id);
  }
}