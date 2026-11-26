'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/provider';
import { matchmakingApi, gamesApi, type Game } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRealtime } from '@/hooks/use-realtime';
import { Loader2, Play, X } from 'lucide-react';

export default function MatchmakingPage() {
  const { user } = useAuth();

  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [mode, setMode] = useState('ranked');
  const [region, setRegion] = useState('BR');
  const [inQueue, setInQueue] = useState(false);
  const [queueEntry, setQueueEntry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [acceptingMatch, setAcceptingMatch] = useState(false);
  const [matchAccepted, setMatchAccepted] = useState(false);
  const [matchStarted, setMatchStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedGameConfig = games.find((game) => game.id === selectedGame);
  const requiredRoles = selectedGameConfig?.roles ?? [];

  useRealtime(user?.id, null, {
    onQueueUpdated: () => {
      void matchmakingApi.status()
        .then(async (status) => {
          setQueueEntry(status);
          setInQueue(Boolean(status));
          if (status?.matchId) {
            const match = await matchmakingApi.getMatch(status.matchId);
            setMatchAccepted(Boolean(match.players?.some((player: { userId: string; acceptedAt: string | null }) => (
              player.userId === user?.id && player.acceptedAt
            ))));
            setMatchStarted(match.status === 'in_progress');
          } else {
            setMatchAccepted(false);
            setMatchStarted(false);
          }
        })
        .catch(() => setError('Não foi possível atualizar o estado da fila.'));
    },
    onMatchUpdated: () => {
      if (!queueEntry?.matchId) return;
      void matchmakingApi.getMatch(queueEntry.matchId)
        .then((match) => {
          setMatchAccepted(Boolean(match.players?.some((player: { userId: string; acceptedAt: string | null }) => (
            player.userId === user?.id && player.acceptedAt
          ))));
          setMatchStarted(match.status === 'in_progress');
        })
        .catch(() => setError('Não foi possível atualizar a confirmação da partida.'));
    },
  });

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
        if (status?.matchId) {
          const match = await matchmakingApi.getMatch(status.matchId);
          setMatchAccepted(Boolean(match.players?.some((player: { userId: string; acceptedAt: string | null }) => (
            player.userId === user?.id && player.acceptedAt
          ))));
          setMatchStarted(match.status === 'in_progress');
        }
      } catch {
        setError('Não foi possível atualizar o estado da fila.');
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [inQueue, user?.id]);

  const handleJoinQueue = async () => {
    if (!selectedGame) return;
    setLoading(true);
    setError(null);
    try {
      const entry = await matchmakingApi.joinQueue(selectedGame, mode, region, selectedRole || null);
      setQueueEntry(entry);
      setInQueue(true);
      setMatchAccepted(false);
      setMatchStarted(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao entrar na fila');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptMatch = async () => {
    if (!queueEntry?.matchId) return;
    setAcceptingMatch(true);
    setError(null);
    try {
      const result = await matchmakingApi.acceptMatch(queueEntry.matchId);
      setMatchAccepted(true);
      setMatchStarted(result.matchStarted);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível confirmar presença.');
    } finally {
      setAcceptingMatch(false);
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
              <select
                value={selectedGame}
                onChange={(e) => {
                  setSelectedGame(e.target.value);
                  setSelectedRole('');
                }}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            {requiredRoles.length > 0 && (
              <div>
                <label className="text-sm text-fg">Rota obrigatória</label>
                <select
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <option value="">Selecione uma rota</option>
                  {requiredRoles.map((role) => <option key={role} value={role}>{role.toUpperCase()}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm text-fg">Modalidade</label>
              <Input value={mode} onChange={(e) => setMode(e.target.value)} placeholder="ranked" />
            </div>
            <div>
              <label className="text-sm text-fg">Região</label>
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="BR" />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button onClick={handleJoinQueue} disabled={loading || !selectedGame || (requiredRoles.length > 0 && !selectedRole)} className="w-full">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><Play size={16} /> Jogar</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            {queueEntry?.status === 'matched' ? (
              <>
                <h2 className="text-lg font-semibold text-fg">
                  {matchStarted ? 'Partida iniciada' : matchAccepted ? 'Presença confirmada' : 'Partida encontrada'}
                </h2>
                <p className="text-sm text-fg-muted">
                  {matchStarted ? 'Todos confirmaram presença.' : 'Confirme para iniciar quando todos estiverem prontos.'}
                </p>
                {!matchAccepted && (
                  <Button onClick={() => void handleAcceptMatch()} disabled={acceptingMatch}>
                    {acceptingMatch ? <Loader2 size={16} className="animate-spin" /> : <><Play size={16} /> Confirmar presença</>}
                  </Button>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}