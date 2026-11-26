'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/auth/provider';
// useI18n available if needed
import { gamesApi, teamsApi, rankingApi, dmsApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquare, Plus, ChevronRight, ChevronLeft } from 'lucide-react';

interface Game { id: string; slug: string; name: string; }

const SELECTED_GAME_KEY = 'bonten:competitive:selectedGame';

export function CompetitiveSidebar() {
  const { user } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [rating, setRating] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bonten:competitive:sidebarCollapsed');
    if (saved === 'true') setCollapsed(true);
    const savedGame = localStorage.getItem(SELECTED_GAME_KEY);
    if (savedGame) setSelectedGame(savedGame);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('bonten:competitive:sidebarCollapsed', String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    gamesApi.list().then((g) => {
      setGames(g);
      if (!selectedGame && g.length > 0) setSelectedGame(g[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedGame) localStorage.setItem(SELECTED_GAME_KEY, selectedGame);
  }, [selectedGame]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [teamsData, unreadMsg] = await Promise.all([
          teamsApi.list(selectedGame || undefined).catch(() => []),
          dmsApi.unreadCount().catch(() => 0),
        ]);
        setTeams(teamsData.slice(0, 8));
        setUnreadMessages(unreadMsg);
        if (selectedGame && user.id) {
          const stats = await rankingApi.playerStats(user.id, selectedGame).catch(() => null);
          setRating(stats?.rating ?? null);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user?.id, selectedGame]);

  if (collapsed) {
    return (
      <aside className="hidden lg:flex lg:w-16 lg:flex-col lg:items-center lg:gap-4 lg:border-r lg:border-border lg:py-4">
        <button onClick={toggleCollapsed} className="rounded-md p-1 text-fg-muted hover:text-fg" aria-label="Expandir painel">
          <ChevronRight size={16} />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand">
          {user?.displayName?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase()}
        </div>
        <Link href="/jogadores" className="relative rounded-md p-2 text-fg-muted hover:text-fg">
          <MessageSquare size={20} />
          {unreadMessages > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-white">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </Link>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:gap-4 lg:border-r lg:border-border lg:p-4">
      {/* Collapse button */}
      <div className="flex justify-end">
        <button onClick={toggleCollapsed} className="rounded-md p-1 text-fg-muted hover:text-fg" aria-label="Recolher painel">
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Block 1: Profile */}
      <Card className="p-4">
        {loading ? (
          <div className="space-y-3">
            <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-raised" />
            <div className="h-4 w-24 animate-pulse rounded bg-raised mx-auto" />
            <div className="h-3 w-16 animate-pulse rounded bg-raised mx-auto" />
          </div>
        ) : (
          <>
            {/* Avatar + name */}
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/20 text-xl font-bold text-brand">
                {user?.displayName?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase()}
              </div>
              <p className="mt-2 font-semibold text-fg">{user?.displayName ?? user?.username}</p>
              <p className="text-xs text-fg-muted">Perfil competitivo</p>
            </div>

            {/* Game selector */}
            <div className="mt-3">
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                aria-label="Selecionar jogo"
              >
                {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            {/* Rank progress bar */}
            {rating && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-fg">{rating.rating ?? 1000} Elo</span>
                  <span className="text-fg-muted">Rank</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-raised">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${Math.min(100, ((rating.rating ?? 1000) / 3000) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-fg-subtle">
                  {rating.wins ?? 0}V {rating.losses ?? 0}D · {rating.matches ?? 0} partidas
                </p>
              </div>
            )}

            {/* Quick stats */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md bg-raised p-2 text-center">
                <p className="text-sm font-semibold text-fg">{rating?.matches ?? 0}</p>
                <p className="text-[10px] text-fg-muted">Partidas</p>
              </div>
              <div className="rounded-md bg-raised p-2 text-center">
                <p className="text-sm font-semibold text-fg">{rating?.rating ?? 1000}</p>
                <p className="text-[10px] text-fg-muted">Elo</p>
              </div>
            </div>

            {/* Messages button */}
            <Link href="/jogadores" className="mt-3 block">
              <Button className="w-full">
                <MessageSquare size={16} />
                Mensagens
                {unreadMessages > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] text-white">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Button>
            </Link>

            {/* Profile link */}
            {user?.id && (
              <Link href={`/competitivo/perfil/${user.id}`} className="mt-2 block text-center text-xs text-brand hover:underline">
                Ver perfil competitivo
              </Link>
            )}
          </>
        )}
      </Card>

      {/* Block 2: My Teams */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">Meus times</h3>
          <Link href="/times">
            <Button size="sm" variant="ghost">
              <Plus size={14} /> Criar
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-raised" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="space-y-3 text-center">
            <p className="text-xs text-fg-muted">Você ainda não tem um time.</p>
            <div className="flex gap-2">
              <Link href="/times" className="flex-1">
                <Button size="sm" className="w-full">Criar um time</Button>
              </Link>
              <Link href="/times" className="flex-1">
                <Button size="sm" variant="secondary" className="w-full">Entrar em um time</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/times/${team.id}`}
                className="flex items-center gap-2 rounded-md bg-raised px-3 py-2 transition-colors hover:bg-raised/80"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">
                  {team.tag}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{team.name}</p>
                  <p className="text-[10px] text-fg-muted">
                    {team.game?.name ?? '—'} · {team._count?.members ?? '?'} membros
                  </p>
                </div>
                <ChevronRight size={14} className="text-fg-subtle" />
              </Link>
            ))}
            {teams.length >= 8 && (
              <Link href="/times" className="block text-center text-xs text-brand hover:underline">
                Ver todos
              </Link>
            )}
          </div>
        )}
      </Card>
    </aside>
  );
}