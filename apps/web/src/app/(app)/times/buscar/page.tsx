'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/provider';
// useAuth available if needed
import { teamsApi, gamesApi, type Team } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Loader2, Search, Users, Send, Check } from 'lucide-react';

interface Game { id: string; slug: string; name: string; }

export default function BrowseTeamsPage() {
  const { t } = useI18n();
  // user available via useAuth if needed

  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  // Apply modal
  const [applyTeam, setApplyTeam] = useState<Team | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await teamsApi.list(gameFilter || undefined, regionFilter || undefined, search || undefined);
      setTeams(data);
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    gamesApi.list().then(setGames).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadTeams, 300);
    return () => clearTimeout(timer);
  }, [search, gameFilter, regionFilter]);

  const handleApply = async () => {
    if (!applyTeam) return;
    setApplying(true);
    setApplyError(null);
    try {
      await teamsApi.apply(applyTeam.id, applyMessage || undefined);
      setApplySuccess(true);
    } catch (err: any) {
      setApplyError(err?.message || 'Erro ao enviar solicitação');
    } finally {
      setApplying(false);
    }
  };

  const resetApply = () => {
    setApplyTeam(null);
    setApplyMessage('');
    setApplyError(null);
    setApplySuccess(false);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 lg:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-fg">{t('teams.browse')}</h1>
        <p className="mt-1 text-fg-muted">Encontre times com recrutamento aberto.</p>
      </header>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar times..." className="pl-10" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-fg-muted" />
        </div>
        <select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <option value="">Todos os jogos</option>
          {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <option value="">Todas as regiões</option>
          <option value="BR">Brasil</option>
          <option value="NA">América do Norte</option>
          <option value="EU">Europa</option>
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-fg-muted" /></div>
      ) : teams.length === 0 ? (
        <div className="py-20 text-center text-fg-muted">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum time encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand">
                  {team.tag}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="truncate font-semibold text-fg">{team.name}</h3>
                  <p className="text-xs text-fg-muted">{team.game?.name} · {team.region}</p>
                </div>
              </div>
              {team.description && <p className="mt-2 text-sm text-fg-muted line-clamp-2">{team.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-fg-subtle">
                  <Users size={12} className="inline mr-1" />{team._count?.members ?? '?'} membros
                </span>
                <Button size="sm" onClick={() => setApplyTeam(team)}>
                  <Send size={14} /> Solicitar entrada
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Apply Modal */}
      <Modal open={!!applyTeam} onClose={resetApply} title="Solicitar entrada" description={applyTeam ? `Time: ${applyTeam.name}` : ''}>
        {applySuccess ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
              <Check size={32} className="text-success" />
            </div>
            <p className="text-sm text-fg-muted">Solicitação enviada! Aguarde a aprovação.</p>
            <Button onClick={resetApply}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-fg">Mensagem (opcional)</label>
              <Input value={applyMessage} onChange={(e) => setApplyMessage(e.target.value)} placeholder="Por que você quer entrar neste time?" />
            </div>
            {applyError && <p className="text-sm text-danger">{applyError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={resetApply}>Cancelar</Button>
              <Button onClick={handleApply} disabled={applying}>
                {applying ? <Loader2 size={16} className="animate-spin" /> : 'Enviar solicitação'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}