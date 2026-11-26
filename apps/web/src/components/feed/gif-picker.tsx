'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { gifApi, type GifResult } from '@/lib/gifs';
import { useI18n } from '@/i18n/provider';

interface GifPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gif: GifResult) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function GifPicker({ open, onClose, onSelect }: GifPickerProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const debouncedQuery = useDebounce(query, 500);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Foca o input de busca ao abrir
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    let cancelled = false;

    async function fetchGifs() {
      if (!open) return;

      setLoading(true);
      setError(false);

      try {
        let response;
        if (debouncedQuery.trim()) {
          response = await gifApi.search(debouncedQuery.trim());
        } else {
          response = await gifApi.trending();
        }

        if (!cancelled) {
          setGifs(response.gifs);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch GIFs:', err);
          setError(true);
          setGifs([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchGifs();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  const handleSelect = useCallback(
    (gif: GifResult) => {
      onSelect(gif);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('gif.title')}
      widthClass="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Busca */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('gif.search')}
            className="w-full rounded-md border border-border bg-raised pl-10 pr-4 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Grid de GIFs */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8 text-fg-muted">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="rounded-md bg-danger/10 p-3 text-center text-sm text-danger">
              {t('gif.error')}
            </div>
          )}

          {!loading && !error && gifs.length === 0 && (
            <div className="py-8 text-center text-sm text-fg-muted">
              {t('gif.empty')}
            </div>
          )}

          {!loading && !error && gifs.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleSelect(gif)}
                  className="group relative overflow-hidden rounded-md bg-raised transition-all hover:scale-105 hover:ring-2 hover:ring-inset hover:ring-brand"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gif.previewUrl}
                    alt={gif.title}
                    className="h-24 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé com atribuição */}
        <div className="border-t border-border pt-3 text-center text-xs text-fg-subtle">
          {t('gif.poweredBy')}
        </div>
      </div>
    </Modal>
  );
}