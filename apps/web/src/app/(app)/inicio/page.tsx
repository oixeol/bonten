'use client';

import { useRef, useState, type FormEvent } from 'react';
import {
  Image as ImageIcon,
  Film,
  Send,
  Heart,
  MessageCircle,
  Share2,
  Repeat2,
  Bookmark,
  Languages,
  Reply,
  X,
  Smile,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { useAuth } from '@/auth/provider';
import { useProfile } from '@/profile/provider';
import type { MessageKey } from '@/i18n/messages';
import { Card, CardBody } from '@/components/ui/card';
import { HomeSidebar } from '@/components/home/home-sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GifPicker } from '@/components/feed/gif-picker';
import { uploadImage } from '@/lib/uploads';
import { MarkdownText } from '@/profile/markdown-text';
import type { GifResult } from '@/lib/gifs';

type MediaKind = 'image' | 'gif' | 'video';

interface Media {
  kind: MediaKind;
  url: string;
}

interface Comment {
  id: string;
  author: string;
  initials: string;
  text: string;
  parentId?: string;
  media?: Media[];
}

type PostLang = 'pt-BR' | 'en' | 'es';

interface Post {
  id: string;
  author: string;
  initials: string;
  when: string;
  game?: string;
  lang: PostLang;
  translations?: Partial<Record<PostLang, string>>;
  text: string;
  media?: Media[];
  liked: boolean;
  likeCount: number;
  reposted: boolean;
  repostCount: number;
  saved: boolean;
  comments: Comment[];
}

/* Dados de exemplo (placeholder) até o backend de feed (Fase 6). */
const SAMPLE_POSTS: Post[] = [
  {
    id: 'p1',
    author: 'nyx',
    initials: 'NY',
    when: 'há 12 min',
    game: 'Valorant',
    lang: 'pt-BR',
    text: 'Subi pro Imortal 3 hoje. Alguém pra fila?',
    translations: {
      en: 'Reached Immortal 3 today. Anyone up for a queue?',
    },
    liked: false,
    likeCount: 24,
    reposted: false,
    repostCount: 3,
    saved: false,
    comments: [
      { id: 'c1', author: 'k1ng', initials: 'K1', text: 'gg! bora' },
      { id: 'c2', author: 'vortex', initials: 'VX', text: 'qual servidor?', parentId: 'c1' },
    ],
  },
  {
    id: 'p2',
    author: 'k1ng',
    initials: 'K1',
    when: 'há 1 h',
    game: 'Rocket League',
    lang: 'en',
    text: 'Clutch at the end of the game. Clip in my profile.',
    translations: {
      'pt-BR': 'Clutch no fim de jogo. Corte no meu perfil.',
    },
    liked: true,
    likeCount: 57,
    reposted: false,
    repostCount: 11,
    saved: false,
    comments: [],
  },
  {
    id: 'p3',
    author: 'luna',
    initials: 'LU',
    when: 'há 2 h',
    game: 'CS2',
    lang: 'es',
    text: 'GG! Subimos de rango anoche, ¿alguien para jugar hoy?',
    translations: {
      'pt-BR': 'GG! Subimos de rank ontem à noite, alguém pra jogar hoje?',
      en: 'GG! We ranked up last night, anyone to play today?',
    },
    liked: false,
    likeCount: 18,
    reposted: false,
    repostCount: 2,
    saved: false,
    comments: [],
  },
];

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function isGif(file: File): boolean {
  return file.type === 'image/gif';
}

export default function InicioPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { openProfile } = useProfile();
  const [draft, setDraft] = useState('');
  const [pendingMedia, setPendingMedia] = useState<Media[]>([]);
  const [posts, setPosts] = useState<Post[]>(SAMPLE_POSTS);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: Media[] = [];
    Array.from(files).forEach((file) => {
      const kind: MediaKind = file.type.startsWith('video/')
        ? 'video'
        : isGif(file)
          ? 'gif'
          : 'image';
      next.push({ kind, url: URL.createObjectURL(file) });
    });
    setPendingMedia((current) => [...current, ...next]);
  }

  function handleGifSelect(gif: GifResult) {
    const media: Media = {
      kind: 'gif',
      url: gif.gifUrl,
    };
    setPendingMedia((current) => [...current, media]);
  }

  function handlePublish(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text && pendingMedia.length === 0) return;
    setPosts((current) => [
      {
        id: `local-${Date.now()}`,
        author: user?.username ?? 'player',
        initials: initials(user?.displayName ?? 'Player'),
        when: 'agora',
        lang: locale,
        text,
        media: pendingMedia.length ? pendingMedia : undefined,
        liked: false,
        likeCount: 0,
        reposted: false,
        repostCount: 0,
        saved: false,
        comments: [],
      },
      ...current,
    ]);
    setDraft('');
    setPendingMedia([]);
  }

  function toggleLike(id: string) {
    setPosts((current) =>
      current.map((p) =>
        p.id === id
          ? {
              ...p,
              liked: !p.liked,
              likeCount: p.likeCount + (p.liked ? -1 : 1),
            }
          : p,
      ),
    );
  }

  function toggleRepost(id: string) {
    setPosts((current) =>
      current.map((p) =>
        p.id === id
          ? {
              ...p,
              reposted: !p.reposted,
              repostCount: p.repostCount + (p.reposted ? -1 : 1),
            }
          : p,
      ),
    );
  }

  function toggleSave(id: string) {
    setPosts((current) =>
      current.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)),
    );
  }

  function addComment(
    id: string,
    text: string,
    parentId?: string,
    media?: Media[],
  ) {
    const clean = text.trim();
    if (!clean && (!media || media.length === 0)) return;
    setPosts((current) =>
      current.map((p) =>
        p.id === id
          ? {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: `c-${Date.now()}`,
                  author: user?.username ?? 'player',
                  initials: initials(user?.displayName ?? 'Player'),
                  text: clean,
                  parentId,
                  media: media && media.length > 0 ? media : undefined,
                },
              ],
            }
          : p,
      ),
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-5">
      <div className="min-w-0 flex-1 max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-fg">{t('feed.title')}</h1>

      {/* Compositor */}
      <Card className="mb-5">
        <CardBody>
          <form onSubmit={handlePublish} className="space-y-3">
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => openProfile('me')}
                className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-[#090909]"
                aria-label={t('profile.title')}
              >
                {initials(user?.displayName ?? 'Player')}
              </button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('feed.composer')}
                aria-label={t('feed.composer')}
                rows={2}
                className="min-h-[2.5rem] w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              />
            </div>

            {pendingMedia.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingMedia.map((m, i) => (
                  <div
                    key={i}
                    className="relative h-20 w-20 overflow-hidden rounded-md border border-border bg-raised"
                  >
                    <MediaThumb media={m} />
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

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*,video/*,.gif"
                  multiple
                  hidden
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                  aria-label={t('feed.attach')}
                >
                  <ImageIcon size={16} />
                  <span className="hidden sm:inline">{t('feed.attach.image')}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                  aria-label={t('feed.attach.video')}
                >
                  <Film size={16} />
                  <span className="hidden sm:inline">{t('feed.attach.video')}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setGifPickerOpen(true)}
                  aria-label={t('feed.attach.gif')}
                >
                  <Smile size={16} />
                  <span className="hidden sm:inline">{t('feed.attach.gif')}</span>
                </Button>
              </div>
              <Button
                type="submit"
                disabled={!draft.trim() && pendingMedia.length === 0}
                aria-label={t('feed.publish')}
              >
                <Send size={16} />
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Feed */}
      {posts.length === 0 ? (
        <p className="py-10 text-center text-sm text-fg-muted">{t('feed.empty')}</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              commentsOpen={!!openComments[post.id]}
              onToggleComments={() =>
                setOpenComments((c) => ({ ...c, [post.id]: !c[post.id] }))
              }
              onLike={() => toggleLike(post.id)}
              onRepost={() => toggleRepost(post.id)}
              onSave={() => toggleSave(post.id)}
              onComment={(text, parentId, media) =>
                addComment(post.id, text, parentId, media)
              }
            />
          ))}
        </div>
      )}

      <GifPicker
        open={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        onSelect={handleGifSelect}
      />
      </div>
      <HomeSidebar />
    </div>
  );
}

