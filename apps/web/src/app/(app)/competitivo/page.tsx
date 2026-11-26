'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/provider';
// useAuth available if needed
import { rankingApi, gamesApi, teamsApi, type Game } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Trophy, Users, Swords, TrendingUp } from 'lucide-react';

export default function CompetitivoPage() {
  const { t } = useI18n();
  // user available via useAuth if needed

  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gamesApi.list().then((g) => {
      setGames(g);
      if (g.length > 0) setSelectedGame(g[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedGame) return;
    setLoading(true);
    Promise.all([
      rankingApi.leaderboard(selectedGame, 'ranked', 5).catch(() => []),
      teamsApi.list(selectedGame).catch(() => []),
    ]).then(([players, teams]) => {
      setTopPlayers(players);
      setMyTeams(teams.slice(0, 5));
    }).finally(() => setLoading(false));
  }, [selectedGame]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 lg:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-fg">{t('competitive.title')}</h1>
        <p className="mt-1 text-fg-muted">{t('competitive.subtitle')}</p>
      </header>

      {/* Game tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {games.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGame(g.id)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${selectedGame === g.id ? 'bg-brand text-[#090909]' : 'bg-raised text-fg-muted'}`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-fg-muted" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top players */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-fg flex items-center gap-2">
                <Trophy size={16} className="text-brand" /> Top Jogadores
              </h3>
              <Link href="/competitivo/ranking" className="text-xs text-brand hover:underline">Ver ranking</Link>
            </div>
            {topPlayers.length === 0 ? (
              <p className="text-sm text-fg-muted">Nenhum jogador ainda.</p>
            ) : (
              <div className="space-y-2">
                {topPlayers.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-md bg-raised px-3 py-2">
                    <span className="w-5 text-center text-sm font-semibold text-fg-subtle">{i + 1}</span>
                    <span className="flex-1 text-sm text-fg">{p.user?.displayName ?? p.user?.username}</span>
                    <span className="text-sm font-semibold text-fg">{p.rating}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* My teams */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-fg flex items-center gap-2">
                <Users size={16} className="text-brand" /> Times
              </h3>
              <Link href="/times" className="text-xs text-brand hover:underline">Gerenciar</Link>
            </div>
            {myTeams.length === 0 ? (
              <p className="text-sm text-fg-muted">Nenhum time encontrado.</p>
            ) : (
              <div className="space-y-2">
                {myTeams.map((t) => (
                  <Link key={t.id} href={`/times/${t.id}`} className="flex items-center gap-3 rounded-md bg-raised px-3 py-2 hover:bg-raised/80">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">
                      {t.tag}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-fg">{t.name}</p>
                      <p className="text-xs text-fg-muted">{t._count?.members ?? '?'} membros</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Quick actions */}
          <Card className="p-4 lg:col-span-2">
            <h3 className="mb-3 font-semibold text-fg">Ações rápidas</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/matchmaking"><Button><Swords size={16} /> Entrar na fila</Button></Link>
              <Link href="/parties"><Button variant="secondary"><Users size={16} /> Criar party</Button></Link>
              <Link href="/torneios"><Button variant="secondary"><Trophy size={16} /> Torneios</Button></Link>
              <Link href="/times"><Button variant="secondary"><Users size={16} /> Times</Button></Link>
              <Link href="/competitivo/ranking"><Button variant="secondary"><TrendingUp size={16} /> Ranking</Button></Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}