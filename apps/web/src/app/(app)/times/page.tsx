'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/provider';
// useAuth available if needed
import { teamsApi, gamesApi, type Team } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Plus, Search, Loader2, Check } from 'lucide-react';

interface Game {
  id: string;
  slug: string;
  name: string;
  format: string;
  teamSize: number;
  partySizesAllowed: number[];
  hasMaps: boolean;
  hasTeams: boolean;
  ratingModel: string;
}

export default function TimesPage() {
  const { t } = useI18n();
  // user available via useAuth if needed

  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createForm, setCreateForm] = useState({
    name: '',
    tag: '',
    gameId: '',
    region: '',
    description: '',
    recruitmentOpen: true,
    language: 'pt-BR',
    mode: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdTeam, setCreatedTeam] = useState<Team | null>(null);

  // Join modal
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinPreview, setJoinPreview] = useState<Team | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinedTeam, setJoinedTeam] = useState<Team | null>(null);

  useEffect(() => {
    gamesApi.list().then((g) => {
      setGames(g);
      if (g.length > 0) setCreateForm((f) => ({ ...f, gameId: g[0].id, region: 'BR' }));
    }).catch(() => {}).finally(() => setLoadingGames(false));
  }, []);

  // Check name/tag availability
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (createForm.name.length < 3) { setNameAvailable(null); return; }
    const timer = setTimeout(async () => {
      try {
        const teams = await teamsApi.list(undefined, undefined, createForm.name);
        setNameAvailable(!teams.some((t) => t.name.toLowerCase() === createForm.name.toLowerCase()));
      } catch {
        setNameAvailable(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [createForm.name]);

  // Tag uniqueness checked on submit

  const handleCreate = async () => {
    setCreateError(null);
    setCreating(true);
    try {
      const team = await teamsApi.create(createForm);
      setCreatedTeam(team);
      setCreateStep(5);
    } catch (err: any) {
      setCreateError(err?.message || 'Erro ao criar time');
    } finally {
      setCreating(false);
    }
  };

  const handlePreviewCode = async () => {
    setJoinError(null);
    setJoinPreview(null);
    if (joinCode.trim().length < 4) { setJoinError('Código inválido'); return; }
    try {
      const team = await teamsApi.byInviteCode(joinCode.trim().toUpperCase());
      setJoinPreview(team);
    } catch (err: any) {
      setJoinError(err?.message || 'Código inválido');
    }
  };

  const handleJoin = async () => {
    if (!joinPreview) return;
    setJoinError(null);
    setJoining(true);
    try {
      const result = await teamsApi.joinByCode(joinPreview.id, joinCode.trim().toUpperCase());
      setJoinedTeam(result.team);
    } catch (err: any) {
      setJoinError(err?.message || 'Erro ao entrar no time');
    } finally {
      setJoining(false);
    }
  };

  const resetCreate = () => {
    setCreateOpen(false);
    setCreateStep(1);
    setCreateForm({ name: '', tag: '', gameId: games[0]?.id || '', region: 'BR', description: '', recruitmentOpen: true, language: 'pt-BR', mode: '' });
    setCreateError(null);
    setCreatedTeam(null);
    setNameAvailable(null);
  };

  const resetJoin = () => {
    setJoinOpen(false);
    setJoinCode('');
    setJoinPreview(null);
    setJoinError(null);
    setJoinedTeam(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 lg:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-fg">{t('teams.title')}</h1>
        <p className="mt-1 text-fg-muted">{t('teams.subtitle')}</p>
      </header>

      {/* Tela inicial */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
            <Plus size={24} className="text-brand" />
          </div>
          <h2 className="text-lg font-semibold text-fg">{t('teams.create')}</h2>
          <p className="mt-1 text-sm text-fg-muted">{t('teams.createDesc')}</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            {t('teams.create')}
          </Button>
        </Card>

        <Card className="p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/20">
            <Search size={24} className="text-brand" />
          </div>
          <h2 className="text-lg font-semibold text-fg">{t('teams.join')}</h2>
          <p className="mt-1 text-sm text-fg-muted">{t('teams.joinDesc')}</p>
          <Button variant="secondary" className="mt-4" onClick={() => setJoinOpen(true)}>
            {t('teams.join')}
          </Button>
        </Card>
      </div>

      <div className="mt-6 text-center">
        <a href="/times/buscar" className="text-sm text-brand hover:underline">
          {t('teams.browse')}
        </a>
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={resetCreate} title={t('teams.create')} description="Crie seu time em 4 etapas.">
        {createStep === 5 && createdTeam ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
              <Check size={32} className="text-success" />
            </div>
            <h3 className="text-lg font-semibold text-fg">{createdTeam.name}</h3>
            <p className="text-sm text-fg-muted">Time criado! Código de convite: <strong>{createdTeam.inviteCode}</strong></p>
            <Button onClick={resetCreate}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs text-fg-muted">
              {[1, 2, 3, 4].map((s) => (
                <span key={s} className={`flex h-6 w-6 items-center justify-center rounded-full ${createStep === s ? 'bg-brand text-[#090909]' : createStep > s ? 'bg-success/20 text-success' : 'bg-raised text-fg-subtle'}`}>
                  {createStep > s ? <Check size={14} /> : s}
                </span>
              ))}
            </div>

            {createStep === 1 && (
              <>
                <h3 className="font-medium text-fg">Identidade</h3>
                <div>
                  <label className="text-sm text-fg">Nome do time</label>
                  <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Ex: Team Alpha" />
                  {nameAvailable === true && <p className="mt-1 text-xs text-success">Disponível</p>}
                  {nameAvailable === false && <p className="mt-1 text-xs text-danger">Já em uso</p>}
                </div>
                <div>
                  <label className="text-sm text-fg">Tag (2-5 caracteres)</label>
                  <Input value={createForm.tag} onChange={(e) => setCreateForm({ ...createForm, tag: e.target.value.toUpperCase() })} placeholder="Ex: TA" maxLength={5} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setCreateStep(2)} disabled={!createForm.name || !createForm.tag || nameAvailable === false}>
                    Próximo
                  </Button>
                </div>
              </>
            )}

            {createStep === 2 && (
              <>
                <h3 className="font-medium text-fg">Competitivo</h3>
                <div>
                  <label className="text-sm text-fg">Jogo principal</label>
                  {loadingGames ? (
                    <div className="flex items-center gap-2 text-sm text-fg-muted"><Loader2 size={16} className="animate-spin" /> Carregando...</div>
                  ) : (
                    <select value={createForm.gameId} onChange={(e) => setCreateForm({ ...createForm, gameId: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                      {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-sm text-fg">Região</label>
                  <Input value={createForm.region} onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })} placeholder="Ex: BR" />
                </div>
                <div>
                  <label className="text-sm text-fg">Modalidade</label>
                  <Input value={createForm.mode} onChange={(e) => setCreateForm({ ...createForm, mode: e.target.value })} placeholder="Ex: 5v5" />
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setCreateStep(1)}>Voltar</Button>
                  <Button onClick={() => setCreateStep(3)} disabled={!createForm.gameId || !createForm.region}>Próximo</Button>
                </div>
              </>
            )}

            {createStep === 3 && (
              <>
                <h3 className="font-medium text-fg">Detalhes</h3>
                <div>
                  <label className="text-sm text-fg">Descrição (opcional)</label>
                  <Input value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Sobre o time..." />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={createForm.recruitmentOpen} onChange={(e) => setCreateForm({ ...createForm, recruitmentOpen: e.target.checked })} />
                  <label className="text-sm text-fg">Recrutamento aberto</label>
                </div>
                <div>
                  <label className="text-sm text-fg">Idioma</label>
                  <select value={createForm.language} onChange={(e) => setCreateForm({ ...createForm, language: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                    <option value="pt-BR">Português</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setCreateStep(2)}>Voltar</Button>
                  <Button onClick={() => setCreateStep(4)}>Próximo</Button>
                </div>
              </>
            )}

            {createStep === 4 && (
              <>
                <h3 className="font-medium text-fg">Revisão</h3>
                <div className="space-y-2 rounded-md border border-border bg-raised p-3 text-sm">
                  <p><strong>Nome:</strong> {createForm.name}</p>
                  <p><strong>Tag:</strong> {createForm.tag}</p>
                  <p><strong>Jogo:</strong> {games.find((g) => g.id === createForm.gameId)?.name}</p>
                  <p><strong>Região:</strong> {createForm.region}</p>
                  <p><strong>Recrutamento:</strong> {createForm.recruitmentOpen ? 'Aberto' : 'Fechado'}</p>
                </div>
                {createError && <p className="text-sm text-danger">{createError}</p>}
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setCreateStep(3)}>Voltar</Button>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? <Loader2 size={16} className="animate-spin" /> : 'Criar time'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Join Modal */}
      <Modal open={joinOpen} onClose={resetJoin} title={t('teams.join')} description="Entre com um código de convite.">
        {joinedTeam ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
              <Check size={32} className="text-success" />
            </div>
            <h3 className="text-lg font-semibold text-fg">{joinedTeam.name}</h3>
            <p className="text-sm text-fg-muted">Você entrou no time!</p>
            <Button onClick={resetJoin}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-fg">Código de convite</label>
              <div className="flex gap-2">
                <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Ex: ABC12345" />
                <Button onClick={handlePreviewCode}>Verificar</Button>
              </div>
            </div>

            {joinError && <p className="text-sm text-danger">{joinError}</p>}

            {joinPreview && (
              <div className="space-y-3 rounded-md border border-border bg-raised p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 text-sm font-semibold text-brand">
                    {joinPreview.tag}
                  </div>
                  <div>
                    <p className="font-medium text-fg">{joinPreview.name}</p>
                    <p className="text-xs text-fg-muted">{joinPreview.game?.name} · {joinPreview.region} · {joinPreview._count?.members ?? '?'} membros</p>
                  </div>
                </div>
                <Button onClick={handleJoin} disabled={joining} className="w-full">
                  {joining ? <Loader2 size={16} className="animate-spin" /> : 'Entrar no time'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}