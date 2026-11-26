import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Inject } from '@nestjs/common';

export interface GifResult {
  id: string;
  title: string;
  previewUrl: string;
  gifUrl: string;
  mp4Url?: string;
  source: 'giphy' | 'klipy';
}

interface GiphyResponse {
  data: Array<{
    id: string;
    title: string;
    images: {
      fixed_width_small?: { url: string; width: string; height: string };
      fixed_height?: { url: string; width: string; height: string };
      fixed_height_mp4?: { url: string; width: string; height: string };
    };
  }>;
}

interface KlipyResponse {
  data: {
    data: Array<{
      id: string;
      title: string;
      file: {
        sm?: { gif: { url: string }; mp4?: { url: string } };
        md?: { gif: { url: string }; mp4?: { url: string } };
        hd?: { gif: { url: string }; mp4?: { url: string } };
      };
    }>;
  };
}

@Injectable()
export class GifsService {
  private readonly giphyKey: string;
  private readonly klipyKey: string;

  constructor(
    config: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {
    this.giphyKey = config.get<string>('giphy.apiKey') ?? '';
    this.klipyKey = config.get<string>('klipy.appKey') ?? '';
  }

  private hasProvider(): boolean {
    return !!this.giphyKey || !!this.klipyKey;
  }

  async trending(limit = 24, page = 1): Promise<GifResult[]> {
    if (!this.hasProvider()) {
      throw new HttpException(
        { code: 'gif_not_configured' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const cacheKey = `gifs:trending:${limit}:${page}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let results: GifResult[] = [];

    if (this.giphyKey) {
      results = await this.fetchGiphyTrending(limit, page);
    } else if (this.klipyKey) {
      results = await this.fetchKlipyTrending(limit, page);
    }

    await this.redis.setex(cacheKey, 600, JSON.stringify(results));
    return results;
  }

  async search(q: string, limit = 24, page = 1): Promise<GifResult[]> {
    if (!this.hasProvider()) {
      throw new HttpException(
        { code: 'gif_not_configured' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const cacheKey = `gifs:search:${q}:${limit}:${page}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let results: GifResult[] = [];

    if (this.giphyKey) {
      results = await this.fetchGiphySearch(q, limit, page);
    } else if (this.klipyKey) {
      results = await this.fetchKlipySearch(q, limit, page);
    }

    await this.redis.setex(cacheKey, 300, JSON.stringify(results));
    return results;
  }

  private async fetchGiphyTrending(
    limit: number,
    page: number,
  ): Promise<GifResult[]> {
    const offset = (page - 1) * limit;
    const url = new URL('https://api.giphy.com/v1/gifs/trending');
    url.searchParams.set('api_key', this.giphyKey);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('rating', 'g');
    url.searchParams.set('lang', 'pt');

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new HttpException(
        { code: 'gif_provider_error', detail: 'GIPHY trending failed' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data = (await res.json()) as GiphyResponse;
    return data.data
      .map((g) => ({
        id: g.id,
        title: g.title || 'GIF',
        previewUrl:
          g.images.fixed_width_small?.url || g.images.fixed_height?.url || '',
        gifUrl: g.images.fixed_height?.url || g.images.fixed_width_small?.url || '',
        mp4Url: g.images.fixed_height_mp4?.url,
        source: 'giphy' as const,
      }))
      .filter((g) => g.previewUrl && g.gifUrl);
  }

  private async fetchGiphySearch(
    q: string,
    limit: number,
    page: number,
  ): Promise<GifResult[]> {
    const offset = (page - 1) * limit;
    const url = new URL('https://api.giphy.com/v1/gifs/search');
    url.searchParams.set('api_key', this.giphyKey);
    url.searchParams.set('q', q);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('rating', 'g');
    url.searchParams.set('lang', 'pt');

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new HttpException(
        { code: 'gif_provider_error', detail: 'GIPHY search failed' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data = (await res.json()) as GiphyResponse;
    return data.data
      .map((g) => ({
        id: g.id,
        title: g.title || 'GIF',
        previewUrl:
          g.images.fixed_width_small?.url || g.images.fixed_height?.url || '',
        gifUrl: g.images.fixed_height?.url || g.images.fixed_width_small?.url || '',
        mp4Url: g.images.fixed_height_mp4?.url,
        source: 'giphy' as const,
      }))
      .filter((g) => g.previewUrl && g.gifUrl);
  }

  private async fetchKlipyTrending(
    limit: number,
    page: number,
  ): Promise<GifResult[]> {
    const url = `https://api.klipy.com/api/v1/${this.klipyKey}/gifs/trending`;
    const params = new URLSearchParams();
    params.set('per_page', String(limit));
    params.set('page', String(page));
    params.set('content_filter', 'medium');

    const res = await fetch(`${url}?${params}`);
    if (!res.ok) {
      throw new HttpException(
        { code: 'gif_provider_error', detail: 'KLIPY trending failed' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data = (await res.json()) as KlipyResponse;
    return data.data.data
      .map((g) => ({
        id: g.id,
        title: g.title || 'GIF',
        previewUrl:
          g.file.sm?.gif.url || g.file.md?.gif.url || g.file.hd?.gif.url || '',
        gifUrl:
          g.file.hd?.gif.url || g.file.md?.gif.url || g.file.sm?.gif.url || '',
        mp4Url: g.file.hd?.mp4?.url || g.file.md?.mp4?.url || g.file.sm?.mp4?.url,
        source: 'klipy' as const,
      }))
      .filter((g) => g.previewUrl && g.gifUrl);
  }

  private async fetchKlipySearch(
    q: string,
    limit: number,
    page: number,
  ): Promise<GifResult[]> {
    const url = `https://api.klipy.com/api/v1/${this.klipyKey}/gifs/search`;
    const params = new URLSearchParams();
    params.set('q', q);
    params.set('per_page', String(limit));
    params.set('page', String(page));
    params.set('content_filter', 'medium');

    const res = await fetch(`${url}?${params}`);
    if (!res.ok) {
      throw new HttpException(
        { code: 'gif_provider_error', detail: 'KLIPY search failed' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data = (await res.json()) as KlipyResponse;
    return data.data.data
      .map((g) => ({
        id: g.id,
        title: g.title || 'GIF',
        previewUrl:
          g.file.sm?.gif.url || g.file.md?.gif.url || g.file.hd?.gif.url || '',
        gifUrl:
          g.file.hd?.gif.url || g.file.md?.gif.url || g.file.sm?.gif.url || '',
        mp4Url: g.file.hd?.mp4?.url || g.file.md?.mp4?.url || g.file.sm?.mp4?.url,
        source: 'klipy' as const,
      }))
      .filter((g) => g.previewUrl && g.gifUrl);
  }
}