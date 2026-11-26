'use client';

import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Hash,
  Volume2,
  MicOff,
  HeadphoneOff,
  Plus,
  Lock,
  Send,
  Image as ImageIcon,
  Smile,
  X,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { MessageKey } from '@/i18n/messages';
import { useAuth } from '@/auth/provider';
import { useProfile } from '@/profile/provider';
import { useVoice } from '@/voice/provider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GifPicker } from '@/components/feed/gif-picker';
import { uploadImage } from '@/lib/uploads';
import { MarkdownText } from '@/profile/markdown-text';
import type { GifResult } from '@/lib/gifs';
import { communitiesApi, channelsApi, messagesApi, type Community, type Channel, type Message } from '@/lib/api';
import { VoiceChannel } from '@/components/voice/voice-channel';
import { EditServerModal, DeleteServerModal } from '@/components/layout/edit-server-modal';
import { ServerHeaderTrigger } from '@/components/layout/server-header-menu';

function resolveChannelName(c: { id: string; name?: string }, _t?: (k: MessageKey) => string): string {
  return c.name ?? c.id;
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export default function ServidorPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { openProfile } = useProfile();
  const params = useParams<{ id: string }>();
  const serverId = params.id;

  const [community, setCommunity] = useState<Community | null>(null);
  const [textChannels, setTextChannels] = useState<Channel[]>([]);
  const [voiceChannels, setVoiceChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [viewingVoice, setViewingVoice] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [pendingMedia, setPendingMedia] = useState<{ kind: 'image' | 'gif'; url: string }[]>([]);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [menu, setMenu] = useState<{ msg: Message; x: number; y: number } | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [channelDialog, setChannelDialog] = useState<{ type: 'text' | 'voice' } | null>(null);
  const [channelName, setChannelName] = useState('');
  const [channelPrivate, setChannelPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voiceChannelOpen, setVoiceChannelOpen] = useState<{ channelId: string; channelName: string } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const messageFileInputRef = useRef<HTMLInputElement | null>(null);

  const { connection, muted, deafened } = useVoice();
  const connectedVoice = connection?.channelId ?? null;

  const serverName = community?.name ?? serverId;

  // Load community data on mount
  useEffect(() => {
    let mounted = true;
    communitiesApi.findById(serverId).then(data => {
      if (mounted) setCommunity(data);
    }).catch(err => {
      if (mounted) setError(err instanceof Error ? err.message : 'Failed to load community');
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    channelsApi.listByCommunity(serverId).then(channels => {
      if (!mounted) return;
      const textChs = channels.filter((c) => c.type === 'TEXT');
      const voiceChs = channels.filter((c) => c.type === 'VOICE');
      setTextChannels(textChs);
      setVoiceChannels(voiceChs);
      if (textChs.length > 0 && !activeChannel) {
        setActiveChannel(textChs[0].id);
      }
    });
    return () => { mounted = false; };
  }, [serverId]);

  // Load messages when active channel changes
  useEffect(() => {
    if (!activeChannel || viewingVoice) return;
    let mounted = true;
    messagesApi.listByChannel(activeChannel).then(data => {
      if (mounted) setMessages(data);
    }).catch(err => {
      if (mounted) console.error('Failed to load messages:', err);
    });
    return () => { mounted = false; };
  }, [activeChannel, viewingVoice]);

  async function handleEditServer() {
    setEditModalOpen(true);
  }

  async function handleDeleteServer() {
    setDeleteModalOpen(true);
  }

  async function handleLeaveServer() {
    try {
      await communitiesApi.leave(serverId);
      window.location.href = '/servidores';
    } catch (err) {
      console.error('Failed to leave server:', err);
    }
  }

  async function handleEditComplete() {
    setEditModalOpen(false);
    // Refresh community data
    try {
      const data = await communitiesApi.findById(serverId);
      setCommunity(data);
    } catch (err) {
      console.error('Failed to refresh community:', err);
    }
  }

  async function handleDeleteComplete() {
    setDeleteModalOpen(false);
    window.location.href = '/servidores';
  }

  async function handleCreateChannel() {
    const name = channelName.trim();
    if (!name || !channelDialog) return;
    try {
      const ch = await channelsApi.create({
        communityId: serverId,
        name,
        type: channelDialog.type === 'text' ? 'TEXT' : 'VOICE',
        isPrivate: channelPrivate,
      });
      if (channelDialog.type === 'text') {
        setTextChannels((cur) => [...cur, ch]);
      } else {
        setVoiceChannels((cur) => [...cur, ch]);
      }
      setChannelName('');
      setChannelPrivate(false);
      setChannelDialog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel');
    }
  }

  function voiceUsers(_channelId: string): { name: string; initials: string; self?: boolean; muted?: boolean; deafened?: boolean }[] {
    return [];
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text && pendingMedia.length === 0) return;
    if (!activeChannel) return;
    try {
      const attachments = pendingMedia.length
        ? pendingMedia.map((m) => ({ kind: m.kind, url: m.url }))
        : undefined;
      const msg = await messagesApi.create({
        channelId: activeChannel,
        content: text,
        attachments,
        replyToId: replyTo?.id ?? undefined,
      });
      setMessages((cur) => [...cur, msg]);
      setDraft('');
      setPendingMedia([]);
      setReplyTo(null);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  async function addMessagePhoto(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const { url } = await uploadImage(file);
      setPendingMedia((current) => [...current, { kind: 'image', url }]);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }

  function handleMessageGifSelect(gif: GifResult) {
    setPendingMedia((current) => [...current, { kind: 'gif', url: gif.gifUrl }]);
  }

  function openMenu(msg: Message, x: number, y: number) {
    setMenu({ msg, x, y });
  }

  const canEdit = useCallback((msg: Message): boolean => {
    const now = Date.now();
    return (
      msg.authorId === user?.id &&
      new Date(msg.createdAt).getTime() + 3 * 60 * 1000 > now
    );
  }, [user?.id]);

  function startReply(msg: Message) {
    setReplyTo(msg);
    setMenu(null);
  }

  function startForward(msg: Message) {
    setDraft((d) => (d ? `${d}\n> ${msg.author?.displayName ?? msg.author?.username}: ${msg.content}` : `> ${msg.author?.displayName ?? msg.author?.username}: ${msg.content}`));
    setMenu(null);
  }

  function startEdit(msg: Message) {
    setEditing({ id: msg.id, text: msg.content });
    setMenu(null);
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const updated = await messagesApi.update(editing.id, editing.text.trim());
      setMessages((cur) => cur.map((m) => (m.id === updated.id ? updated : m)));
      setEditing(null);
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
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

  function openCreateChannel(type: 'text' | 'voice') {
    setChannelName('');
    setChannelDialog({ type });
  }

  const channelLabel = activeChannel
    ? resolveChannelName(textChannels.find((c) => c.id === activeChannel) ?? { id: activeChannel }, t)
    : '';

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <div className="text-fg-subtle">{t('common.loading')}</div>
      </div>
    );
  }

  if (error && !community) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <div className="text-center">
          <p className="text-fg-muted">{t('communities.notFound')}</p>
          <Link href="/servidores" className="mt-2 text-sm text-brand hover:underline">
            {t('communities.back')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* ---- Rail de canais ---- */}
      <aside className="hidden w-80 shrink-0 flex-col border-r border-border bg-[#15171c] lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-hover text-xs font-bold text-[#090909]">
            {serverName.slice(0, 2).toUpperCase()}
          </span>
          <Link href="/servidores" className="truncate text-sm font-semibold text-fg hover:text-brand">
            {serverName}
          </Link>
          <ServerHeaderTrigger
            server={community}
            currentUserId={user?.id}
            onEdit={handleEditServer}
            onDelete={handleDeleteServer}
            onManageMembers={() => {}}
            onSettings={handleLeaveServer}
          />
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-3">
          <div>
            <div className="mb-1 flex items-center justify-between px-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                {t('server.channels.text')}
              </p>
              <button type="button" onClick={() => openCreateChannel('text')} className="rounded p-0.5 text-fg-subtle transition-colors hover:text-fg" aria-label={t('server.channels.create')}>
                <Plus size={12} />
              </button>
            </div>
            {textChannels.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveChannel(c.id);
                  setViewingVoice(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  activeChannel === c.id
                    ? 'bg-raised text-fg'
                    : 'text-fg-muted hover:bg-raised hover:text-fg'
                }`}
              >
                <Hash size={16} className="shrink-0" />
                <span className="truncate">{c.name}</span>
                {c.isPrivate && <span className="ml-auto shrink-0 text-[9px] font-semibold uppercase tracking-wide text-fg-subtle">privado</span>}
              </button>
            ))}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between px-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                {t('server.channels.voice')}
              </p>
              <button type="button" onClick={() => openCreateChannel('voice')} className="rounded p-0.5 text-fg-subtle transition-colors hover:text-fg" aria-label={t('server.channels.create')}>
                <Plus size={12} />
              </button>
            </div>
            {voiceChannels.map((c) => {
              const isConnected = connectedVoice === c.id;
              return (
                <div key={c.id} className="mb-2">
                  <div
                    className={`rounded-lg border p-2 transition-colors ${
                      isConnected
                        ? 'border-brand/50 bg-brand-dim'
                        : 'border-border bg-[#101216] hover:bg-raised'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceChannelOpen({ channelId: c.id, channelName: c.name });
                      }}
                      className="flex w-full items-center gap-2 px-1 py-1 text-left"
                    >
                      <Volume2 size={16} className="shrink-0 text-brand" />
                      <span className="flex-1 truncate text-sm font-medium text-fg">{c.name}</span>
                      {c.isPrivate && <Lock size={12} className="shrink-0 text-fg-subtle" />}
                      {isConnected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[9px] font-semibold text-[#090909]">●</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ---- Área principal ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-4">
          {viewingVoice ? (
            <Volume2 size={18} className="text-fg-muted" />
          ) : (
            <Hash size={18} className="text-fg-muted" />
          )}
          <h1 className="text-sm font-semibold text-fg">
            {viewingVoice
              ? resolveChannelName(voiceChannels.find((c) => c.id === activeChannel) ?? { id: activeChannel ?? '' }, t)
              : channelLabel}
          </h1>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {viewingVoice ? (
            <div className="flex min-h-full items-center justify-center p-6">
              <div
                className={`grid w-full max-w-5xl gap-3 ${
                  voiceUsers(activeChannel ?? '').length <= 1
                    ? 'grid-cols-1'
                    : voiceUsers(activeChannel ?? '').length <= 4
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
                }`}
              >
                {voiceUsers(activeChannel ?? '').map((u) => (
                  <div
                    key={u.name}
                    className="relative aspect-video overflow-hidden rounded-xl bg-[#15171c]"
                  >
                    <div className="flex h-full w-full flex-col items-center justify-center">
                      <button
                        type="button"
                        onClick={() => openProfile(u.self ? 'me' : u.name)}
                        className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold transition-transform hover:scale-105 ${
                          u.self ? 'bg-brand text-[#090909]' : 'bg-raised text-brand'
                        }`}
                      >
                        {u.initials}
                      </button>
                    </div>

                    {(u.muted || u.deafened) && (
                      <div className="absolute left-2 top-2 flex gap-1">
                        {u.muted && (
                          <div className="rounded-md bg-base/60 p-1.5 text-danger">
                            <MicOff size={14} />
                          </div>
                        )}
                        {u.deafened && (
                          <div className="rounded-md bg-base/60 p-1.5 text-danger">
                            <HeadphoneOff size={14} />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="absolute bottom-2 right-2 rounded-md bg-base/60 px-2 py-1 text-xs font-medium text-fg">
                      {u.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="group flex gap-2"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openMenu(msg, e.clientX, e.clientY);
                    }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-raised text-xs font-semibold text-brand">
                      {initials(msg.author?.displayName ?? msg.author?.username ?? '?')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <button
                          type="button"
                          onClick={() => openProfile(msg.author?.username ?? '')}
                          className="text-sm font-medium text-fg hover:text-brand"
                        >
                          {msg.author?.displayName ?? msg.author?.username}
                        </button>
                        <span className="text-[10px] text-fg-subtle">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {msg.replyTo && (
                        <div className="mb-0.5 truncate border-l-2 border-border-strong pl-2 text-xs text-fg-subtle">
                          <span className="font-medium text-fg-muted">{(msg.replyTo.content ?? '').slice(0, 30)}</span>
                        </div>
                      )}
                      {editing?.id === msg.id ? (
                        <div className="space-y-1.5">
                          <textarea
                            value={editing.text}
                            onChange={(e) => setEditing({ id: msg.id, text: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void saveEdit();
                              }
                              if (e.key === 'Escape') setEditing(null);
                            }}
                            autoFocus
                            className="w-full resize-none rounded-md border border-border bg-[#101216] px-2 py-1.5 text-sm text-fg outline-none focus:border-brand"
                          />
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => void saveEdit()}
                              className="font-medium text-brand hover:text-brand-hover"
                            >
                              {t('server.msg.save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                              className="text-fg-subtle hover:text-fg"
                            >
                              {t('server.msg.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="font-chat whitespace-pre-wrap break-words text-sm text-fg-muted">
                          <MarkdownText text={msg.content} />
                        </div>
                      )}
                      {msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                        <div
                          className={`mt-1 grid gap-1 overflow-hidden rounded-md ${
                            msg.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                          }`}
                        >
                          {(msg.attachments as { kind: string; url: string }[]).map((m, i) =>
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
                  {`#${channelLabel} — ${t('feed.composer')}`}
                </p>
              )}
            </div>
          )}
        </div>

        {!viewingVoice && (
          <div className="shrink-0 space-y-2 border-t border-border bg-surface p-3">
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
                  {t('server.msg.replyingTo').replace('{author}', replyTo.author?.displayName ?? replyTo.author?.username ?? '')}
                </span>
                <button type="button" onClick={() => setReplyTo(null)} className="ml-auto text-fg-subtle hover:text-fg">
                  <X size={12} />
                </button>
              </div>
            )}
            <form onSubmit={sendMessage} className="flex items-end gap-2">
              <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-border bg-[#101216] px-2 py-1.5">
                <input
                  type="file"
                  accept="image/*"
                  ref={messageFileInputRef}
                  onChange={(e) => void addMessagePhoto(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => messageFileInputRef.current?.click()}
                  className="shrink-0 text-fg-subtle hover:text-fg"
                  aria-label={t('feed.attach.image')}
                >
                  <ImageIcon size={18} />
                </button>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('server.sendMessage').replace('{channel}', channelLabel)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
                />
                <button
                  type="button"
                  onClick={() => setGifPickerOpen(true)}
                  className="shrink-0 text-fg-subtle hover:text-fg"
                  aria-label="GIF"
                >
                  <Smile size={18} />
                </button>
              </div>
              <Button type="submit" disabled={!draft.trim() && pendingMedia.length === 0}>
                <Send size={16} />
              </Button>
            </form>
          </div>
        )}

        {viewingVoice && (
          <div className="shrink-0 border-t border-border bg-surface p-3">
            <div className="mx-auto flex max-w-3xl items-center justify-between rounded-lg bg-[#101216] px-4 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Volume2 size={16} className="text-brand" />
                <span className="font-medium text-fg">
                  {resolveChannelName(voiceChannels.find((c) => c.id === activeChannel) ?? { id: activeChannel ?? '' }, t)}
                </span>
                <span className="text-fg-subtle">— {serverName}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={`rounded-md p-1.5 ${muted ? 'text-danger' : 'text-fg-subtle hover:text-fg'}`}
                  title={t('server.voice.mute')}
                >
                  <MicOff size={16} />
                </button>
                <button
                  type="button"
                  className={`rounded-md p-1.5 ${deafened ? 'text-danger' : 'text-fg-subtle hover:text-fg'}`}
                  title={t('server.voice.deafen')}
                >
                  <HeadphoneOff size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewingVoice(false)}
                  className="rounded-md p-1.5 text-danger hover:text-danger/80"
                  title={t('server.voice.disconnect')}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      {channelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-fg">{t('server.channels.create')}</h2>
            <p className="mt-1 text-sm text-fg-muted">
              {channelDialog.type === 'text' ? t('server.channels.createText.desc') : t('server.channels.createVoice.desc')}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm text-fg">{t('server.channels.name')}</label>
                <Input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder={t('server.channels.namePlaceholder')}
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={channelPrivate}
                  onChange={(e) => setChannelPrivate(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-raised text-brand"
                />
                <label className="text-sm text-fg">{t('server.channels.private')}</label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setChannelDialog(null)}>
                {t('server.channels.cancel')}
              </Button>
              <Button onClick={() => void handleCreateChannel()}>
                {t('server.channels.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Gif Picker */}
      {gifPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80" onClick={() => setGifPickerOpen(false)}>
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <GifPicker
              open={true}
              onSelect={(gif) => {
                handleMessageGifSelect(gif);
                setGifPickerOpen(false);
              }}
              onClose={() => setGifPickerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Voice Channel Modal */}
      {voiceChannelOpen && (
        <VoiceChannel
          serverId={serverId}
          channelId={voiceChannelOpen.channelId}
          channelName={voiceChannelOpen.channelName}
          onClose={() => setVoiceChannelOpen(null)}
        />
      )}

      {/* Edit Server Modal */}
      <EditServerModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        server={community}
        onUpdate={handleEditComplete}
      />

      {/* Delete Server Modal */}
      <DeleteServerModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        server={community}
        onConfirm={handleDeleteComplete}
      />

      {/* Context Menu */}
      {menu && (
        <div
          className="fixed z-50 rounded-md border border-border bg-surface py-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            onClick={() => startReply(menu.msg)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-fg hover:bg-raised"
          >
            {t('server.msg.reply')}
          </button>
          <button
            type="button"
            onClick={() => startForward(menu.msg)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-fg hover:bg-raised"
          >
            {t('server.msg.forward')}
          </button>
          {canEdit(menu.msg) && (
            <button
              type="button"
              onClick={() => startEdit(menu.msg)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-fg hover:bg-raised"
            >
              {t('server.msg.edit')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
