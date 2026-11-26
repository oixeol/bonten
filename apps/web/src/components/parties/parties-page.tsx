'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/auth/provider';
import {
  friendsApi,
  matchmakingApi,
  partiesApi,
  gamesApi,
  type Friendship,
  type MatchmakingQueueEntry,
  type Party,
} from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  Check,
  Copy,
  Gamepad2,
  Loader2,
  Lock,
  LockOpen,
  LogOut,
  Plus,
  Search,
  UserPlus,
  Users,
  X as XIcon,
} from 'lucide-react';

interface Game { id: string; slug: string; name: string; partySizesAllowed: number[]; }

interface PartyCardUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

const PARTY_CAPACITY = 5;
const SIDE_SLOT_ORDER = [1, 3, 0, 4];
const GAME_ICONS: Record<string, string> = {
  cs2: '/games/cs2.png',
  lol: '/games/lol.png',
  tft: '/games/tft.png',
  valorant: '/games/valorant.png',
};

function formatQueueDuration(joinedAt: string, now: number): string {
  const timestamp = Date.parse(joinedAt);
  const seconds = Number.isFinite(timestamp) ? Math.max(0, Math.floor((now - timestamp) / 1000)) : 0;
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

interface PartyLobbyPageProps {
  autoCreateLobby?: boolean;
  mode?: string;
}

export default function PartyLobbyPage({ autoCreateLobby = false, mode }: PartyLobbyPageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [parties, setParties] = useState<Party[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState('');
  const [creating, setCreating] = useState(false);
  const [myParty, setMyParty] = useState<Party | null>(null);
  const [lobbyLoading, setLobbyLoading] = useState(true);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const autoCreateInFlight = useRef(false);
  const [friendPickerOpen, setFriendPickerOpen] = useState(false);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [invitedFriendIds, setInvitedFriendIds] = useState<string[]>([]);
  const [queueEntry, setQueueEntry] = useState<MatchmakingQueueEntry | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueNow, setQueueNow] = useState(Date.now());
  const [groupCodeCopied, setGroupCodeCopied] = useState(false);

  const lobbySlots: (PartyCardUser | null)[] = Array.from({ length: PARTY_CAPACITY }, () => null);
  if (user) {
    lobbySlots[2] = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }
  const sideMembers = (myParty?.members ?? []).filter((member) => member.userId !== user?.id);
  sideMembers.slice(0, SIDE_SLOT_ORDER.length).forEach((member, index) => {
    lobbySlots[SIDE_SLOT_ORDER[index]] = member.user;
  });

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
    if (authLoading) return;
    if (!user) {
      setLobbyLoading(false);
      return;
    }
    let active = true;
    setLobbyLoading(true);
    const loadLobby = async () => {
      try {
        const party = await partiesApi.mine();
        if (!active) return;
        setMyParty(party);

        if (!party && autoCreateLobby && selectedGame && !autoCreateInFlight.current) {
          autoCreateInFlight.current = true;
          setCreating(true);
          try {
            const createdParty = await partiesApi.create(selectedGame, mode);
            if (active) {
              setMyParty(createdParty);
              setLobbyError(null);
            }
          } catch (createError) {
            const existingParty = await partiesApi.mine().catch(() => null);
            if (existingParty) {
              if (active) {
                setMyParty(existingParty);
                setLobbyError(null);
              }
            } else {
              throw createError;
            }
          } finally {
            autoCreateInFlight.current = false;
            if (active) setCreating(false);
          }
        }
      } catch (err) {
        if (active) setLobbyError(err instanceof Error ? err.message : 'Não foi possível carregar seu lobby.');
      } finally {
        if (active) setLobbyLoading(false);
      }
    };
    void loadLobby();

    return () => { active = false; };
  }, [authLoading, user?.id, autoCreateLobby, selectedGame, mode]);

  useEffect(() => {
    gamesApi.list().then((g) => {
      setGames(g);
      if (g.length > 0) {
        setSelectedGame(g[0].id);
      } else if (autoCreateLobby) {
        setLobbyError('Nenhum jogo disponível para criar um lobby.');
        setLobbyLoading(false);
      }
    }).catch((err) => {
      if (autoCreateLobby) {
        setLobbyError(err instanceof Error ? err.message : 'Não foi possível carregar os jogos.');
        setLobbyLoading(false);
      }
    });
  }, [autoCreateLobby]);

  useEffect(() => {
    loadParties();
  }, [selectedGame]);

  useEffect(() => {
    if (!user || !autoCreateLobby) return;
    let active = true;
    matchmakingApi.status().then((entry) => {
      if (active) setQueueEntry(entry);
    }).catch((err) => {
      if (active) setLobbyError(err instanceof Error ? err.message : 'Não foi possível consultar a fila.');
    });
    return () => { active = false; };
  }, [autoCreateLobby, user?.id]);

  useEffect(() => {
    if (!queueEntry) return;
    const timerId = window.setInterval(() => setQueueNow(Date.now()), 1000);
    const pollId = window.setInterval(() => {
      matchmakingApi.status().then(setQueueEntry).catch((err) => {
        setLobbyError(err instanceof Error ? err.message : 'Não foi possível atualizar a fila.');
      });
    }, 3000);
    return () => {
      window.clearInterval(timerId);
      window.clearInterval(pollId);
    };
  }, [queueEntry?.id]);

  const handleCreate = async () => {
    if (!selectedGame) return;
    setCreating(true);
    setLobbyError(null);
    try {
      const party = await partiesApi.create(selectedGame);
      setMyParty(party);
    } catch (err: any) {
      alert(err?.message || 'Erro ao criar party');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenFriendPicker = async () => {
    setFriendPickerOpen(true);
    setFriendsLoading(true);
    setInviteError(null);
    try {
      setFriends(await friendsApi.getFriends());
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Não foi possível carregar seus amigos.');
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleInviteFriend = async (friendUserId: string) => {
    if (!myParty || !user || myParty.leaderId !== user.id) return;
    setInvitingUserId(friendUserId);
    setInviteError(null);
    try {
      await partiesApi.invite(myParty.id, friendUserId);
      setInvitedFriendIds((current) => current.includes(friendUserId) ? current : [...current, friendUserId]);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Não foi possível enviar o convite.');
    } finally {
      setInvitingUserId(null);
    }
  };

  const handleLeaveParty = async () => {
    if (!myParty) return;
    try {
      await partiesApi.leave(myParty.id);
      router.push('/jogar');
    } catch (err) {
      setLobbyError(err instanceof Error ? err.message : 'Não foi possível sair do lobby.');
    }
  };

  const handleToggleLobby = async () => {
    if (!myParty) return;
    try {
      const { isOpen } = await partiesApi.toggleOpen(myParty.id);
      setMyParty((current) => current ? { ...current, isOpen } : current);
    } catch (err) {
      setLobbyError(err instanceof Error ? err.message : 'Não foi possível alterar a visibilidade do lobby.');
    }
  };

  const handleCopyGroupCode = async () => {
    if (!myParty) return;
    try {
      await navigator.clipboard.writeText(myParty.id);
      setGroupCodeCopied(true);
      window.setTimeout(() => setGroupCodeCopied(false), 2000);
    } catch (err) {
      setLobbyError(err instanceof Error ? err.message : 'Não foi possível copiar o código do grupo.');
    }
  };

  const handleJoinQueue = async () => {
    if (!myParty || !selectedGame) return;
    setQueueLoading(true);
    setLobbyError(null);
    try {
      const entry = await matchmakingApi.joinQueue(
        selectedGame,
        myParty.mode ?? mode ?? 'casual',
        'BR',
      );
      setQueueEntry(entry);
      setQueueNow(Date.now());
      setMyParty((current) => current ? {
        ...current,
        status: 'in_queue',
        gameId: selectedGame,
        game: games.find((game) => game.id === selectedGame) ?? current.game,
      } : current);
    } catch (err) {
      setLobbyError(err instanceof Error ? err.message : 'Não foi possível entrar na fila.');
    } finally {
      setQueueLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    setQueueLoading(true);
    setLobbyError(null);
    try {
      await matchmakingApi.leaveQueue();
      setQueueEntry(null);
      setMyParty((current) => current ? { ...current, status: 'lobby' } : current);
    } catch (err) {
      setLobbyError(err instanceof Error ? err.message : 'Não foi possível cancelar a busca.');
    } finally {
      setQueueLoading(false);
    }
  };

  const availableFriends = friends.filter(
    (friendship) => !myParty?.members?.some((member) => member.userId === friendship.friend.id),
  );
  const selectedGameConfig = games.find((game) => game.id === selectedGame);
  const currentPartySize = myParty?.members?.length ?? 1;
  const canJoinQueue = currentPartySize !== 4
    && (selectedGameConfig?.partySizesAllowed.includes(currentPartySize) ?? false);
  const partySizeError = myParty && selectedGameConfig && !canJoinQueue
    ? currentPartySize === 4
      ? 'Lobbies com 4 jogadores não podem entrar na fila. Remova um jogador ou convide mais um.'
      : `Este jogo permite grupos de ${selectedGameConfig.partySizesAllowed.join(', ')} jogadores. O lobby atual tem ${currentPartySize}.`
    : null;

  return (
    <div className={autoCreateLobby
      ? 'flex h-full w-full flex-col'
      : 'mx-auto max-w-5xl px-4 py-5 lg:px-6'}
    >
      {!autoCreateLobby && (
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg">Parties</h1>
            <p className="mt-1 text-fg-muted">Crie ou entre em uma party.</p>
          </div>
          <Button onClick={handleCreate} disabled={creating || lobbyLoading || Boolean(myParty) || !selectedGame}>
            {creating ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Criar party</>}
          </Button>
        </header>
      )}

      {lobbyError && <p className="mb-4 text-sm text-danger" role="alert">{lobbyError}</p>}

      {/* Lobby */}
      {user && (
        <Card className={`overflow-hidden p-4 sm:p-6 ${autoCreateLobby ? 'mb-0 min-h-0 flex-1' : 'mb-5'}`}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                {myParty ? 'Lobby criado' : autoCreateLobby && lobbyLoading ? 'Entrando no lobby...' : autoCreateLobby ? 'Lobby indisponível' : 'Prévia do lobby'}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-fg">{myParty?.game?.name ?? games.find((game) => game.id === (myParty?.gameId ?? selectedGame))?.name ?? 'Minha party'}</h2>
              <p className="mt-1 text-sm text-fg-muted">
                {myParty?.members?.length ?? 1}/{PARTY_CAPACITY} jogadores
                {myParty?.mode && !autoCreateLobby ? ` · ${myParty.mode}` : ''}
              </p>
              <div role="group" aria-label="Selecionar jogo" className="mt-3 inline-flex w-fit items-center gap-1 rounded-lg border border-border bg-base p-1">
                {games.map((game) => {
                  const iconSrc = GAME_ICONS[game.slug];
                  const isSelected = selectedGame === game.id;
                  return (
                    <button
                      key={game.id}
                      type="button"
                      aria-label={game.name}
                      aria-pressed={isSelected}
                      title={game.name}
                      onClick={() => setSelectedGame(game.id)}
                      disabled={Boolean(queueEntry) || queueLoading}
                      className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                        isSelected ? 'bg-brand text-base' : 'text-fg-muted hover:bg-raised hover:text-fg'
                      }`}
                    >
                      {iconSrc ? (
                        <Image src={iconSrc} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
                      ) : (
                        <Gamepad2 size={24} aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {myParty && (
              <div className="flex flex-col items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleToggleLobby()}
                  aria-label={myParty.isOpen ? 'Fechar lobby' : 'Abrir lobby'}
                  title={myParty.isOpen ? 'Lobby aberto — clique para fechar' : 'Lobby fechado — clique para abrir'}
                  className={myParty.isOpen
                    ? 'border-emerald-500/40 bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border-red-500/40 bg-red-600 text-white hover:bg-red-700'}
                >
                  {myParty.isOpen ? <LockOpen size={16} /> : <Lock size={16} />}
                </Button>
                <div className="flex max-w-full items-center gap-1">
                  <code className="max-w-64 break-all text-center text-[10px] text-fg-muted" aria-label="Código do grupo">
                    {myParty.id}
                  </code>
                  <button
                    type="button"
                    onClick={() => void handleCopyGroupCode()}
                    aria-label={groupCodeCopied ? 'Código copiado' : 'Copiar código do grupo'}
                    title={groupCodeCopied ? 'Código copiado' : 'Copiar código do grupo'}
                    className="shrink-0 rounded p-1 text-fg-muted hover:bg-raised hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    {groupCodeCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div aria-label="Jogadores do lobby" className="grid grid-cols-5 items-end gap-1.5 sm:gap-3">
            {lobbySlots.map((player, index) => {
              const isCurrentUser = index === 2;
              const initials = (player?.displayName || player?.username || '?').slice(0, 1).toUpperCase();
              const stairHeightClass = index === 2
                ? 'aspect-[3/5]'
                : index === 1 || index === 3
                  ? 'aspect-[3/4.5]'
                  : 'aspect-[3/4]';
              const slotContent = (
                <>
                  <div className={`relative ${stairHeightClass} overflow-hidden ${isCurrentUser ? 'bg-gradient-to-b from-warning/30 to-raised' : 'bg-gradient-to-b from-brand/20 to-raised'}`}>
                    {player?.avatarUrl ? (
                      <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className={`flex h-full w-full items-center justify-center text-2xl font-bold ${player ? 'text-fg' : 'text-fg-subtle'}`}>
                        {player ? initials : '+'}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base/90 via-transparent to-base/20" />
                    {isCurrentUser && player && (
                      <span className="absolute left-1 top-1 rounded bg-warning px-1.5 py-0.5 text-[9px] font-bold uppercase text-base sm:left-2 sm:top-2 sm:text-[10px]">
                        Você
                      </span>
                    )}
                    {!player && (
                      <span className="absolute inset-x-0 bottom-2 text-center text-[9px] font-medium text-fg-subtle sm:text-xs">
                        Vaga livre
                      </span>
                    )}
                  </div>
                  <div className="px-1 py-2 text-center sm:px-2">
                    <p className="truncate text-[9px] font-semibold text-fg sm:text-xs" title={player ? `@${player.username}` : 'Vaga livre'}>
                      {player ? `@${player.username}` : 'Vaga livre'}
                    </p>
                    <span
                      aria-label="Pontuação a definir"
                      title="Método de pontuação a definir"
                      className="mx-auto mt-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border-strong text-fg-subtle"
                    >
                      <XIcon size={12} />
                    </span>
                  </div>
                </>
              );
              const cardClass = `min-w-0 overflow-hidden rounded-xl border ${isCurrentUser ? 'border-warning/70 bg-warning/5 shadow-lg shadow-warning/10' : 'border-border bg-raised/60'}`;

              return player ? (
                <div key={index} className={cardClass}>
                  {slotContent}
                </div>
              ) : (
                <button
                  key={index}
                  type="button"
                  onClick={() => void handleOpenFriendPicker()}
                  aria-label="Vaga livre — convidar amigo"
                  className={`${cardClass} group text-left transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}
                >
                  {slotContent}
                </button>
              );
            })}
          </div>

          {autoCreateLobby && (
            <div className="mt-8 flex min-h-28 flex-col items-center justify-center gap-3 text-center">
              {queueEntry ? (
                <>
                  {queueEntry.status === 'waiting' && <Loader2 size={26} className="animate-spin text-brand" />}
                  <p className="text-sm font-semibold text-fg">
                    {queueEntry.status === 'matched' ? 'Partida encontrada' : 'Procurando partida...'}
                  </p>
                  <p className="font-mono text-2xl tabular-nums text-brand" aria-live="polite">
                    {formatQueueDuration(queueEntry.joinedAt, queueNow)}
                  </p>
                  {queueEntry.status === 'waiting' && (
                    <Button type="button" variant="danger" onClick={() => void handleLeaveQueue()} disabled={queueLoading}>
                      {queueLoading ? <Loader2 size={16} className="animate-spin" /> : <><XIcon size={16} /> Cancelar busca</>}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {partySizeError && <p className="text-center text-sm text-danger" role="alert">{partySizeError}</p>}
                  <div className="flex items-center justify-center gap-2">
                    <Button type="button" onClick={() => void handleJoinQueue()} disabled={!myParty || !selectedGame || !canJoinQueue || queueLoading}>
                    {queueLoading ? <Loader2 size={16} className="animate-spin" /> : <><Search size={16} /> Procurar fila</>}
                    </Button>
                    {myParty && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => void handleLeaveParty()}
                        aria-label="Sair do lobby"
                        title="Sair do lobby"
                        className="h-9 w-9 px-0"
                      >
                        <LogOut size={16} />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      <Modal
        open={friendPickerOpen}
        onClose={() => setFriendPickerOpen(false)}
        title="Convidar amigo"
        description="Escolha um amigo para convidar para o lobby."
      >
        {inviteError && <p className="mb-3 text-sm text-danger" role="alert">{inviteError}</p>}
        {!myParty && <p className="mb-3 text-sm text-fg-muted">Aguardando a criação do lobby para enviar convites.</p>}
        {myParty && user && myParty.leaderId !== user.id && (
          <p className="mb-3 text-sm text-fg-muted">Somente o líder do lobby pode enviar convites.</p>
        )}
        {friendsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-fg-muted" />
          </div>
        ) : availableFriends.length === 0 ? (
          <div className="py-8 text-center text-sm text-fg-muted">
            <Users size={28} className="mx-auto mb-2 opacity-50" />
            {friends.length === 0 ? 'Você ainda não tem amigos.' : 'Todos os seus amigos já estão no lobby.'}
          </div>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {availableFriends.map(({ id, friend }) => {
              const invited = invitedFriendIds.includes(friend.id);
              const canInvite = Boolean(myParty && user && myParty.leaderId === user.id);
              return (
                <div key={id} className="flex items-center gap-3 rounded-md bg-raised p-2">
                  {friend.avatarUrl ? (
                    <img src={friend.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-xs font-semibold text-fg">
                      {(friend.displayName || friend.username).slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{friend.displayName}</p>
                    <p className="truncate text-xs text-fg-muted">@{friend.username}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={invited ? 'secondary' : 'primary'}
                    disabled={!canInvite || invited || invitingUserId !== null}
                    onClick={() => void handleInviteFriend(friend.id)}
                  >
                    {invitingUserId === friend.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : invited ? (
                      <><Check size={14} /> Convidado</>
                    ) : (
                      <><UserPlus size={14} /> Convidar</>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>



      {/* Available parties */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-fg-muted" /></div>
      ) : parties.length === 0 ? (
        autoCreateLobby ? null : (
        <div className="py-20 text-center text-fg-muted">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma party disponível.</p>
        </div>
        )
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
                <p className="text-xs text-fg-muted">Entrada somente com código do grupo ou convite.</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}