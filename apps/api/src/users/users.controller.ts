import { Controller, Get, Param, Query, Put, Delete, Body, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('search')
  async search(@Query('q') q: string) {
    if (!q || q.length < 2) return [];
    return this.usersService.search(q);
  }

  @Get(':username')
  async getProfile(@Param('username') username: string) {
    return this.usersService.getPublicProfile(username);
  }

  @Get(':id/e2ee-key')
  async getE2eeKey(@Param('id', ParseUUIDPipe) id: string) {
    const key = await this.usersService.getE2eePublicKey(id);
    return { publicKey: key };
  }

  @Put('me/e2ee-key')
  async setMyE2eeKey(@CurrentUser() user: { id: string }, @Body() body: { publicKey: string }) {
    if (!body || typeof body.publicKey !== 'string' || Object.keys(body).some((key) => key !== 'publicKey')) {
      throw new BadRequestException('Invalid public key body');
    }
    await this.usersService.setE2eePublicKey(user.id, body.publicKey);
    return { success: true };
  }

  @Delete('me/e2ee-key')
  async resetMyE2eeKey(@CurrentUser() user: { id: string }) {
    await this.usersService.resetE2eePublicKey(user.id);
    return { success: true };
  }
}