import { apiFetch } from './api';

export interface GifResult {
  id: string;
  title: string;
  previewUrl: string;
  gifUrl: string;
  mp4Url?: string;
  source: 'giphy' | 'klipy';
}

interface GifsResponse {
  gifs: GifResult[];
}

export const gifApi = {
  trending: (limit = 24) =>
    apiFetch<GifsResponse>(`/gifs/trending?limit=${limit}`),
  search: (q: string, limit = 24) =>
    apiFetch<GifsResponse>(`/gifs/search?q=${encodeURIComponent(q)}&limit=${limit}`),
};