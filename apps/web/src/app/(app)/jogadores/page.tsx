'use client';

import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useI18n } from '@/i18n/provider';
import { useAuth } from '@/auth/provider';
import { friendsApi, dmsApi, e2eeApi, type Friendship, type DM } from '@/lib/api';
import { encryptMessage, decryptMessage, getMyPublicKeyBase64 } from '@/lib/crypto';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GifPicker } from '@/components/feed/gif-picker';
import { MarkdownText } from '@/profile/markdown-text';
import type { GifResult } from '@/lib/gifs';
import {
  Search,
  Send,
  Image as ImageIcon,
  Smile,
  X,
  MessageSquare,
  ChevronLeft,
  MoreHorizontal,
  Users,
  Video,
  Settings,
} from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  ONLINE: 'bg-success',
  IDLE: 'bg-warning',
  DND: 'bg-danger',
  OFFLINE: 'bg-fg-subtle',
};

const STATUS_LABEL: Record<string, string> = {
  ONLINE: 'Online',
  IDLE: 'Ausente',
  DND: 'Não perturbe',
  OFFLINE: 'Offline',
};

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

interface Conversation {
  id: string;
  friend: Friendship['friend'];
}

export default function DmPage() {
  const { user } = useAuth();
  return user ? <DmChat key={user.id} /> : null;
}

