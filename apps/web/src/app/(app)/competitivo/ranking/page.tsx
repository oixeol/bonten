'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/provider';
import { rankingApi, gamesApi, type Game } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Loader2, Trophy } from 'lucide-react';

export default function RankingPage() {
  const { t } = useI18n();

  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [mode, setMode] = useState('ranked');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
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
    rankingApi.leaderboard(selectedGame, mode).then(setLeaderboard).catch(() => setLeaderboard([])).finally(() => setLoading(false));
  }, [selectedGame, mode]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 lg:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-fg">{t('competitive.ranking')}</h1>
      </header>

      <div className="mb-4 flex gap-3">
        <select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
          {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <option value="ranked">Ranqueado</option>
          <option value="unranked">Não ranqueado</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-fg-muted" /></div>
      ) : leaderboard.length === 0 ? (
        <div className="py-20 text-center text-fg-muted">
          <Trophy size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum jogador no ranking ainda.</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {leaderboard.map((entry, i) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-center text-sm font-semibold text-fg-subtle">{i + 1}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-raised text-xs font-semibold text-brand">
                  {entry.user?.displayName?.[0]?.toUpperCase() ?? entry.user?.username?.[0]?.toUpperCase()}
                </div>
                <span className="flex-1 text-sm text-fg">{entry.user?.displayName ?? entry.user?.username}</span>
                <span className="text-sm font-semibold text-fg">{entry.rating}</span>
                <span className="text-xs text-fg-muted">{entry.wins}W {entry.losses}L</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}