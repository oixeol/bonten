'use client';

import { useEffect, useState } from 'react';
// useI18n and useAuth available if needed
import { partiesApi, gamesApi, type Party } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Loader2, Plus, Users } from 'lucide-react';

interface Game { id: string; slug: string; name: string; }

export default function PartiesPage() {
  // t and user available if needed

  const [parties, setParties] = useState<Party[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState('');
  const [mode, setMode] = useState('');
  const [creating, setCreating] = useState(false);
  const [myParty, setMyParty] = useState<Party | null>(null);

  const loadParties = async () => {
    setLoading(true);
    try {
      const data = await partiesApi.listAvailable(selectedGame || undefined);
      setParties(data);
    } catch {
      setParties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    gamesApi.list().then((g) => {
      setGames(g);
      if (g.length > 0) setSelectedGame(g[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadParties();
  }, [selectedGame]);

  const handleCreate = async () => {
    if (!selectedGame) return;
    setCreating(true);
    try {
      const party = await partiesApi.create(selectedGame, mode || undefined);
      setMyParty(party);
      setCreateOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Erro ao criar party');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 lg:px-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Parties</h1>
          <p className="mt-1 text-fg-muted">Crie ou entre em uma party.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Criar party
        </Button>
      </header>

      {/* My party */}
      {myParty && (
        <Card className="mb-5 p-4">
          <h3 className="mb-2 font-semibold text-fg">Minha party</h3>
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <span>{myParty.game?.name}</span>
            <span>·</span>
            <span>{myParty.members?.length ?? 0} membros</span>
            <span>·</span>
            <span className={myParty.isOpen ? 'text-success' : 'text-fg-subtle'}>
              {myParty.isOpen ? 'Aberta' : 'Fechada'}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => partiesApi.toggleOpen(myParty.id).then((r) => setMyParty({ ...myParty, isOpen: r.isOpen }))}>
              {myParty.isOpen ? 'Fechar lobby' : 'Abrir lobby'}
            </Button>
            <Button size="sm" variant="danger" onClick={() => partiesApi.leave(myParty.id).then(() => setMyParty(null))}>
              Sair
            </Button>
          </div>
        </Card>
      )}

      {/* Filter */}
      <div className="mb-4 flex gap-3">
        <select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
          {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* Available parties */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-fg-muted" /></div>
      ) : parties.length === 0 ? (
        <div className="py-20 text-center text-fg-muted">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma party disponível.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {parties.map((party) => (
            <Card key={party.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand">
                  {party.members?.length ?? 0}/{5}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-fg">{party.game?.name}</p>
                  <p className="text-xs text-fg-muted">
                    {party.members?.length ?? 0} membros · {party.isOpen ? 'Aberta' : 'Fechada'}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => partiesApi.acceptInvite(party.id as any).catch(() => {})}>Entrar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Criar party" description="Crie uma party para jogar com amigos.">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-fg">Jogo</label>
            <select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-fg">Modalidade (opcional)</label>
            <Input value={mode} onChange={(e) => setMode(e.target.value)} placeholder="Ex: 5v5 ranqueado" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !selectedGame}>
              {creating ? <Loader2 size={16} className="animate-spin" /> : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}