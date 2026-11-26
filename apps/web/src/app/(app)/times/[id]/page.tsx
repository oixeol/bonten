'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
// i18n available via useI18n if needed
import { useAuth } from '@/auth/provider';
import { teamsApi, type Team } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Loader2, Copy, Check, Trash2, LogOut, Shield, Edit, Mic, X } from 'lucide-react';

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

  const handleEdit = async () => {
    setEditing(true);
    try {
      const updated = await teamsApi.update(teamId, editForm);
      setTeam(updated);
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 lg:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Member list (main column) */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-semibold text-fg">Membros ({members.length})</h2>
              <div className="flex items-center gap-2 text-xs text-fg-muted">
                <span>Titulares: {titulares.length}</span>
                <span>Reservas: {reservas.length}</span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-raised text-xs font-semibold text-brand">
                    {m.user.displayName?.[0]?.toUpperCase() ?? m.user.username[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{m.user.displayName ?? m.user.username}</p>
                    <p className={`text-xs ${ROLE_COLORS[m.role] || 'text-fg-muted'}`}>{ROLE_LABELS[m.role] || m.role}</p>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${m.user.status === 'ONLINE' ? 'bg-success' : m.user.status === 'IDLE' ? 'bg-warning' : 'bg-fg-subtle'}`} />
                  {canManage && m.userId !== user?.id && m.role !== 'owner' && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setRoleModal({ userId: m.userId, currentRole: m.role }); setNewRole(m.role); }} className="rounded p-1 text-fg-muted hover:text-fg" title="Alterar cargo">
                        <Shield size={14} />
                      </button>
                      <button onClick={() => handleRemoveMember(m.userId)} className="rounded p-1 text-fg-muted hover:text-danger" title="Remover">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Applications */}
            {canManage && (
              <div className="border-t border-border px-4 py-3">
                <h3 className="mb-2 text-sm font-medium text-fg">Solicitações pendentes</h3>
                <ApplicationsList teamId={teamId} onRefresh={loadTeam} />
              </div>
            )}
          </Card>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            {/* Banner */}
            <div className="h-24 bg-gradient-to-br from-brand/20 to-raised" />
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/20 text-lg font-bold text-brand">
                  {team.tag}
                </div>
                <div>
                  <h2 className="font-semibold text-fg">{team.name}</h2>
                  <p className="text-xs text-fg-muted">{team.game?.name} · {team.region}</p>
                </div>
              </div>

              {team.description && <p className="mt-3 text-sm text-fg-muted">{team.description}</p>}

              {/* Invite code */}
              {team.inviteCode && (
                <div className="mt-4">
                  <p className="mb-1 text-xs text-fg-subtle">Código de convite</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-raised px-2 py-1 text-sm font-mono text-fg">{team.inviteCode}</code>
                    <button onClick={copyInviteCode} className="rounded p-1 text-fg-muted hover:text-fg">
                      {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                    </button>
                  </div>
                  {canManage && (
                    <div className="mt-2 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handleRegenerateCode}>Regenerar</Button>
                      <Button variant="ghost" size="sm" onClick={handleDisableCode}>Desativar</Button>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 space-y-2">
                {canManage && (
                  <Button variant="secondary" className="w-full" onClick={() => setEditOpen(true)}>
                    <Edit size={16} /> Editar time
                  </Button>
                )}
                <Button variant="secondary" className="w-full">
                  <Mic size={16} /> Entrar na sala de voz
                </Button>
                {isOwner && (
                  <Button variant="danger" className="w-full" onClick={() => setDeleteOpen(true)}>
                    <Trash2 size={16} /> Excluir time
                  </Button>
                )}
                {!isOwner && (
                  <Button variant="danger" className="w-full" onClick={handleLeave} disabled={leaving}>
                    <LogOut size={16} /> {leaving ? 'Saindo...' : 'Sair do time'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

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