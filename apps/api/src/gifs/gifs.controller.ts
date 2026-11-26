import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { GifsService } from './gifs.service';
import type { GifResult } from './gifs.service';

@Controller('gifs')
export class GifsController {
  constructor(private readonly gifsService: GifsService) {}

  @Get('trending')
  async trending(
    @Query('limit', new DefaultValuePipe(24), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ): Promise<{ gifs: GifResult[] }> {
    const gifs = await this.gifsService.trending(limit, page);
    return { gifs };
  }

  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('limit', new DefaultValuePipe(24), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ): Promise<{ gifs: GifResult[] }> {
    if (!q || q.trim().length === 0) {
      return { gifs: [] };
    }
    const gifs = await this.gifsService.search(q.trim(), limit, page);
    return { gifs };
  }
}