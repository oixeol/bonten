'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, MessageSquare, Gamepad2, UserCheck } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { useAuth } from '@/auth/provider';
import { apiFetch } from '@/lib/api';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  status: string;
  createdAt: string;
  isVip?: boolean;
}

async function fetchUserProfile(username: string): Promise<UserProfile | null> {
  try {
    return await apiFetch<UserProfile>(`/users/${username}`);
  } catch {
    return null;
  }
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function profileExists(slug: string, currentUsername?: string): boolean {
  if (slug === 'me' || slug === currentUsername) return true;
  return true; // We'll let the API decide
}

/**
 * Conteúdo do perfil. Usado tanto na página /perfil/[username]
 * quanto dentro do Modal de perfil (abre sem trocar de rota).
 */
export function ProfileContent({
  slug,
  onBack,
}: {
  slug: string;
  onBack?: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const isMe = slug === 'me' || slug === user?.username;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted' | 'blocked'>('none');
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  const name = isMe ? (user?.username ?? 'player') : slug;
  const displayName = isMe ? (user?.displayName ?? name) : (profile?.displayName ?? slug);

  useEffect(() => {
    if (isMe || !slug) return;
    void fetchUserProfile(slug).then(p => {
      setProfile(p);
      setLoading(false);
    });
  }, [isMe, slug]);

  if (!isMe && loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-lg bg-raised/50" />
        <div className="h-32 animate-pulse rounded-lg bg-raised/50" />
      </div>
    );
  }

  if (!isMe && !profile) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-fg-muted">{t('profile.notFound')}</p>
      </div>
    );
  }

  const handleAddFriend = async () => {
    if (!name || name === 'player') return;
    setFriendActionLoading(true);
    try {
      await apiFetch('/friends/send', { method: 'POST', body: { username: name } });
      setFriendStatus('pending');
    } catch {
      // Handle error silently
    } finally {
      setFriendActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft size={15} />
          {t('common.back')}
        </button>
      )}

      {/* Cabeçalho do perfil */}
      <Card className="overflow-hidden">
        {/* Banner (fonte recomendada 1360×480, mín. 680×240). */}
        <div className="aspect-[1360/480] w-full bg-gradient-to-r from-brand/20 to-raised" />
        <CardBody className="-mt-10 space-y-4">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-surface bg-brand text-xl font-semibold text-[#090909]">
            {initials(displayName)}
          </span>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-fg">{displayName}</h1>
              <p className="text-sm text-fg-muted">@{name}</p>
              <p className="mt-1 text-xs text-fg-subtle">{t('profile.joined')}</p>
            </div>

            <div className="flex gap-2">
              {isMe ? (
                <Button variant="secondary" size="sm">
                  {t('profile.edit')}
                </Button>
              ) : (
                <>
                  {friendStatus === 'none' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddFriend}
                      disabled={friendActionLoading}
                    >
                      <UserPlus size={15} />
                      {t('friends.add')}
                    </Button>
                  )}
                  {friendStatus === 'pending' && (
                    <Button variant="secondary" size="sm" disabled>
                      <UserCheck size={15} />
                      {t('friends.pending')}
                    </Button>
                  )}
                  {friendStatus === 'accepted' && (
                    <Button variant="secondary" size="sm" disabled>
                      <UserCheck size={15} />
                      {t('friends.accepted')}
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" aria-label={t('profile.message')}>
                    <MessageSquare size={15} />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center sm:max-w-xs">
            <Stat value="86" label={t('profile.followers')} />
            <Stat value="148" label={t('profile.following_count')} />
            <Stat value="24" label={t('profile.posts')} />
          </div>
        </CardBody>
      </Card>

      {/* Sobre */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.about')}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-fg-muted">{profile?.bio || t('profile.aboutText')}</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone={profile?.status === 'ONLINE' || user?.status === 'online' ? 'success' : 'neutral'}>
              <Gamepad2 size={13} />
              {profile?.status === 'ONLINE' || user?.status === 'online' ? t('friends.status.online') : t('friends.status.offline')}
            </Badge>
            {(profile?.isVip || user?.isVip) && (
              <Badge tone="brand">{t('profile.vip')}</Badge>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Posts recentes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.recentPosts')}</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-fg-muted">{t('feed.empty')}</p>
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md bg-raised py-2">
      <p className="text-sm font-semibold text-fg">{value}</p>
      <p className="text-xs text-fg-subtle">{label}</p>
    </div>
  );
}