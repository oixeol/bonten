import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private games: GamesService) {}

  @Get()
  async list() {
    return this.games.findAll();
  }

  @Get(':slug')
  async bySlug(@Param('slug') slug: string) {
    return this.games.findBySlug(slug);
  }

  @Post('seed')
  @UseGuards(AuthGuard)
  async seed() {
    return this.games.seed();
  }
}