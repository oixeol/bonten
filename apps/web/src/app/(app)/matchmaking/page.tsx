'use client';

import { useEffect, useState } from 'react';
// useAuth available if needed
import { matchmakingApi, gamesApi, type Game } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Play, X } from 'lucide-react';

export default function MatchmakingPage() {
  // user available via useAuth if needed

  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [mode, setMode] = useState('ranked');
  const [region, setRegion] = useState('BR');
  const [inQueue, setInQueue] = useState(false);
  const [queueEntry, setQueueEntry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gamesApi.list().then((g) => {
      setGames(g);
      if (g.length > 0) setSelectedGame(g[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Poll queue status
    if (!inQueue) return;
    const interval = setInterval(async () => {
      try {
        const status = await matchmakingApi.status();
        setQueueEntry(status);
        if (!status) setInQueue(false);
      } catch {
        setInQueue(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [inQueue]);

  const handleJoinQueue = async () => {
    if (!selectedGame) return;
    setLoading(true);
    setError(null);
    try {
      const entry = await matchmakingApi.joinQueue(selectedGame, mode, region);
      setQueueEntry(entry);
      setInQueue(true);
    } catch (err: any) {
      setError(err?.message || 'Erro ao entrar na fila');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    try {
      await matchmakingApi.leaveQueue();
      setInQueue(false);
      setQueueEntry(null);
    } catch (err: any) {
      setError(err?.message || 'Erro ao sair da fila');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 lg:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-fg">Matchmaking</h1>
        <p className="mt-1 text-fg-muted">Entre na fila para encontrar uma partida.</p>
      </header>

      <Card className="p-6">
        {!inQueue ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-fg">Jogo</label>
              <select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-fg">Modalidade</label>
              <Input value={mode} onChange={(e) => setMode(e.target.value)} placeholder="ranked" />
            </div>
            <div>
              <label className="text-sm text-fg">Região</label>
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="BR" />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button onClick={handleJoinQueue} disabled={loading || !selectedGame} className="w-full">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><Play size={16} /> Jogar</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/20">
              <Loader2 size={32} className="animate-spin text-brand" />
            </div>
            <h2 className="text-lg font-semibold text-fg">Buscando partida...</h2>
            <p className="text-sm text-fg-muted">
              {queueEntry?.game?.name} · {queueEntry?.mode} · {queueEntry?.region}
            </p>
            <p className="text-xs text-fg-subtle">Tempo na fila: aguardando...</p>
            <Button variant="danger" onClick={handleLeaveQueue}>
              <X size={16} /> Cancelar
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}