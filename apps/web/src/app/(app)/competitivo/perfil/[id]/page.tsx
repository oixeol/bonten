'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Loader2, Trophy } from 'lucide-react';
import { rankingApi, gamesApi, type Game } from '@/lib/api';

export default function CompetitiveProfilePage() {
  const params = useParams();
  const userId = params.id as string;

  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gamesApi.list().then((g) => {
      setGames(g);
      if (g.length > 0) setSelectedGame(g[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedGame || !userId) return;
    setLoading(true);
    Promise.all([
      rankingApi.playerStats(userId, selectedGame).catch(() => null),
      rankingApi.playerHistory(userId, selectedGame).catch(() => []),
    ]).then(([s, h]) => {
      setStats(s);
      setHistory(h || []);
    }).finally(() => setLoading(false));
  }, [userId, selectedGame]);

  const rating = stats?.rating;

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 lg:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-fg">Perfil Competitivo</h1>
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
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* Sidebar: rating */}
          <Card className="p-4">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/20">
                <Trophy size={32} className="text-brand" />
              </div>
              <p className="mt-2 text-2xl font-bold text-fg">{rating?.rating ?? 1000}</p>
              <p className="text-xs text-fg-muted">Rating</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded bg-raised p-2">
                  <p className="font-semibold text-success">{rating?.wins ?? 0}</p>
                  <p className="text-xs text-fg-muted">Vitórias</p>
                </div>
                <div className="rounded bg-raised p-2">
                  <p className="font-semibold text-danger">{rating?.losses ?? 0}</p>
                  <p className="text-xs text-fg-muted">Derrotas</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-fg-subtle">{rating?.matches ?? 0} partidas</p>
            </div>
          </Card>

          {/* Main: match history */}
          <Card className="p-4">
            <h3 className="mb-3 font-semibold text-fg">Histórico de partidas</h3>
            {history.length === 0 ? (
              <p className="text-sm text-fg-muted">Nenhuma partida ainda.</p>
            ) : (
              <div className="space-y-2">
                {history.map((mp: any) => (
                  <div key={mp.id} className="flex items-center gap-3 rounded-md border border-border bg-raised p-2">
                    <span className={`text-xs font-semibold ${mp.match?.status === 'finished' ? 'text-success' : 'text-fg-muted'}`}>
                      {mp.match?.status === 'finished' ? 'Finalizada' : mp.match?.status}
                    </span>
                    <span className="text-sm text-fg">{mp.match?.mode}</span>
                    <span className="text-xs text-fg-muted">{mp.match?.map || '—'}</span>
                    <span className="ml-auto text-xs text-fg-subtle">
                      {mp.match?.createdAt ? new Date(mp.match.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}