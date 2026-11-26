'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Check, X, Clock, ShieldOff, UserMinus, Shield, Search } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { useAuth } from '@/auth/provider';
import { friendsApi, type Friendship, type PendingRequest, type BlockedUser } from '@/lib/api';

type Tab = 'friends' | 'pending' | 'blocked';

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ONLINE: 'bg-success',
    IDLE: 'bg-warning',
    DND: 'bg-danger',
    OFFLINE: 'bg-fg-subtle',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || 'bg-fg-subtle'}`} />;
}

function loadFriendsData(_userId: string, signal: AbortSignal) {
  return Promise.all([
    friendsApi.list().then(r => { if (signal.aborted) throw new Error('aborted'); return r; }),
    friendsApi.pending().then(r => { if (signal.aborted) throw new Error('aborted'); return r; }),
    friendsApi.blocked().then(r => { if (signal.aborted) throw new Error('aborted'); return r; }),
  ]);
}

export function FriendsSection() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data when user changes
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    
    loadFriendsData(user.id, controller.signal)
      .then(([f, p, b]) => {
        setFriends(f);
        setPending(p);
        setBlocked(b);
      })
      .catch(err => {
        if (err.name !== 'AbortError' && err.message !== 'aborted') {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [user]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      const [f, p, b] = await Promise.all([
        friendsApi.list(),
        friendsApi.pending(),
        friendsApi.blocked(),
      ]);
      setFriends(f);
      setPending(p);
      setBlocked(b);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, [user]);

  const handleAccept = async (id: string) => {
    try {
      await friendsApi.accept(id);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await friendsApi.reject(id);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await friendsApi.remove(id);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    }
  };

  const handleBlock = async (userId: string) => {
    try {
      await friendsApi.block(userId);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block');
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      await friendsApi.unblock(id);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unblock');
    }
  };

  if (!user) return null;

  const onlineFriends = friends.filter(f => f.friend.status === 'ONLINE' || f.friend.status === 'IDLE' || f.friend.status === 'DND');
  const filteredFriends = friends.filter(f =>
    f.friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => setTab('friends')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'friends' ? 'bg-brand text-[#090909]' : 'text-fg-muted hover:bg-raised hover:text-fg'
            }`}
          >
            <Users size={14} />
            {t('friends.online')}
            {onlineFriends.length > 0 && <span className="rounded bg-[#090909]/20 px-1.5 py-0.5 text-[10px]">{onlineFriends.length}</span>}
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'pending' ? 'bg-brand text-[#090909]' : 'text-fg-muted hover:bg-raised hover:text-fg'
            }`}
          >
            <Clock size={14} />
            {t('friends.pending')}
            {pending.length > 0 && <span className="rounded bg-brand/20 px-1.5 py-0.5 text-[10px]">{pending.length}</span>}
          </button>
          <button
            onClick={() => setTab('blocked')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'blocked' ? 'bg-brand text-[#090909]' : 'text-fg-muted hover:bg-raised hover:text-fg'
            }`}
          >
            <ShieldOff size={14} />
            {t('friends.blocked')}
            {blocked.length > 0 && <span className="rounded bg-fg-subtle/20 px-1.5 py-0.5 text-[10px]">{blocked.length}</span>}
          </button>
        </div>

        {tab === 'friends' && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('friends.emptyHint')}
                className="w-full rounded-md border border-border bg-[#101216] py-1.5 pl-8 pr-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand"
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Friends List */}
      {tab === 'friends' && (
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 rounded-md bg-raised/50 p-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-raised" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 animate-pulse rounded bg-raised" />
                    <div className="h-2 w-16 animate-pulse rounded bg-raised" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center">
              <Users size={32} className="mx-auto mb-3 text-fg-subtle" />
              <p className="text-sm text-fg-muted">{t('friends.empty')}</p>
              <p className="text-xs text-fg-subtle">{t('friends.emptyHint')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFriends.map((f) => (
                <div
                  key={f.id}
                  className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-raised"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">
                    {initials(f.friend.displayName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-fg">{f.friend.displayName}</span>
                      <StatusDot status={f.friend.status} />
                    </div>
                    <span className="text-xs text-fg-subtle">@{f.friend.username}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => void handleRemove(f.id)}
                      className="rounded p-1.5 text-fg-muted hover:bg-danger/10 hover:text-danger"
                      title={t('friends.remove')}
                    >
                      <UserMinus size={14} />
                    </button>
                    <button
                      onClick={() => void handleBlock(f.friend.id)}
                      className="rounded p-1.5 text-fg-muted hover:bg-warning/10 hover:text-warning"
                      title={t('friends.block')}
                    >
                      <Shield size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Requests */}
      {tab === 'pending' && (
        <div className="space-y-2">
          {pending.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center">
              <Clock size={32} className="mx-auto mb-3 text-fg-subtle" />
              <p className="text-sm text-fg-muted">{t('friends.pendingEmpty')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pending.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-raised"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg">
                    {initials(p.sender.displayName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-fg">{p.sender.displayName}</span>
                    <span className="text-xs text-fg-subtle">@{p.sender.username}</span>
                    <span className="ml-2 text-xs text-brand">{t('friends.requestReceived')}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => void handleAccept(p.id)}
                      className="flex items-center gap-1 rounded-md bg-brand px-2.5 py-1.5 text-xs font-medium text-[#090909] hover:bg-brand-hover"
                    >
                      <Check size={12} />
                      {t('friends.accept')}
                    </button>
                    <button
                      onClick={() => void handleReject(p.id)}
                      className="flex items-center gap-1 rounded-md bg-raised px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:bg-raised/80 hover:text-fg"
                    >
                      <X size={12} />
                      {t('friends.reject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Blocked Users */}
      {tab === 'blocked' && (
        <div className="space-y-2">
          {blocked.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center">
              <ShieldOff size={32} className="mx-auto mb-3 text-fg-subtle" />
              <p className="text-sm text-fg-muted">{t('friends.blockedEmpty')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {blocked.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-raised"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg-muted">
                    {initials(b.user.displayName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-fg">{b.user.displayName}</span>
                    <span className="text-xs text-fg-subtle">@{b.user.username}</span>
                  </div>
                  <button
                    onClick={() => void handleUnblock(b.id)}
                    className="rounded-md bg-raised px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:bg-raised/80 hover:text-fg"
                  >
                    {t('friends.unblock')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}