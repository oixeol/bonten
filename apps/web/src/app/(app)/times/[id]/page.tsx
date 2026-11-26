'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
// i18n available via useI18n if needed
import { useAuth } from '@/auth/provider';
import { gamesApi, rankingApi, teamsApi, type Game, type Team, type TeamRosterMember } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ArrowUpRight, Check, Copy, Edit, Globe2, Loader2, LogOut, Share2, Swords, Trophy, Trash2, Users, X } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  captain: 'Capitão',
  admin: 'Administrador',
  player: 'Jogador',
  reserve: 'Reserva',
  coach: 'Técnico',
  assistant_coach: 'Auxiliar técnico',
  analyst: 'Analista',
  manager: 'Manager',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-brand',
  captain: 'text-warning',
  admin: 'text-info',
  player: 'text-fg',
  reserve: 'text-fg-muted',
  coach: 'text-info',
  assistant_coach: 'text-info',
  analyst: 'text-info',
  manager: 'text-info',
};

const PLAYER_ROSTER_ROLES = new Set(['player', 'reserve', 'captain']);
const TECHNICAL_STAFF_ROLES = new Set(['coach', 'assistant_coach', 'analyst', 'manager']);

type RosterPerson = Pick<TeamRosterMember, 'id' | 'userId' | 'role' | 'user'>;