function DmChat() {
  const { t } = useI18n();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [pendingMedia, setPendingMedia] = useState<{ kind: 'gif'; url: string }[]>([]);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [menu, setMenu] = useState<{ msg: Message; x: number; y: number } | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDm, setShowNewDm] = useState(false);
  const [newDmSearch, setNewDmSearch] = useState('');
  const [newDmResults, setNewDmResults] = useState<{ id: string; username: string; displayName: string; avatarUrl: string | null }[]>([]);
  const [newDmLoading, setNewDmLoading] = useState(false);
  const [myPublicKey, setMyPublicKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const sendingRef = useRef(false);
  const mountedRef = useRef(true);
  const selfName = user?.username ?? '';
  const selfId = user?.id ?? '';

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initKeys() {
      try {
        const registered = await e2eeApi.getPublicKey(selfId);
        if (cancelled) return;
        const key = await getMyPublicKeyBase64(selfId, registered.publicKey);
        if (cancelled) return;
        await e2eeApi.setMyPublicKey(key);
        if (!cancelled) setMyPublicKey(key);
      } catch {
        if (!cancelled) setKeyError('Envio bloqueado: não foi possível validar sua chave E2EE. Use o dispositivo que possui a chave original; nenhuma chave cadastrada será substituída.');
      }
    }
    void initKeys();
    return () => { cancelled = true; };
  }, [selfId]);

  const loadFriends = useCallback(async () => {
    try {
      setLoading(true);
      const [friends, existing] = await Promise.all([friendsApi.getFriends(), dmsApi.listConversations()]);
      if (!mountedRef.current) return;
      const convs = new Map<string, Conversation>();
      for (const { partner } of existing) convs.set(partner.id, { id: partner.id, friend: partner });
      for (const { friend } of friends) convs.set(friend.id, { id: friend.id, friend });
      const list = [...convs.values()];
      setConversations(list);
      setActiveConvId((current) => current ?? list[0]?.id ?? null);
    } catch {
      if (mountedRef.current) setHistoryError('Não foi possível carregar suas conversas.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { void loadFriends(); }, [loadFriends]);

  // ponytail: API returns latest 50; add cursor pagination when backend supports it.
  useEffect(() => {
    if (!activeConvId) return;
    const partnerId = activeConvId;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setHistoryLoading(true);
    setHistoryError(null);
    async function poll() {
      try {
        const rows = await dmsApi.listConversation(partnerId);
        if (cancelled) return;
        const loaded = await Promise.all(rows.map((dm) => decodeDm(dm, selfId, partnerId)));
        if (cancelled) return;
        setMessages((current) => ({ ...current, [partnerId]: mergeMessages(current[partnerId] ?? [], loaded) }));
        setHistoryError(null);
        if (rows.some((dm) => dm.receiverId === selfId && !dm.isRead)) {
          await dmsApi.markAsRead(partnerId);
        }
      } catch {
        if (!cancelled) setHistoryError('Não foi possível atualizar o histórico ou marcar mensagens como lidas.');
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
          timer = setTimeout(poll, 5000);
        }
      }
    }
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [activeConvId, selfId, myPublicKey]);

  const convMessages = activeConvId ? messages[activeConvId] ?? [] : [];
  const activeConv = conversations.find((c) => c.id === activeConvId);

  function selectConversation(id: string | null) {
    if (sendingRef.current || id === activeConvId) return;
    setActiveConvId(id);
    setDraft('');
    setPendingMedia([]);
    setReplyTo(null);
    setMenu(null);
    setGifPickerOpen(false);
    setSendError(null);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!activeConvId || !myPublicKey || sendingRef.current) return;
    const text = draft.trim();
    if (!text && pendingMedia.length === 0) return;
    const partnerId = activeConvId;
    sendingRef.current = true;
    setSending(true);
    setSendError(null);
    try {
      const plaintext = JSON.stringify({
        text,
        ...(pendingMedia.length ? { media: pendingMedia } : {}),
        ...(replyTo ? { reply: { author: replyTo.author, text: replyTo.text } } : {}),
      });
      const body = parseMessageBody(plaintext);
      const { publicKey } = await e2eeApi.getPublicKey(partnerId);
      if (!mountedRef.current) return;
      if (!publicKey) throw new Error('Destinatário ainda não possui chave E2EE. Nada foi enviado.');
      const encrypted = await encryptMessage(plaintext, publicKey, selfId, partnerId);
      if (!mountedRef.current) return;
      const encryptedContent = JSON.stringify(encrypted);
      if (encryptedContent.length > 20000) throw new Error('Mensagem excede o limite cifrado. Reduza o texto, GIFs ou resposta.');
      const saved = await dmsApi.send({ receiverId: partnerId, encryptedContent, isEncrypted: true });
      if (!mountedRef.current) return;
      const message: Message = {
        ...body,
        id: saved.id,
        author: selfName,
        initials: initials(user?.displayName ?? selfName),
        time: new Date(saved.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date(saved.createdAt).getTime(),
        isMine: true,
      };
      setMessages((current) => ({ ...current, [partnerId]: mergeMessages(current[partnerId] ?? [], [message]) }));
      setDraft('');
      setPendingMedia([]);
      setReplyTo(null);
    } catch (err) {
      if (mountedRef.current) setSendError(err instanceof Error ? err.message : 'Falha no envio. Rascunho preservado.');
    } finally {
      sendingRef.current = false;
      if (mountedRef.current) setSending(false);
    }
  }

  function handleMessageGifSelect(gif: GifResult) {
    if (sendingRef.current) return;
    if (!isHttpUrl(gif.gifUrl) || pendingMedia.length >= 4) {
      setSendError('Escolha um GIF HTTP/HTTPS válido. Máximo: 4 GIFs por mensagem.');
      return;
    }
    setPendingMedia((current) => [...current, { kind: 'gif', url: gif.gifUrl }]);
  }

  function openMenu(msg: Message, x: number, y: number) {
    if (!sendingRef.current && !msg.unavailable) setMenu({ msg, x, y });
  }

  function startReply(msg: Message) {
    if (sendingRef.current) return;
    setReplyTo(msg);
    setMenu(null);
  }

  function startForward(msg: Message) {
    if (sendingRef.current) return;
    setDraft((d) => (d ? `${d}\n> ${msg.author}: ${msg.text}` : `> ${msg.author}: ${msg.text}`));
    setMenu(null);
  }

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', close);
    };
  }, [menu]);

  async function searchUsers() {
    if (!newDmSearch.trim()) return;
    try {
      setNewDmLoading(true);
      const results = await friendsApi.searchUsers(newDmSearch.trim());
      setNewDmResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setNewDmLoading(false);
    }
  }

  async function startNewDm() {
    try {
      await friendsApi.sendRequest(newDmSearch.trim());
      setShowNewDm(false);
      setNewDmSearch('');
      setNewDmResults([]);
      await loadFriends();
    } catch (err) {
      console.error('Failed to send request:', err);
    }
  }

  // Desktop sidebar width
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <div className="flex h-full min-h-0 bg-base">
      {/* ---- Sidebar: Conversations ---- */}
      <aside className={`flex flex-col w-80 shrink-0 border-r border-border bg-[#15171c] lg:hidden ${isMobile ? 'fixed inset-y-0 left-0 z-40' : 'flex'}`}>
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <MessageSquare size={20} className="text-fg-muted" />
          <h1 className="text-sm font-semibold text-fg">{t('nav.players')}</h1>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('friends.emptyHint')}
              className="w-full rounded-md border border-border bg-[#101216] py-1.5 pl-8 pr-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* New DM button */}
        <div className="px-3 pb-3">
          <button
            onClick={() => setShowNewDm(true)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-brand hover:bg-brand/10 transition-colors"
          >
            <Users size={16} />
            {t('friends.add')}
          </button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto space-y-1 px-2 pb-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-md bg-raised/50 p-3 animate-pulse">
                  <div className="h-9 w-9 rounded-full bg-raised" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 rounded bg-raised" />
                    <div className="h-2 w-16 rounded bg-raised" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center">
              <MessageSquare size={32} className="mx-auto mb-3 text-fg-subtle" />
              <p className="text-sm text-fg-muted">{t('friends.empty')}</p>
              <p className="text-xs text-fg-subtle">{t('friends.emptyHint')}</p>
            </div>
          ) : (
            conversations
              .filter((c) =>
                c.friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.friend.username.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((c) => {
                const history = messages[c.id];
                const lastMsg = history?.[history.length - 1];
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={sending}
                    onClick={() => selectConversation(c.id)}
                    className={`flex w-full items-start gap-3 rounded-md p-2 transition-colors ${
                      activeConvId === c.id
                        ? 'bg-brand/10 text-fg'
                        : 'text-fg-muted hover:bg-raised hover:text-fg'
                    }`}
                  >
                    <span className="relative shrink-0">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-raised text-xs font-semibold text-brand">
                        {initials(c.friend.displayName)}
                      </span>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#15171c] ${STATUS_COLOR[c.friend.status]}`}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-fg">{c.friend.displayName}</span>
                        {lastMsg && (
                          <span className="shrink-0 text-[10px] text-fg-subtle">{lastMsg.time}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-fg-subtle">
                          {lastMsg
                            ? (lastMsg.isMine ? 'Você: ' : '') + lastMsg.text
                            : history ? 'Nenhuma mensagem ainda' : 'Abrir conversa'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
          )}
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobile && activeConvId === null && (
        <div
          className="fixed inset-0 z-30 bg-base/80 lg:hidden"
          onClick={() => selectConversation(null)}
        />
      )}

      {/* ---- Chat Area ---- */}
      <div className="flex min-w-0 flex-1 flex-col lg:flex">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
          {isMobile && (
            <button
              type="button"
              onClick={() => selectConversation(null)}
              className="shrink-0 rounded p-1.5 text-fg-muted transition-colors hover:text-fg lg:hidden"
              aria-label="Voltar"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {activeConv ? (
            <>
              <span className="relative shrink-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-raised text-xs font-semibold text-brand">
                  {initials(activeConv.friend.displayName)}
                </span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${STATUS_COLOR[activeConv.friend.status]}`}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{activeConv.friend.displayName}</p>
                <p className="truncate text-xs text-fg-subtle">
                  {STATUS_LABEL[activeConv.friend.status] || activeConv.friend.status}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className="shrink-0 rounded p-1.5 text-fg-muted hover:text-fg" aria-label={t('server.voice.startStream')}>
                  <Video size={18} />
                </button>
                <button type="button" className="shrink-0 rounded p-1.5 text-fg-muted hover:text-fg" aria-label={t('server.voice.settings')}>
                  <Settings size={18} />
                </button>
                <button type="button" className="shrink-0 rounded p-1.5 text-fg-muted hover:text-fg" aria-label="Mais">
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 text-center text-fg-muted">
              {t('friends.emptyHint')}
            </div>
          )}
        </div>

        {keyError && (
          <div role="alert" className="px-4 py-2 text-sm text-danger">
            <p>{keyError}</p>
            <button
              type="button"
              className="mt-2 rounded-md bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/20"
              onClick={async () => {
                try {
                  await e2eeApi.resetMyPublicKey();
                  setKeyError(null);
                  // Re-init
                  window.location.reload();
                } catch {
                  setKeyError('Não foi possível resetar a chave. Tente novamente.');
                }
              }}
            >
              Resetar chave E2EE
            </button>
          </div>
        )}
        {historyError && <p role="alert" className="px-4 py-2 text-sm text-danger">{historyError}</p>}
        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {activeConv ? (
            <div className="mx-auto max-w-3xl space-y-4">
              {convMessages.length > 0 ? (
                convMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`group flex gap-2 ${msg.isMine ? 'flex-row-reverse' : ''}`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openMenu(msg, e.clientX, e.clientY);
                    }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-raised text-xs font-semibold text-brand">
                      {msg.initials}
                    </span>
                    <div className={`min-w-0 flex-1 ${msg.isMine ? 'text-right' : ''}`}>
                      <div className="flex items-baseline gap-2 justify-end">
                        {!msg.isMine && (
                          <button
                            type="button"
                            onClick={() => {}}
                            className="text-sm font-medium text-fg hover:text-brand"
                          >
                            {msg.author}
                          </button>
                        )}
                        <span className="text-[10px] text-fg-subtle">{msg.time}</span>
                      </div>
                      {msg.reply && (
                        <div className={`mb-0.5 truncate border-l-2 border-border-strong pl-2 text-xs text-fg-subtle ${msg.isMine ? 'border-r-2 border-l-0 text-right pr-2 pl-0' : ''}`}>
                          <span className="font-medium text-fg-muted">{msg.reply.author}</span>: {msg.reply.text}
                        </div>
                      )}
                      <div role={msg.unavailable ? 'alert' : undefined} className={`font-chat whitespace-pre-wrap break-words text-sm ${msg.isMine ? 'text-fg' : 'text-fg-muted'}`}>
                        <MarkdownText text={msg.text} />
                      </div>
                      {msg.legacy && <p className="text-xs text-warning">Mensagem legada: enviada sem criptografia ponta a ponta.</p>}
                      {msg.media && msg.media.length > 0 && (
                        <div
                          className={`mt-1 grid gap-1 overflow-hidden rounded-md ${
                            msg.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                          }`}
                        >
                          {msg.media.map((m, i) =>
                            m.kind === 'gif' ? (
                              <img
                                key={i}
                                src={m.url}
                                alt=""
                                className="max-w-[320px] max-h-[320px] rounded-md object-contain"
                              />
                            ) : (
                              <img
                                key={i}
                                src={m.url}
                                alt=""
                                className="w-full rounded-md"
                              />
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="pt-4 text-center text-sm text-fg-subtle">
                  {historyLoading ? 'Carregando histórico…' : historyError ? 'Histórico indisponível.' : 'Nenhuma mensagem nesta conversa.'}
                </p>
              )}
            </div>
          ) : (
            <div className="flex min-h-full items-center justify-center p-6">
              <div className="text-center space-y-3">
                <MessageSquare size={48} className="mx-auto text-fg-subtle/50" />
                <p className="text-fg-muted">{t('friends.empty')}</p>
                <p className="text-sm text-fg-subtle">{t('friends.emptyHint')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        {activeConv && (
          <div className="shrink-0 space-y-2 border-t border-border bg-surface p-3">
            {sendError && <p role="alert" className="text-sm text-danger">{sendError} Rascunho preservado.</p>}
            {!myPublicKey && !keyError && <p role="status" className="text-xs text-fg-muted">Validando chave E2EE…</p>}
            <p id="dm-image-warning" className="text-xs text-warning">Upload de imagens desativado até haver anexos criptografados. GIFs carregam de sites externos; apenas seus URLs ficam dentro da mensagem cifrada.</p>
            {pendingMedia.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingMedia.map((m, i) => (
                  <div
                    key={i}
                    className="relative h-16 w-16 overflow-hidden rounded-md border border-border bg-raised"
                  >
                    <img src={m.url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() =>
                        setPendingMedia((current) => current.filter((_, idx) => idx !== i))
                      }
                      aria-label={t('feed.remove')}
                      className="absolute right-0.5 top-0.5 rounded-full bg-base/80 p-0.5 text-fg hover:text-danger"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {replyTo && (
              <div className="flex items-center gap-2 rounded-md bg-raised/60 px-2 py-1 text-xs text-fg-muted">
                <span className="shrink-0 font-medium text-brand">
                  {t('server.msg.replyingTo').replace('{author}', replyTo.author)}
                </span>
                <span className="min-w-0 flex-1 truncate">— {replyTo.text}</span>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => setReplyTo(null)}
                  className="shrink-0 text-fg-subtle hover:text-fg"
                  aria-label={t('server.msg.cancel')}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                aria-describedby="dm-image-warning"
                aria-label={t('feed.comment.addPhoto')}
                className="shrink-0 rounded p-1.5 text-fg-muted transition-colors hover:text-fg"
              >
                <ImageIcon size={18} />
              </button>
              <button
                type="button"
                disabled={sending || pendingMedia.length >= 4}
                onClick={() => setGifPickerOpen(true)}
                aria-label={t('feed.comment.addGif')}
                className="shrink-0 rounded p-1.5 text-fg-muted transition-colors hover:text-fg"
              >
                <Smile size={18} />
              </button>
              <Input
                disabled={sending}
                maxLength={4000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
                placeholder={`Mensagem para @${activeConv.friend.username}`}
                aria-label={`Mensagem para @${activeConv.friend.username}`}
              />
              <Button
                type="button"
                size="sm"
                onClick={sendMessage}
                disabled={sending || !myPublicKey || (!draft.trim() && pendingMedia.length === 0)}
                aria-label={`Enviar mensagem para @${activeConv.friend.username}`}
              >
                <Send size={16} />
                <span className="hidden sm:inline">{sending ? 'Enviando…' : t('feed.publish')}</span>
              </Button>
            </div>
            <GifPicker
              open={gifPickerOpen}
              onClose={() => setGifPickerOpen(false)}
              onSelect={handleMessageGifSelect}
            />
          </div>
        )}

        {/* Empty state composer placeholder */}
        {!activeConv && (
          <div className="shrink-0 border-t border-border bg-surface p-3">
            <div className="flex items-center justify-center text-fg-muted text-sm">
              {t('friends.selectConv')}
            </div>
          </div>
        )}
      </div>

      {/* ---- New DM Modal ---- */}
      {showNewDm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface shadow-xl">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-fg">{t('friends.add')}</h2>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Buscar usuário
                </label>
                <input
                  value={newDmSearch}
                  onChange={(e) => setNewDmSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') searchUsers(); }}
                  placeholder="nome de usuário"
                  autoFocus
                  className="w-full rounded-md border border-border bg-[#101216] px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand"
                />
              </div>
              <button
                type="button"
                onClick={searchUsers}
                disabled={!newDmSearch.trim() || newDmLoading}
                className="w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-[#090909] transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {newDmLoading ? 'Buscando...' : 'Buscar'}
              </button>
              {newDmResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {newDmResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => void startNewDm()}
                      className="flex w-full items-center gap-3 rounded-md border border-border bg-[#101216] p-2 text-left transition-colors hover:bg-raised"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-brand">
                        {initials(u.displayName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">{u.displayName}</p>
                        <p className="truncate text-xs text-fg-subtle">@{u.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {newDmSearch.trim() && newDmResults.length === 0 && !newDmLoading && (
                <p className="text-center text-sm text-fg-muted">Nenhum usuário encontrado.</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={() => { setShowNewDm(false); setNewDmSearch(''); setNewDmResults([]); }}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Context menu ---- */}
      {menu && (
        <div
          className="fixed z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-raised p-1 shadow-xl"
          style={{ left: menu.x, top: menu.y }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            type="button"
            onClick={() => startReply(menu.msg)}
            className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-fg transition-colors hover:bg-base"
          >
            {t('server.msg.reply')}
          </button>
          <button
            type="button"
            onClick={() => startForward(menu.msg)}
            className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-fg transition-colors hover:bg-base"
          >
            {t('server.msg.forward')}
          </button>
          <p className="max-w-56 px-2 py-1.5 text-xs text-fg-subtle">Edição e exclusão indisponíveis: servidor ainda não oferece essas ações.</p>
        </div>
      )}
    </div>
  );
}

interface MessageBody {
  text: string;
  media?: { kind: 'gif'; url: string }[];
  reply?: { author: string; text: string };
}

interface Message extends MessageBody {
  id: string;
  author: string;
  initials: string;
  time: string;
  createdAt: number;
  isMine: boolean;
  legacy?: boolean;
  unavailable?: boolean;
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
  } catch { return false; }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMessageBody(plaintext: string): MessageBody {
  if (new TextEncoder().encode(plaintext).length > 12000) throw new Error('Mensagem excede 12.000 bytes. Reduza o texto, GIFs ou resposta.');
  const body: unknown = JSON.parse(plaintext);
  if (!isRecord(body) || typeof body.text !== 'string' || body.text.length > 4000) {
    throw new Error('Texto inválido. Máximo: 4.000 caracteres.');
  }
  const result: MessageBody = { text: body.text };
  if (body.media !== undefined) {
    if (!Array.isArray(body.media) || body.media.length > 4) throw new Error('Mídia inválida.');
    result.media = body.media.map((item: unknown) => {
      if (!isRecord(item) || item.kind !== 'gif' || !isHttpUrl(item.url)) throw new Error('URL de GIF inválida.');
      return { kind: 'gif', url: item.url };
    });
  }
  if (body.reply !== undefined) {
    if (!isRecord(body.reply) || typeof body.reply.author !== 'string' || body.reply.author.length > 100 ||
        typeof body.reply.text !== 'string' || body.reply.text.length > 4000) throw new Error('Resposta inválida.');
    result.reply = { author: body.reply.author, text: body.reply.text };
  }
  if (!result.text.trim() && !result.media?.length) throw new Error('Mensagem vazia.');
  return result;
}

async function decodeDm(dm: DM, userId: string, partnerId: string): Promise<Message> {
  if (!((dm.senderId === userId && dm.receiverId === partnerId) ||
        (dm.senderId === partnerId && dm.receiverId === userId))) throw new Error('Participantes inválidos.');
  const base = {
    id: dm.id,
    author: dm.sender.username,
    initials: initials(dm.sender.displayName),
    time: new Date(dm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: new Date(dm.createdAt).getTime(),
    isMine: dm.senderId === userId,
  };
  if (!dm.isEncrypted && !dm.encryptedContent) return { ...base, text: dm.content ?? '', legacy: true };
  try {
    if (!dm.isEncrypted || !dm.encryptedContent || dm.encryptedContent.length > 20000) throw new Error('Envelope inválido.');
    const plaintext = await decryptMessage(JSON.parse(dm.encryptedContent), userId, dm.senderId, dm.receiverId);
    return { ...base, ...parseMessageBody(plaintext) };
  } catch {
    return { ...base, text: 'Mensagem criptografada indisponível neste dispositivo ou conteúdo inválido.', unavailable: true };
  }
}

function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const merged = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) {
    if (!message.unavailable || !merged.has(message.id)) merged.set(message.id, message);
  }
  return [...merged.values()].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
