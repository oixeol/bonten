import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { SendDmDto } from './send-dm.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DmsService } from './dms.service';

@Controller('dms')
@UseGuards(AuthGuard)
export class DmsController {
  constructor(private dmsService: DmsService) {}

  @Post('send')
  async send(
    @CurrentUser() user: { id: string },
    @Body() body: SendDmDto,
  ) {
    return this.dmsService.send(user.id, body.receiverId, body);
  }

  @Get('conversation/:userId')
  async listConversation(
    @CurrentUser() user: { id: string },
    @Param('userId', ParseUUIDPipe) otherUserId: string,
    @Query('limit') limit?: string,
  ) {
    const count = limit === undefined ? 50 : Number(limit);
    if (!Number.isInteger(count) || count < 1 || count > 100) throw new BadRequestException('Limit must be 1–100');
    return this.dmsService.listBetween(user.id, otherUserId, count);
  }

  @Get('conversations')
  async listConversations(@CurrentUser() user: { id: string }) {
    return this.dmsService.listConversations(user.id);
  }

  @Post('read/:senderId')
  async markAsRead(@CurrentUser() user: { id: string }, @Param('senderId', ParseUUIDPipe) senderId: string) {
    return this.dmsService.markAsRead(user.id, senderId);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: { id: string }) {
    return this.dmsService.getUnreadCount(user.id);
  }
}