export default function TeamManagePage() {
  // t available via useI18n if needed
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [selectedSquad, setSelectedSquad] = useState(1);
  const [globalRank, setGlobalRank] = useState<{ rank: number; total: number } | null>(null);
  const [regionalRank, setRegionalRank] = useState<{ rank: number; total: number } | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [globalRankError, setGlobalRankError] = useState<string | null>(null);
  const [regionalRankError, setRegionalRankError] = useState<string | null>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', recruitmentOpen: true });
  const [editing, setEditing] = useState(false);

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Invite code
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [rosterSavingUserId, setRosterSavingUserId] = useState<string | null>(null);
  const [ownerVisibilitySaving, setOwnerVisibilitySaving] = useState(false);

  // Leave
  const [leaving, setLeaving] = useState(false);

  const loadTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamsApi.findById(teamId);
      setTeam(data);
      setEditForm({ name: data.name, description: data.description || '', recruitmentOpen: data.recruitmentOpen });
      setSelectedGameId((current) => current || data.gameId || data.rosters?.find((roster) => roster.gameId)?.gameId || data.ratings?.[0]?.gameId || '');
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar time');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTeam(); }, [teamId]);

  useEffect(() => {
    let active = true;
    gamesApi.list()
      .then((availableGames) => {
        if (!active) return;
        setGames(availableGames);
      })
      .catch((err) => {
        if (active) setGamesError(err?.message || 'Não foi possível carregar os jogos.');
      })
      .finally(() => {
        if (active) setGamesLoading(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!team || !selectedGameId) {
      setGlobalRank(null);
      setRegionalRank(null);
      setRankingLoading(false);
      return;
    }

    let active = true;
    setRankingLoading(true);
    setGlobalRank(null);
    setRegionalRank(null);
    setGlobalRankError(null);
    setRegionalRankError(null);

    Promise.all([
      rankingApi.teamRank(selectedGameId, team.id, 'global')
      .then((rank) => { if (active) setGlobalRank(rank); })
      .catch((err) => { if (active) setGlobalRankError(err?.message || 'Não foi possível carregar o ranking global.'); }),
      rankingApi.teamRank(selectedGameId, team.id, 'regional')
      .then((rank) => { if (active) setRegionalRank(rank); })
      .catch((err) => { if (active) setRegionalRankError(err?.message || 'Não foi possível carregar o ranking regional.'); }),
    ]).finally(() => { if (active) setRankingLoading(false); });

    return () => { active = false; };
  }, [team?.id, selectedGameId]);

  const copyInviteCode = async () => {
    if (!team?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const shareTeam = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: team?.name, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        alert(err.message || 'Não foi possível compartilhar o time.');
      }
    }
  };

  const handleEdit = async () => {
    setEditing(true);
    try {
      const updated = await teamsApi.update(teamId, editForm);
      setTeam((current) => current ? { ...current, ...updated } : updated);
      setEditOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Erro ao editar');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!team || deleteConfirm !== team.name) return;
    setDeleting(true);
    try {
      await teamsApi.delete(teamId, deleteConfirm);
      router.push('/times');
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Tem certeza que deseja sair do time?')) return;
    setLeaving(true);
    try {
      await teamsApi.leave(teamId);
      router.push('/times');
    } catch (err: any) {
      alert(err?.message || 'Erro ao sair');
    } finally {
      setLeaving(false);
    }
  };

  const handleUpdateRosterRole = async (userId: string, role: string) => {
    const roster = team?.rosters?.find((item) => item.gameId === selectedGameId && item.squad === selectedSquad);
    if (!roster) return;
    setRosterSavingUserId(userId);
    try {
      await teamsApi.updateRosterMember(teamId, roster.id, userId, role || null);
      setTeam(await teamsApi.findById(teamId));
    } catch (err: any) {
      alert(err?.message || 'Erro ao atualizar o cargo no roster');
    } finally {
      setRosterSavingUserId(null);
    }
  };

  const handleOwnerVisibilityChange = async (showOwner: boolean) => {
    const roster = team?.rosters?.find((item) => item.gameId === selectedGameId && item.squad === selectedSquad);
    if (!roster) return;
    setOwnerVisibilitySaving(true);
    try {
      await teamsApi.updateRoster(teamId, roster.id, showOwner);
      setTeam(await teamsApi.findById(teamId));
    } catch (err: any) {
      alert(err?.message || 'Erro ao atualizar a exibição do proprietário');
    } finally {
      setOwnerVisibilitySaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remover este membro do time?')) return;
    try {
      await teamsApi.removeMember(teamId, userId);
      await loadTeam();
    } catch (err: any) {
      alert(err?.message || 'Erro ao remover');
    }
  };

  const handleRegenerateCode = async () => {
    if (!confirm('Regenerar código de convite? O código atual deixará de funcionar.')) return;
    try {
      const result = await teamsApi.regenerateInviteCode(teamId);
      setTeam((prev) => prev ? { ...prev, inviteCode: result.inviteCode } : prev);
    } catch (err: any) {
      alert(err?.message || 'Erro');
    }
  };

  const handleDisableCode = async () => {
    if (!confirm('Desativar código de convite?')) return;
    try {
      await teamsApi.disableInviteCode(teamId);
      setTeam((prev) => prev ? { ...prev, inviteCode: null } : prev);
    } catch (err: any) {
      alert(err?.message || 'Erro');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-fg-muted" /></div>;
  }

  if (error || !team) {
    return <div className="py-20 text-center text-fg-muted">{error || 'Time não encontrado'}</div>;
  }

  const isOwner = team.ownerId === user?.id;
  const myMember = team.members?.find((m) => m.userId === user?.id);
  const canManage = myMember && ['owner', 'captain', 'admin'].includes(myMember.role);

  const teamMembers = team.members || [];
  const gameOptions = games.filter((game) => game.hasTeams).map(({ id, slug, name }) => ({ id, slug, name }));
  if (team.game && !gameOptions.some((game) => game.id === team.game?.id)) {
    gameOptions.unshift(team.game);
  }
  const currentGameId = selectedGameId || team.gameId || team.rosters?.find((roster) => roster.gameId)?.gameId || '';
  const selectedGame = gameOptions.find((game) => game.id === currentGameId) ?? team.game;
  const teamOwner = teamMembers.find((member) => member.userId === team.ownerId);
  const currentRoster = team.rosters?.find((roster) => roster.gameId === currentGameId && roster.squad === selectedSquad);
  const assignedRosterMembers = currentRoster?.members || [];
  const ownerMember = currentRoster?.showOwner ? teamOwner : undefined;
  const rosterMembers: RosterPerson[] = [
    ...assignedRosterMembers,
    ...(ownerMember ? [ownerMember] : []),
  ];
  const playerMembers = rosterMembers.filter((member) => PLAYER_ROSTER_ROLES.has(member.role));
  const technicalStaffMembers = rosterMembers.filter((member) => TECHNICAL_STAFF_ROLES.has(member.role) || member.role === 'owner');
  const titulares = playerMembers.filter((member) => member.role !== 'reserve');
  const reservas = playerMembers.filter((member) => member.role === 'reserve');
  const rosterSquads = [1, 2, 3].map((squad) => {
    const roster = team.rosters?.find((item) => item.gameId === currentGameId && item.squad === squad);
    const owner = roster?.showOwner ? teamOwner : undefined;
    const members: RosterPerson[] = [...(roster?.members || []), ...(owner ? [owner] : [])];
    return {
      squad,
      players: members.filter((member) => PLAYER_ROSTER_ROLES.has(member.role)),
      staff: members.filter((member) => TECHNICAL_STAFF_ROLES.has(member.role) || member.role === 'owner'),
    };
  });
  const ownerListedInRoster = rosterSquads.some(({ players, staff }) =>
    [...players, ...staff].some((member) => member.userId === team.ownerId),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <nav aria-label="Seções do time" className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
        {[
          ['details', 'Detalhes'],
          ['matches', 'Matches'],
          ['cards', 'Cards'],
          ['roster', 'Roster'],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${id === 'details' ? 'border-brand text-fg' : 'border-transparent text-fg-muted hover:text-fg'}`}>
            {label}
          </a>
        ))}
      </nav>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">Veja o desempenho e os três elencos do time por jogo.</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="team-game-select" className="text-xs font-medium text-fg-muted">Jogo</label>
            <select
              id="team-game-select"
              aria-label="Selecionar jogo"
              value={currentGameId}
              onChange={(event) => setSelectedGameId(event.target.value)}
              disabled={gamesLoading || gameOptions.length === 0}
              className="min-w-52 rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!currentGameId && <option value="">{gamesLoading ? 'Carregando jogos...' : 'Selecione um jogo'}</option>}
              {gameOptions.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
            </select>
          </div>
          {gamesError && <p className="text-xs text-danger" role="status">{gamesError}</p>}
        </div>
      </div>

      <section id="details" aria-labelledby="team-name" className="scroll-mt-6">
        <Card className="relative overflow-hidden">
          {team.bannerUrl && <img src={team.bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />}
          <div className="absolute inset-0 bg-gradient-to-r from-base/90 via-base/70 to-base/85" />
          <div className="relative grid gap-7 p-5 sm:p-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-raised text-2xl font-bold text-brand shadow-lg sm:h-36 sm:w-36">
                {team.logoUrl ? <img src={team.logoUrl} alt={`Logo de ${team.name}`} className="h-full w-full object-cover" /> : team.tag}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-brand/15 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-brand">{team.tag}</span>
                  {team.recruitmentOpen && <span className="rounded border border-success/30 bg-success/10 px-2 py-1 text-xs text-success">Recrutando</span>}
                </div>
                <h1 id="team-name" className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{team.name}</h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
                  {selectedGame?.name && <span>{selectedGame.name}</span>}
                  <span className="inline-flex items-center gap-1"><Globe2 size={14} /> Região {team.region}</span>
                  {team.mode && <span>{team.mode}</span>}
                </p>
                {teamOwner && !ownerListedInRoster && (
                  <p className="mt-2 text-sm text-fg-muted">
                    <span className="font-semibold text-brand">Owner</span> @{teamOwner.user.username}
                  </p>
                )}
                {team.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-fg-muted">{team.description}</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={shareTeam}>
                    {linkCopied ? <Check size={16} /> : <Share2 size={16} />}
                    {linkCopied ? 'Link copiado' : 'Compartilhar'}
                  </Button>
                  {canManage && <Button variant="secondary" onClick={() => setEditOpen(true)}><Edit size={16} /> Editar time</Button>}
                  <Button variant="secondary" onClick={() => document.getElementById('team-actions')?.scrollIntoView({ behavior: 'smooth' })}>
                    <ArrowUpRight size={16} /> Ações do time
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 self-center">
              <Metric icon={<Globe2 size={16} />} label="Ranking regional" value={regionalRank ? `#${regionalRank.rank}` : '—'} detail={regionalRankError || (rankingLoading ? 'Calculando...' : regionalRank ? `${team.region} · ${regionalRank.total} times` : 'Sem classificação regional')} />
              <Metric icon={<Trophy size={16} />} label="Ranking global" value={globalRank ? `#${globalRank.rank}` : '—'} detail={globalRankError || (rankingLoading ? 'Calculando...' : globalRank ? `${globalRank.total} times` : 'Sem classificação global')} />
              <Metric icon={<Users size={16} />} label="Roster" value={String(rosterMembers.length)} detail={`${playerMembers.length} players · ${technicalStaffMembers.length} comissão técnica`} />
              <Metric icon={<Globe2 size={16} />} label="Região" value={team.region} detail={`Idioma ${team.language || '—'}`} />
            </div>
          </div>
        </Card>
      </section>

      <div className="mt-7 grid gap-7 xl:grid-cols-2">
        <section id="matches" aria-labelledby="matches-title" className="scroll-mt-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Competitivo</p>
              <h2 id="matches-title" className="mt-1 text-xl font-semibold text-fg">Últimas partidas</h2>
            </div>
            <span className="text-xs text-fg-subtle">Resumo</span>
          </div>
          <Card className="flex min-h-32 items-center justify-center p-5 text-center">
            <div>
              <Swords size={22} className="mx-auto mb-2 text-fg-subtle" />
              <p className="text-sm font-medium text-fg">Nenhuma partida registrada{selectedGame ? ` para ${selectedGame.name}` : ''}</p>
              <p className="mt-1 text-xs text-fg-muted">O histórico competitivo deste time aparecerá aqui quando estiver disponível.</p>
            </div>
          </Card>
        </section>

        <section aria-labelledby="upcoming-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Calendário</p>
              <h2 id="upcoming-title" className="mt-1 text-xl font-semibold text-fg">Próximas partidas</h2>
            </div>
            <span className="text-xs text-fg-subtle">Agenda</span>
          </div>
          <Card className="flex min-h-32 items-center justify-center p-5 text-center">
            <div>
              <Globe2 size={22} className="mx-auto mb-2 text-fg-subtle" />
              <p className="text-sm font-medium text-fg">Agenda vazia</p>
              <p className="mt-1 text-xs text-fg-muted">Não há partidas futuras cadastradas para este time.</p>
            </div>
          </Card>
        </section>
      </div>

      <section id="cards" aria-labelledby="roster-cards-title" className="mt-8 scroll-mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Elenco</p>
            <h2 id="roster-cards-title" className="mt-1 text-xl font-semibold text-fg">Cards do roster</h2>
          </div>
          <a href="#roster" className="text-sm text-fg-muted transition-colors hover:text-fg">Ver elenco completo <ArrowUpRight size={14} className="ml-1 inline" /></a>
        </div>
        <div className="space-y-6">
          {rosterSquads.map(({ squad, players, staff }) => (
            <Card key={squad} className="p-4">
              <h3 className="text-base font-semibold text-fg">Elenco {squad}</h3>
              <div className="mt-4 space-y-5">
                <RosterCardsSection title="Roster Player" members={players} emptyMessage="Nenhum player cadastrado neste elenco." />
                <RosterCardsSection title="Comissão Técnica" members={staff} emptyMessage="Nenhum integrante da comissão técnica cadastrado neste elenco." />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section id="roster" aria-labelledby="roster-title" className="mt-8 grid scroll-mt-6 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4">
            <div>
              <h2 id="roster-title" className="font-semibold text-fg">Roster completo · Equipe {selectedSquad}</h2>
              <p className="mt-1 text-xs text-fg-muted">{rosterMembers.length} pessoas · {titulares.length} titulares · {reservas.length} reservas</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="team-squad-select" className="text-xs font-medium text-fg-muted">Equipe</label>
              <select
                id="team-squad-select"
                aria-label="Selecionar equipe para ver roster completo"
                value={selectedSquad}
                onChange={(event) => setSelectedSquad(Number(event.target.value))}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
              >
                {[1, 2, 3].map((squad) => <option key={squad} value={squad}>Equipe {squad}</option>)}
              </select>
            </div>
          </div>
          <div className="divide-y divide-border">
            <section aria-labelledby="players-list-title" className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 id="players-list-title" className="text-sm font-semibold text-fg">Roster Player</h3>
                <span className="text-xs text-fg-muted">{playerMembers.length}</span>
              </div>
              <RosterMembersList
                members={playerMembers}
                canManage={canManage}
                currentUserId={user?.id}
                emptyMessage="Nenhum player cadastrado neste roster."
                onRemoveMember={handleRemoveMember}
              />
            </section>
            <section aria-labelledby="staff-list-title" className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 id="staff-list-title" className="text-sm font-semibold text-fg">Comissão Técnica</h3>
                <span className="text-xs text-fg-muted">{technicalStaffMembers.length}</span>
              </div>
              <RosterMembersList
                members={technicalStaffMembers}
                canManage={canManage}
                currentUserId={user?.id}
                emptyMessage="Nenhum integrante da comissão técnica cadastrado."
                onRemoveMember={handleRemoveMember}
              />
            </section>
          </div>

          {canManage && (
            <div className="border-t border-border px-4 py-4">
              <h3 className="mb-2 text-sm font-medium text-fg">Solicitações pendentes</h3>
              <ApplicationsList teamId={teamId} onRefresh={loadTeam} />
            </div>
          )}
        </Card>

        <Card id="team-actions" className="h-fit p-4">
          <h2 className="font-semibold text-fg">Gestão do time</h2>
          {team.inviteCode && (
            <div className="mt-4">
              <p className="mb-1 text-xs text-fg-subtle">Código de convite</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-raised px-2 py-1.5 text-sm font-mono text-fg">{team.inviteCode}</code>
                <button onClick={copyInviteCode} className="rounded p-1 text-fg-muted hover:text-fg" aria-label="Copiar código de convite">
                  {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                </button>
              </div>
              {canManage && <div className="mt-2 flex gap-2"><Button variant="ghost" size="sm" onClick={handleRegenerateCode}>Regenerar</Button><Button variant="ghost" size="sm" onClick={handleDisableCode}>Desativar</Button></div>}
            </div>
          )}
          <div className="mt-4 space-y-2">
            <Button variant="secondary" className="w-full" onClick={() => document.getElementById('roster-cards-title')?.scrollIntoView({ behavior: 'smooth' })}>
              <Users size={16} /> Ver roster
            </Button>
            {canManage && (
              <Button variant="secondary" className="w-full" onClick={() => setEditOpen(true)}>
                <Edit size={16} /> Editar elenco
              </Button>
            )}
            {isOwner ? (
              <Button variant="danger" className="w-full" onClick={() => setDeleteOpen(true)}><Trash2 size={16} /> Excluir time</Button>
            ) : (
              <Button variant="danger" className="w-full" onClick={handleLeave} disabled={leaving}><LogOut size={16} /> {leaving ? 'Saindo...' : 'Sair do time'}</Button>
            )}
          </div>
        </Card>
      </section>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar time" description="Altere os dados do time.">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-fg">Nome</label>
            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-fg">Descrição</label>
            <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={editForm.recruitmentOpen} onChange={(e) => setEditForm({ ...editForm, recruitmentOpen: e.target.checked })} />
            <label className="text-sm text-fg">Recrutamento aberto</label>
          </div>
          <section className="space-y-3 border-t border-border pt-4">
            <div>
              <h3 className="text-sm font-semibold text-fg">Gerenciar cargos</h3>
              <p className="mt-1 text-xs text-fg-muted">
                Funções da Equipe {selectedSquad} de {selectedGame?.name || 'jogo selecionado'}.
              </p>
            </div>
            {currentRoster ? (
              <>
                <label className="flex items-center gap-2 rounded-md bg-raised px-3 py-2 text-sm text-fg">
                  <input
                    type="checkbox"
                    checked={currentRoster.showOwner}
                    disabled={ownerVisibilitySaving}
                    onChange={(event) => handleOwnerVisibilityChange(event.target.checked)}
                  />
                  Exibir proprietário neste roster
                </label>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {teamMembers.filter((member) => member.role !== 'owner').map((member) => {
                    const rosterRole = currentRoster.members.find((rosterMember) => rosterMember.userId === member.userId)?.role || '';
                    return (
                      <label key={member.userId} className="flex items-center gap-3 rounded-md bg-raised px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-fg">{member.user.displayName || member.user.username}</span>
                        <select
                          value={rosterRole}
                          disabled={rosterSavingUserId === member.userId}
                          onChange={(event) => handleUpdateRosterRole(member.userId, event.target.value)}
                          aria-label={`Função de ${member.user.displayName || member.user.username} no roster`}
                          className="max-w-40 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-fg"
                        >
                          <option value="">Não incluir</option>
                          <optgroup label="Roster Player">
                            <option value="player">Jogador</option>
                            <option value="reserve">Reserva</option>
                            <option value="captain">Capitão</option>
                          </optgroup>
                          <optgroup label="Comissão Técnica">
                            <option value="coach">Técnico</option>
                            <option value="assistant_coach">Auxiliar técnico</option>
                            <option value="analyst">Analista</option>
                            <option value="manager">Manager</option>
                          </optgroup>
                        </select>
                      </label>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="rounded-md bg-raised px-3 py-2 text-sm text-fg-muted">Não há um roster cadastrado para este jogo.</p>
            )}
          </section>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editing}>{editing ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Excluir time" description="Esta ação é irreversível. Digite o nome do time para confirmar.">
        <div className="space-y-4">
          <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={team.name} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting || deleteConfirm !== team.name}>
              {deleting ? 'Excluindo...' : 'Excluir time'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

function RosterCardsSection({ title, members, emptyMessage }: { title: string; members: RosterPerson[]; emptyMessage: string }) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <span className="text-xs text-fg-muted">{members.length}</span>
      </div>
      {members.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {members.map((member) => (
            <Card key={member.id} className="group relative min-h-56 overflow-hidden border-border-strong bg-gradient-to-b from-raised to-surface transition-colors hover:border-brand/50">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand/10 to-transparent" />
              <div className="relative flex h-full min-h-56 flex-col items-center justify-end p-4 text-center">
                <div className="mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-border-strong bg-base text-2xl font-bold text-brand shadow-md">
                  {member.user.avatarUrl ? <img src={member.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : (member.user.displayName || member.user.username).slice(0, 1).toUpperCase()}
                </div>
                <p className="max-w-full truncate text-sm font-semibold text-fg">{member.user.displayName || member.user.username}</p>
                <p className={`mt-1 text-xs ${ROLE_COLORS[member.role] || 'text-fg-muted'}`}>{ROLE_LABELS[member.role] || member.role}</p>
                <span className={`mt-3 rounded-full px-2 py-1 text-[10px] font-medium ${member.user.status === 'ONLINE' ? 'bg-success/10 text-success' : member.user.status === 'IDLE' ? 'bg-warning/10 text-warning' : 'bg-raised text-fg-subtle'}`}>
                  {member.user.status === 'ONLINE' ? 'Online' : member.user.status === 'IDLE' ? 'Ausente' : 'Offline'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6 text-center text-sm text-fg-muted">{emptyMessage}</Card>
      )}
    </section>
  );
}

function RosterMembersList({
  members,
  canManage,
  currentUserId,
  emptyMessage,
  onRemoveMember,
}: {
  members: RosterPerson[];
  canManage: boolean | undefined;
  currentUserId?: string;
  emptyMessage: string;
  onRemoveMember: (userId: string) => void;
}) {
  if (!members.length) return <p className="py-2 text-sm text-fg-muted">{emptyMessage}</p>;

  return (
    <div className="divide-y divide-border">
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-3 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised text-xs font-semibold text-brand">
            {member.user.avatarUrl ? <img src={member.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : (member.user.displayName || member.user.username).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{member.user.displayName || member.user.username}</p>
            <p className={`text-xs ${ROLE_COLORS[member.role] || 'text-fg-muted'}`}>{ROLE_LABELS[member.role] || member.role}</p>
          </div>
          <span className={`h-2 w-2 shrink-0 rounded-full ${member.user.status === 'ONLINE' ? 'bg-success' : member.user.status === 'IDLE' ? 'bg-warning' : 'bg-fg-subtle'}`} />
          {canManage && member.userId !== currentUserId && member.role !== 'owner' && (
            <div className="flex items-center gap-1">
              <button onClick={() => onRemoveMember(member.userId)} className="rounded p-1 text-fg-muted hover:text-danger" title="Remover" aria-label={`Remover ${member.user.displayName || member.user.username}`}>
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <Card className="bg-base/70 p-3 sm:p-4">
      <div className="flex items-center gap-2 text-fg-muted">{icon}<span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span></div>
      <p className="mt-2 truncate text-xl font-bold text-fg sm:text-2xl">{value}</p>
      <p className="mt-1 truncate text-xs text-fg-subtle">{detail}</p>
    </Card>
  );
}

function ApplicationsList({ teamId, onRefresh }: { teamId: string; onRefresh: () => void }) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teamsApi.listApplications(teamId).then(setApps).catch(() => {}).finally(() => setLoading(false));
  }, [teamId]);

  const handleApprove = async (userId: string) => {
    try {
      await teamsApi.approveApplication(teamId, userId);
      onRefresh();
      setApps((prev) => prev.filter((a) => a.userId !== userId));
    } catch (err: any) {
      alert(err?.message || 'Erro');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await teamsApi.rejectApplication(teamId, userId);
      setApps((prev) => prev.filter((a) => a.userId !== userId));
    } catch (err: any) {
      alert(err?.message || 'Erro');
    }
  };

  if (loading) return <p className="text-xs text-fg-muted">Carregando...</p>;
  if (apps.length === 0) return <p className="text-xs text-fg-muted">Nenhuma solicitação pendente.</p>;

  return (
    <div className="space-y-2">
      {apps.map((app) => (
        <div key={app.id} className="flex items-center gap-2 rounded-md border border-border bg-surface p-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-fg">{app.user?.displayName ?? app.user?.username}</p>
            {app.message && <p className="text-xs text-fg-muted">{app.message}</p>}
          </div>
          <Button size="sm" onClick={() => handleApprove(app.userId)}>Aceitar</Button>
          <Button size="sm" variant="ghost" onClick={() => handleReject(app.userId)}>Recusar</Button>
        </div>
      ))}
    </div>
  );
}