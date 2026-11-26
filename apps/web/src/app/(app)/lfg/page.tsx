'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/auth/provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRealtime } from '@/hooks/use-realtime';
import { gamesApi, lfgApi, partiesApi, type Game, type LfgListing, type Party } from '@/lib/api';

export default function LfgPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [listings, setListings] = useState<LfgListing[]>([]);
  const [myListings, setMyListings] = useState<LfgListing[]>([]);
  const [myParty, setMyParty] = useState<Party | null>(null);
  const [gameId, setGameId] = useState('');
  const [mode, setMode] = useState('casual');
  const [region, setRegion] = useState('BR');
  const [targetSize, setTargetSize] = useState(2);
  const [desiredRole, setDesiredRole] = useState('');
  const [applicationRole, setApplicationRole] = useState('');
  const [minimumRating, setMinimumRating] = useState('');
  const [maximumRating, setMaximumRating] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyListingId, setBusyListingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedGame = games.find((game) => game.id === gameId);
  const availableRoles = selectedGame?.roles ?? [];
  const linkedParty = useMemo(() => {
    if (
      !myParty ||
      myParty.leaderId !== user?.id ||
      myParty.status !== 'lobby' ||
      myParty.gameId !== gameId ||
      (myParty.mode && myParty.mode !== mode)
    ) {
      return null;
    }
    return myParty;
  }, [gameId, mode, myParty, user?.id]);

  const refresh = async () => {
    const [available, mine] = await Promise.all([
      lfgApi.list({ gameId: gameId || undefined, mode, region }),
      lfgApi.mine(),
    ]);
    setListings(available);
    setMyListings(mine);
  };

  useRealtime(user?.id, myParty?.id, {
    onLobbiesUpdated: () => {
      void refresh().catch((err) => setError(err instanceof Error ? err.message : 'Não foi possível atualizar o LFG.'));
    },
    onPartyUpdated: () => {
      void partiesApi.mine().then(setMyParty);
    },
    onInviteReceived: () => {
      setError('Você recebeu um convite para uma party. Confira suas notificações.');
    },
  });

  useEffect(() => {
    let active = true;
    Promise.all([gamesApi.list(), partiesApi.mine()])
      .then(([availableGames, party]) => {
        if (!active) return;
        setGames(availableGames);
        setMyParty(party);
        if (availableGames.length > 0) setGameId((current) => current || availableGames[0].id);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Não foi possível carregar os jogos.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      lfgApi.list({ gameId: gameId || undefined, mode, region }),
      lfgApi.mine(),
    ])
      .then(([available, mine]) => {
        if (!active) return;
        setListings(available);
        setMyListings(mine);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Não foi possível carregar os grupos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [gameId, mode, region]);

  const handleCreate = async () => {
    if (!gameId || !mode.trim() || !region.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await lfgApi.create({
        gameId,
        mode: mode.trim(),
        region: region.trim(),
        targetSize,
        ...(desiredRole ? { desiredRole } : {}),
        ...(minimumRating ? { minimumRating: Number(minimumRating) } : {}),
        ...(maximumRating ? { maximumRating: Number(maximumRating) } : {}),
        ...(message.trim() ? { message: message.trim() } : {}),
        ...(linkedParty ? { partyId: linkedParty.id } : {}),
      });
      setMessage('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível publicar seu grupo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApply = async (listing: LfgListing) => {
    setBusyListingId(listing.id);
    setError(null);
    try {
      const role = listing.desiredRole || applicationRole;
      await lfgApi.apply(listing.id, role ? { role } : {});
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível solicitar entrada no grupo.');
    } finally {
      setBusyListingId(null);
    }
  };

  const handleAccept = async (listing: LfgListing, applicationId: string) => {
    setBusyListingId(applicationId);
    setError(null);
    try {
      await lfgApi.accept(listing.id, applicationId);
      setMyParty(await partiesApi.mine());
      router.push('/parties');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível aceitar a solicitação.');
    } finally {
      setBusyListingId(null);
    }
  };

  const handleReject = async (listing: LfgListing, applicationId: string) => {
    setBusyListingId(applicationId);
    setError(null);
    try {
      await lfgApi.reject(listing.id, applicationId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível recusar a solicitação.');
    } finally {
      setBusyListingId(null);
    }
  };

  const handleCancel = async (listingId: string) => {
    setBusyListingId(listingId);
    setError(null);
    try {
      await lfgApi.cancel(listingId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível encerrar o anúncio.');
    } finally {
      setBusyListingId(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Encontrar grupo (LFG)</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Encontre pessoas para jogar junto. O LFG não inicia uma partida competitiva.
          </p>
        </div>
        <p className="text-xs text-fg-subtle">
          Grupos de 4 podem se organizar pelo LFG, mas não poderão entrar na fila competitiva até ajustar o tamanho.
        </p>
        <Link href="/jogar" className="text-sm text-brand hover:underline">Voltar para Jogar</Link>
      </header>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-fg">Preferências de busca</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-fg">
            Jogo
            <select
              value={gameId}
              onChange={(event) => {
                setLoading(true);
                setGameId(event.target.value);
                setDesiredRole('');
                setApplicationRole('');
              }}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
            >
              {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-fg">
            Modalidade
            <Input value={mode} onChange={(event) => {
              setLoading(true);
              setMode(event.target.value);
            }} maxLength={32} />
          </label>
          <label className="text-sm text-fg">
            Região
            <Input value={region} onChange={(event) => {
              setLoading(true);
              setRegion(event.target.value);
            }} maxLength={16} />
          </label>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-fg">Publicar um grupo</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Defina o tamanho social desejado e os requisitos. A decisão de entrar na fila competitiva continua separada.
          </p>
        </div>
        {myParty && !linkedParty && (
          <p className="text-sm text-warning">
            Você já está em outra party. Para publicar, escolha o mesmo jogo e modalidade e seja o líder, ou saia da party atual.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm text-fg">
            Tamanho final do grupo
            <select
              value={targetSize}
              onChange={(event) => setTargetSize(Number(event.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
            >
              {[2, 3, 4, 5].map((size) => <option key={size} value={size}>{size} jogadores</option>)}
            </select>
          </label>
          {availableRoles.length > 0 && (
            <label className="text-sm text-fg">
              Função desejada
              <select
                value={desiredRole}
                onChange={(event) => setDesiredRole(event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
              >
                <option value="">Qualquer função</option>
                {availableRoles.map((role) => <option key={role} value={role}>{role.toUpperCase()}</option>)}
              </select>
            </label>
          )}
          <label className="text-sm text-fg">
            MMR mínimo (opcional)
            <Input type="number" min={0} max={10000} value={minimumRating} onChange={(event) => setMinimumRating(event.target.value)} />
          </label>
          <label className="text-sm text-fg">
            MMR máximo (opcional)
            <Input type="number" min={0} max={10000} value={maximumRating} onChange={(event) => setMaximumRating(event.target.value)} />
          </label>
          <label className="text-sm text-fg sm:col-span-2">
            Mensagem (opcional)
            <Input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={240} placeholder="Estilo de jogo, horário ou preferências" />
          </label>
        </div>
        <Button type="button" onClick={() => void handleCreate()} disabled={submitting || !gameId || (Boolean(myParty) && !linkedParty)}>
          {submitting ? 'Publicando...' : 'Publicar para LFG'}
        </Button>
      </Card>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Grupos disponíveis</h2>
          <span className="text-xs text-fg-muted">{listings.length} anúncios</span>
        </div>
        {loading ? (
          <p className="text-sm text-fg-muted">Carregando grupos...</p>
        ) : listings.length === 0 ? (
          <Card className="p-6 text-center text-sm text-fg-muted">Nenhum grupo corresponde aos filtros atuais.</Card>
        ) : listings.map((listing) => {
          const ownListing = myListings.find((item) => item.id === listing.id);
          const ownApplication = listing.applications.find((application) => application.applicantId === user?.id);
          const pendingApplications = ownListing?.applications.filter((application) => application.status === 'pending') ?? [];
          const isOwner = listing.creatorId === user?.id;

          return (
            <Card key={listing.id} className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-fg">{listing.game.name} · {listing.mode} · {listing.region}</h3>
                  <p className="mt-1 text-sm text-fg-muted">
                    {listing.creator.displayName} · {listing.party.members.length}/{listing.targetSize} jogadores
                    {listing.desiredRole ? ` · procura ${listing.desiredRole.toUpperCase()}` : ''}
                  </p>
                  {(listing.minimumRating !== null || listing.maximumRating !== null) && (
                    <p className="mt-1 text-xs text-fg-subtle">
                      Faixa de MMR: {listing.minimumRating ?? 'sem mínimo'}–{listing.maximumRating ?? 'sem máximo'}
                    </p>
                  )}
                  {listing.message && <p className="mt-2 text-sm text-fg">{listing.message}</p>}
                </div>
                {!isOwner ? (
                  <div className="flex items-center gap-2">
                    {!listing.desiredRole && listing.game.roles.length > 0 && (
                      <select
                        aria-label="Função para esta solicitação"
                        value={applicationRole}
                        onChange={(event) => setApplicationRole(event.target.value)}
                        className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
                      >
                        <option value="">Qualquer função</option>
                        {listing.game.roles.map((role) => <option key={role} value={role}>{role.toUpperCase()}</option>)}
                      </select>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyListingId === listing.id || Boolean(ownApplication)}
                      onClick={() => void handleApply(listing)}
                    >
                      {ownApplication ? 'Solicitação enviada' : busyListingId === listing.id ? 'Enviando...' : 'Solicitar entrada'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={busyListingId === listing.id}
                    onClick={() => void handleCancel(listing.id)}
                  >
                    Encerrar anúncio
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {listing.party.members.map((member) => (
                  <span key={member.id} className="rounded-full bg-raised px-3 py-1 text-xs text-fg-muted">
                    {member.user.displayName}{member.role ? ` · ${member.role.toUpperCase()}` : ''}
                  </span>
                ))}
              </div>
              {isOwner && pendingApplications.length > 0 && (
                <div className="space-y-2 border-t border-border pt-3">
                  <h4 className="text-sm font-medium text-fg">Solicitações pendentes</h4>
                  {pendingApplications.map((application) => (
                    <div key={application.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-fg-muted">
                        {application.applicant?.displayName ?? 'Jogador'}
                        {application.role ? ` · ${application.role.toUpperCase()}` : ''}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyListingId === application.id}
                          onClick={() => void handleAccept(listing, application.id)}
                        >
                          Aceitar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busyListingId === application.id}
                          onClick={() => void handleReject(listing, application.id)}
                        >
                          Recusar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </section>
    </main>
  );
}