function PostCard({
  post,
  commentsOpen,
  onToggleComments,
  onLike,
  onRepost,
  onSave,
  onComment,
}: {
  post: Post;
  commentsOpen: boolean;
  onToggleComments: () => void;
  onLike: () => void;
  onRepost: () => void;
  onSave: () => void;
  onComment: (text: string, parentId?: string, media?: Media[]) => void;
}) {
  const { t, locale } = useI18n();
  const { openProfile } = useProfile();
  const [comment, setComment] = useState('');
  const [shared, setShared] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [commentMedia, setCommentMedia] = useState<Media[]>([]);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const commentFileInput = useRef<HTMLInputElement>(null);

  // Auto-tradução: só traduz se o idioma do post != idioma do usuário e houver tradução.
  const canTranslate = post.lang !== locale && !!post.translations?.[locale];
  const displayText =
    (canTranslate && !showOriginal ? post.translations?.[locale] : post.text) ??
    post.text;

  function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim() && commentMedia.length === 0) return;
    onComment(comment, replyTo?.id, commentMedia);
    setComment('');
    setReplyTo(null);
    setCommentMedia([]);
  }

  async function addCommentPhoto(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setCommentMedia((current) => [...current, { kind: 'image', url }]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  function handleCommentGifSelect(gif: GifResult) {
    setCommentMedia((current) => [
      ...current,
      { kind: 'gif', url: gif.gifUrl },
    ]);
  }

  async function share() {
    const url = `${window.location.origin}/inicio#${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard bloqueado — ainda marca feedback */
    }
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  return (
    <Card id={post.id}>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openProfile(post.author)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-raised text-xs font-semibold text-brand transition-opacity hover:opacity-80"
            aria-label={post.author}
          >
            {post.initials}
          </button>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => openProfile(post.author)}
              className="block truncate text-sm font-medium text-fg hover:text-brand"
            >
              {post.author}
            </button>
            <p className="text-xs text-fg-subtle">
              {post.when}
              {post.game ? ` · ${post.game}` : ''}
            </p>
          </div>
        </div>

        {post.text && (
          <div className="space-y-1.5">
            {canTranslate && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                <Languages size={13} className="text-brand" />
                <span>
                  {t('feed.translatedFrom')}{' '}
                  {t(`feed.lang.${post.lang}` as MessageKey)}
                </span>
                <button
                  type="button"
                  onClick={() => setShowOriginal((v) => !v)}
                  className="font-medium text-brand hover:text-brand-hover"
                >
                  {showOriginal ? t('feed.showTranslated') : t('feed.showOriginal')}
                </button>
              </div>
            )}
            <div className="font-chat whitespace-pre-wrap break-words text-sm text-fg">
              <MarkdownText text={displayText} />
            </div>
          </div>
        )}

        {post.media && post.media.length > 0 && (
          <div
            className={`grid gap-1 overflow-hidden rounded-md ${
              post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {post.media.map((m, i) => (
              <MediaThumb key={i} media={m} full />
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-4 border-t border-border pt-2">
          <button
            type="button"
            onClick={onLike}
            aria-pressed={post.liked}
            className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
              post.liked ? 'text-danger' : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Heart size={16} fill={post.liked ? 'currentColor' : 'none'} />
            {post.likeCount}
          </button>
          <button
            type="button"
            onClick={onRepost}
            aria-pressed={post.reposted}
            title={post.reposted ? t('feed.reposted') : t('feed.repost')}
            className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
              post.reposted ? 'text-success' : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Repeat2 size={16} />
            {post.repostCount}
          </button>
          <button
            type="button"
            onClick={onSave}
            aria-pressed={post.saved}
            title={post.saved ? t('feed.saved') : t('feed.save')}
            className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
              post.saved ? 'text-brand' : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Bookmark size={16} fill={post.saved ? 'currentColor' : 'none'} />
            <span className="sr-only">
              {post.saved ? t('feed.saved') : t('feed.save')}
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleComments}
            aria-expanded={commentsOpen}
            className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            <MessageCircle size={16} />
            {post.comments.length}
          </button>
          <button
            type="button"
            onClick={() => void share()}
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            {shared ? (
              <span className="text-success">{t('feed.shared')}</span>
            ) : (
              <>
                <Share2 size={16} />
                {t('feed.share')}
              </>
            )}
          </button>
        </div>

        {commentsOpen && (
          <div className="space-y-3 border-t border-border pt-2">
            {post.comments.filter((c) => !c.parentId).length === 0 ? (
              <p className="text-xs text-fg-subtle">{t('feed.commentPlaceholder')}</p>
            ) : (
              <div className="space-y-3">
                {post.comments
                  .filter((c) => !c.parentId)
                  .map((root) => (
                    <div key={root.id} className="space-y-2">
                      <CommentRow
                        comment={root}
                        replyingTo={replyTo?.id === root.id}
                        onReply={() => setReplyTo(root)}
                        onOpenProfile={openProfile}
                      />
                      {post.comments
                        .filter((c) => c.parentId === root.id)
                        .map((reply) => (
                          <div key={reply.id} className="ml-6 border-l border-border pl-3">
                            <CommentRow
                              comment={reply}
                              replyingTo={replyTo?.id === reply.id}
                              onReply={() => setReplyTo(reply)}
                              onOpenProfile={openProfile}
                            />
                          </div>
                        ))}
                    </div>
                  ))}
              </div>
            )}

            <form onSubmit={submitComment} className="space-y-1.5 pt-1">
              {replyTo && (
                <div className="flex items-center gap-1.5 text-xs text-fg-muted">
                  <Reply size={13} className="text-brand" />
                  <span>
                    {t('feed.comment')} <span className="text-fg">@{replyTo.author}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    aria-label={t('feed.remove')}
                    className="ml-auto rounded p-0.5 hover:text-fg"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Preview de mídia do comentário */}
              {commentMedia.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {commentMedia.map((m, i) => (
                    <div
                      key={i}
                      className="relative h-16 w-16 overflow-hidden rounded-md border border-border bg-raised"
                    >
                      <MediaThumb media={m} />
                      <button
                        type="button"
                        onClick={() =>
                          setCommentMedia((current) => current.filter((_, idx) => idx !== i))
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

              <div className="flex items-center gap-2">
                <input
                  ref={commentFileInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    void addCommentPhoto(e.target.files);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => commentFileInput.current?.click()}
                  disabled={uploading}
                  aria-label={t('feed.comment.addPhoto')}
                  className="shrink-0 rounded p-1.5 text-fg-muted transition-colors hover:text-fg disabled:opacity-50"
                >
                  <ImageIcon size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setGifPickerOpen(true)}
                  aria-label={t('feed.comment.addGif')}
                  className="shrink-0 rounded p-1.5 text-fg-muted transition-colors hover:text-fg"
                >
                  <Smile size={18} />
                </button>
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={uploading ? t('feed.comment.uploading') : t('feed.commentPlaceholder')}
                  aria-label={t('feed.comment')}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={(!comment.trim() && commentMedia.length === 0) || uploading}
                  aria-label={t('feed.comment')}
                >
                  <Send size={15} />
                </Button>
              </div>
            </form>

            <GifPicker
              open={gifPickerOpen}
              onClose={() => setGifPickerOpen(false)}
              onSelect={handleCommentGifSelect}
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function CommentRow({
  comment,
  replyingTo,
  onReply,
  onOpenProfile,
}: {
  comment: Comment;
  replyingTo: boolean;
  onReply: () => void;
  onOpenProfile: (author: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        onClick={() => onOpenProfile(comment.author)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-raised text-[10px] font-semibold text-brand transition-colors hover:bg-raised/80"
      >
        {comment.initials}
      </button>
      <div className="min-w-0 rounded-md bg-raised px-3 py-1.5">
        <div className="mb-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenProfile(comment.author)}
            className="text-xs font-medium text-fg hover:text-brand"
          >
            {comment.author}
          </button>
          <button
            type="button"
            onClick={onReply}
            className={`text-xs transition-colors hover:text-fg ${
              replyingTo ? 'text-brand' : 'text-fg-subtle'
            }`}
          >
            {t('feed.comment')}
          </button>
        </div>
        {comment.text && (
          <div className="font-chat whitespace-pre-wrap break-words text-sm text-fg-muted">
            <MarkdownText text={comment.text} />
          </div>
        )}
        {comment.media && comment.media.length > 0 && (
          <div
            className={`mt-2 grid gap-1 overflow-hidden rounded-md ${
              comment.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {comment.media.map((m, i) => (
              <MediaThumb key={i} media={m} full />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaThumb({ media, full = false }: { media: Media; full?: boolean }) {
  const cls = full
    ? media.kind === 'gif'
      ? 'max-w-[320px] max-h-[320px] rounded-md object-contain'
      : 'w-full rounded-md'
    : 'h-full w-full object-cover';
  if (media.kind === 'video') {
    return (
      <video
        src={media.url}
        controls={full}
        className={cls}
        muted={!full}
        playsInline
      />
    );
  }
  // image e gif: <img> preserva animação do gif (next/image não anima otimizado)
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={media.url} alt="" className={cls} />;
}