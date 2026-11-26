'use client';

import { useEffect, useState } from 'react';
// useI18n available if needed
import { tournamentsApi, gamesApi, type Game } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Loader2, Trophy, Plus } from 'lucide-react';

export default function TorneiosPage() {
  // t available if needed

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', gameId: '', format: 'single_elim', startDate: '', endDate: '' });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await tournamentsApi.list();
      setTournaments(data);
    } catch {
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    gamesApi.list().then((g) => {
      setGames(g);
      if (g.length > 0) setForm((f) => ({ ...f, gameId: g[0].id }));
    }).catch(() => {});
    load();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await tournamentsApi.create(form);
      setCreateOpen(false);
      setForm({ name: '', gameId: games[0]?.id || '', format: 'single_elim', startDate: '', endDate: '' });
      load();
    } catch (err: any) {
      alert(err?.message || 'Erro');
    } finally {
      setCreating(false);
    }
  };

  const statusLabel: Record<string, string> = {
    draft: 'Rascunho',
    registration: 'Inscrições',
    in_progress: 'Em andamento',
    finished: 'Finalizado',
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 lg:px-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Torneios</h1>
          <p className="mt-1 text-fg-muted">Crie e participe de torneios.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Criar torneio
        </Button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-fg-muted" /></div>
      ) : tournaments.length === 0 ? (
        <div className="py-20 text-center text-fg-muted">
          <Trophy size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum torneio ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Card key={t.id} className="p-4">
              <h3 className="font-semibold text-fg">{t.name}</h3>
              <p className="text-xs text-fg-muted">{t.game?.name} · {t.format}</p>
              <p className="mt-1 text-xs text-fg-subtle">{statusLabel[t.status] || t.status}</p>
              <p className="mt-1 text-xs text-fg-subtle">{t.teams?.length ?? 0} times inscritos</p>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Criar torneio" description="Configure o torneio.">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-fg">Nome</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do torneio" />
          </div>
          <div>
            <label className="text-sm text-fg">Jogo</label>
            <select value={form.gameId} onChange={(e) => setForm({ ...form, gameId: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-fg">Formato</label>
            <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <option value="single_elim">Eliminação simples</option>
              <option value="double_elim">Eliminação dupla</option>
              <option value="groups">Grupos</option>
              <option value="points">Por pontos (TFT)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !form.name || !form.gameId}>
              {creating ? <Loader2 size={16} className="animate-spin" /> : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}