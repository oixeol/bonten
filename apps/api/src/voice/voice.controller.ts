import { Controller, Get, Header, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { VoiceService } from './voice.service';

@Controller('voice')
@UseGuards(AuthGuard)
export class VoiceController {
  constructor(private voiceService: VoiceService) {}

  @Get('token/:communityId/:channelId')
  @Header('Cache-Control', 'no-store')
  async getToken(
    @CurrentUser() user: { id: string; username: string },
    @Param('communityId') communityId: string,
    @Param('channelId') channelId: string,
  ) {
    const token = await this.voiceService.createToken({
      userId: user.id,
      username: user.username,
      communityId,
      channelId,
    });
    return { token, wsUrl: this.voiceService.getWsUrl() };
  }

  @Get('config')
  async getConfig() {
    return { wsUrl: this.voiceService.getWsUrl() };
  }

  @Get('participants/:communityId/:channelId')
  @Header('Cache-Control', 'no-store')
  async getParticipants(
    @CurrentUser() user: { id: string; username: string },
    @Param('communityId') communityId: string,
    @Param('channelId') channelId: string,
  ) {
    const participants = await this.voiceService.getParticipants(user.id, communityId, channelId);
    return { participants };
  }
}
