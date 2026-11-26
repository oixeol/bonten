'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/provider';
import { friendsApi, communitiesApi, notificationsApi, type Friendship, type Community, type Notification } from '@/lib/api';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRealtime } from '@/hooks/use-realtime';
import Link from 'next/link';
import { Users, Bell, Server } from 'lucide-react';

export function HomeSidebar() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useRealtime(user?.id, null, {
    onInviteReceived: () => {
      void notificationsApi.list(true).then(setNotifications);
    },
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [f, c, n] = await Promise.all([
          friendsApi.list().catch(() => []),
          communitiesApi.list().catch(() => []),
          notificationsApi.list(true).catch(() => []),
        ]);
        setFriends(f);
        setCommunities(c);
        setNotifications(n);
      } catch {
        // ignore
      }
    };
    void load();
  }, [user?.id]);

  const onlineFriends = friends.filter((f) => f.friend.status === 'ONLINE' || f.friend.status === 'IDLE');

  return (
    <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:gap-4">
      {/* Friends online */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users size={16} className="text-brand" />
            Amigos online
            <Badge tone="brand" className="ml-auto">{onlineFriends.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {onlineFriends.length === 0 ? (
            <p className="text-xs text-fg-muted">Nenhum amigo online.</p>
          ) : (
            onlineFriends.slice(0, 8).map((f) => (
              <div key={f.id} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-sm text-fg">{f.friend.displayName ?? f.friend.username}</span>
              </div>
            ))
          )}
          <Link href="/jogadores" className="block text-xs text-brand hover:underline">
            Ver todos
          </Link>
        </CardBody>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell size={16} className="text-brand" />
            Notificações
            {notifications.length > 0 && (
              <Badge tone="danger" className="ml-auto">{notifications.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-xs text-fg-muted">Sem notificações novas.</p>
          ) : (
            notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="text-xs text-fg-muted">
                <p className="font-medium text-fg">{n.title}</p>
                {n.body && <p className="truncate">{n.body}</p>}
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {/* Recommended communities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Server size={16} className="text-brand" />
            Comunidades
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {communities.length === 0 ? (
            <p className="text-xs text-fg-muted">Nenhuma comunidade.</p>
          ) : (
            communities.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                href={`/servidores/${c.id}`}
                className="block text-sm text-fg hover:text-brand"
              >
                {c.name}
              </Link>
            ))
          )}
          <Link href="/descobrir" className="block text-xs text-brand hover:underline">
            Descobrir mais
          </Link>
        </CardBody>
      </Card>
    </aside>
  );
}