import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Controller('channels')
@UseGuards(AuthGuard)
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() body: CreateChannelDto) {
    return this.channelsService.create(user.id, body.communityId, body);
  }

  @Get('community/:communityId')
  async listByCommunity(@CurrentUser() user: { id: string }, @Param('communityId', ParseUUIDPipe) communityId: string) {
    return this.channelsService.listByCommunity(user.id, communityId);
  }

  @Get(':id')
  async findById(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.channelsService.findById(user.id, id);
  }

  @Put(':id')
  async update(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateChannelDto) {
    return this.channelsService.update(user.id, id, body);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.channelsService.delete(user.id, id);
  }
}