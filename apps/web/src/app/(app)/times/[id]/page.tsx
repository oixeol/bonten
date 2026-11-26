'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
// i18n available via useI18n if needed
import { useAuth } from '@/auth/provider';
import { teamsApi, type Team } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ArrowUpRight, Check, Copy, Crown, Edit, Globe2, Loader2, LogOut, Mic, Shield, Share2, Swords, Trash2, Users, X } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  captain: 'Capitão',
  admin: 'Administrador',
  player: 'Jogador',
  reserve: 'Reserva',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-brand',
  captain: 'text-warning',
  admin: 'text-info',
  player: 'text-fg',
  reserve: 'text-fg-muted',
};

export default function TeamManagePage() {
  // t available via useI18n if needed
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Role change
  const [roleModal, setRoleModal] = useState<{ userId: string; currentRole: string } | null>(null);
  const [newRole, setNewRole] = useState('');

  // Leave
  const [leaving, setLeaving] = useState(false);

  const loadTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamsApi.findById(teamId);
      setTeam(data);
      setEditForm({ name: data.name, description: data.description || '', recruitmentOpen: data.recruitmentOpen });
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar time');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTeam(); }, [teamId]);

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

  const handleChangeRole = async () => {
    if (!roleModal || !newRole) return;
    try {
      await teamsApi.updateMemberRole(teamId, roleModal.userId, newRole);
      await loadTeam();
      setRoleModal(null);
    } catch (err: any) {
      alert(err?.message || 'Erro ao alterar cargo');
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

  const members = team.members || [];
  const titulares = members.filter((m) => m.role !== 'reserve');
  const reservas = members.filter((m) => m.role === 'reserve');
  const teamRating = team.ratings?.find((rating) => rating.gameId === team.gameId) ?? team.ratings?.[0];
  const wins = team.ratings?.reduce((total, rating) => total + rating.wins, 0) ?? 0;
  const losses = team.ratings?.reduce((total, rating) => total + rating.losses, 0) ?? 0;

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
                  {team.game?.name && <span>{team.game.name}</span>}
                  <span className="inline-flex items-center gap-1"><Globe2 size={14} /> Região {team.region}</span>
                  {team.mode && <span>{team.mode}</span>}
                </p>
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
              <Metric icon={<Crown size={16} />} label="Rating" value={teamRating ? teamRating.rating.toLocaleString('pt-BR') : '—'} detail={team.game?.name ?? 'Sem classificação'} />
              <Metric icon={<Swords size={16} />} label="Partidas" value={wins + losses ? `${wins}V · ${losses}D` : '—'} detail={wins + losses ? `${wins + losses} resultados registrados` : 'Sem histórico disponível'} />
              <Metric icon={<Users size={16} />} label="Membros" value={String(members.length)} detail={`${titulares.length} titulares · ${reservas.length} reservas`} />
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
              <p className="text-sm font-medium text-fg">Nenhuma partida registrada</p>
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
          <Card className="p-8 text-center text-sm text-fg-muted">Este time ainda não tem membros no roster.</Card>
        )}
      </section>

      <section id="roster" aria-labelledby="roster-title" className="mt-8 grid scroll-mt-6 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4">
            <div>
              <h2 id="roster-title" className="font-semibold text-fg">Roster</h2>
              <p className="mt-1 text-xs text-fg-muted">{members.length} membros · {titulares.length} titulares · {reservas.length} reservas</p>
            </div>
          </div>
          {members.length ? (
            <div className="divide-y divide-border">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised text-xs font-semibold text-brand">
                    {m.user.avatarUrl ? <img src={m.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : (m.user.displayName || m.user.username).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{m.user.displayName || m.user.username}</p>
                    <p className={`text-xs ${ROLE_COLORS[m.role] || 'text-fg-muted'}`}>{ROLE_LABELS[m.role] || m.role}</p>
                  </div>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${m.user.status === 'ONLINE' ? 'bg-success' : m.user.status === 'IDLE' ? 'bg-warning' : 'bg-fg-subtle'}`} />
                  {canManage && m.userId !== user?.id && m.role !== 'owner' && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setRoleModal({ userId: m.userId, currentRole: m.role }); setNewRole(m.role); }} className="rounded p-1 text-fg-muted hover:text-fg" title="Alterar cargo" aria-label={`Alterar cargo de ${m.user.displayName || m.user.username}`}>
                        <Shield size={14} />
                      </button>
                      <button onClick={() => handleRemoveMember(m.userId)} className="rounded p-1 text-fg-muted hover:text-danger" title="Remover" aria-label={`Remover ${m.user.displayName || m.user.username}`}>
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : <p className="p-5 text-sm text-fg-muted">Ainda não há membros neste time.</p>}

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
            <Button variant="secondary" className="w-full"><Mic size={16} /> Entrar na sala de voz</Button>
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

      {/* Role Change Modal */}
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title="Alterar cargo" description="Selecione o novo cargo.">
        <div className="space-y-4">
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
            <option value="captain">Capitão</option>
            <option value="admin">Administrador</option>
            <option value="player">Jogador</option>
            <option value="reserve">Reserva</option>
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRoleModal(null)}>Cancelar</Button>
            <Button onClick={handleChangeRole}>Salvar</Button>
          </div>
        </div>
      </Modal>
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