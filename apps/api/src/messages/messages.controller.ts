import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() body: { channelId: string; content: string; type?: MessageType; attachments?: unknown; replyToId?: string },
  ) {
    return this.messagesService.create(body.channelId, user.id, body);
  }

  @Get('channel/:channelId')
  async listByChannel(
    @Param('channelId') channelId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.messagesService.listByChannel(channelId, limit ? parseInt(limit, 10) : 50, cursor);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.messagesService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { content: string }) {
    return this.messagesService.update(id, body.content);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.messagesService.delete(id);
  }
}