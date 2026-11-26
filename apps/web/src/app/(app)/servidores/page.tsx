'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, ChevronRight, Users, Shield, Search } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { communitiesApi, type Community } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { AddServerModal } from '@/components/layout/add-server-modal';

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export default function ServidoresPage() {
  const { t } = useI18n();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCommunities = useCallback(async () => {
    try {
      setError(null);
      const data = await communitiesApi.list();
      setCommunities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    communitiesApi.list().then(data => {
      if (mounted) setCommunities(data);
    }).catch(err => {
      if (mounted) setError(err instanceof Error ? err.message : 'Failed to load communities');
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const filteredCommunities = communities.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 lg:px-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">{t('communities.title')}</h1>
          <p className="mt-1 text-fg-muted">{t('communities.subtitle')}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} />
          {t('nav.addServer')}
        </Button>
      </header>

      {/* Search */}
      <div className="mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('communities.searchPlaceholder')}
            className="w-full rounded-md border border-border bg-[#101216] py-1.5 pl-8 pr-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Communities list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-md bg-raised/50 p-3 animate-pulse">
              <div className="h-9 w-9 rounded-full bg-raised" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 rounded bg-raised" />
                <div className="h-2 w-16 rounded bg-raised" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCommunities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-10 text-center">
          <Users size={32} className="mx-auto mb-3 text-fg-subtle" />
          <p className="text-sm text-fg-muted">{t('communities.servers.empty')}</p>
          <p className="text-xs text-fg-subtle">{t('communities.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCommunities.map((c) => {
            const textChannels = c.channels?.filter((ch) => ch.type === 'TEXT') ?? [];
            const voiceChannels = c.channels?.filter((ch) => ch.type === 'VOICE') ?? [];
            return (
              <Link
                key={c.id}
                href={`/servidores/${c.id}`}
                className="group block rounded-md transition-colors hover:bg-raised/50"
              >
                <div className="flex items-center gap-3 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-brand">
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                      {c.isPrivate && <Shield size={12} className="text-fg-subtle" />}
                    </div>
                    <p className="truncate text-xs text-fg-subtle">
                      {textChannels.length} texto · {voiceChannels.length} voz
                    </p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Add Server Modal */}
      <AddServerModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          void loadCommunities();
        }}
      />
    </div>
  );
}