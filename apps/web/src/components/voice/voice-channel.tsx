'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  Video,
  VideoOff,
  ScreenShare,
  Settings,
  Users,
  Volume2,
  VolumeX,
  UserRound,
  Activity,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoice } from '@/voice/provider';
import { useAuth } from '@/auth/provider';
import { useI18n } from '@/i18n/provider';
import { apiFetch, type VoiceParticipant } from '@/lib/api';
import { cn } from '@/lib/utils';

interface VoiceChannelProps {
  serverId: string;
  channelId: string;
  channelName: string;
  onClose?: () => void;
}

export function VoiceChannel({ serverId, channelId, channelName, onClose }: VoiceChannelProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const {
    connection,
    muted,
    deafened,
    noVideo,
    sharing,
    speakingUsers,
    connecting,
    error,
    connect,
    disconnect,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleShare,
  } = useVoice();

  const [participantResult, setParticipantResult] = useState<{
    serverId: string;
    channelId: string;
    connection: typeof connection;
    participants: VoiceParticipant[];
    error: string | null;
  } | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isConnected = connection?.channelId === channelId && connection?.serverId === serverId;
  const isConnecting = connecting && !isConnected;

  const currentResult = isConnected && participantResult?.connection === connection
    && participantResult.serverId === serverId && participantResult.channelId === channelId ? participantResult : null;
  const participants = currentResult?.participants ?? [];
  const participantsError = currentResult?.error;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    if (!isConnected) return;
    const fetchParticipants = async () => {
      try {
        const data = await apiFetch<{ participants: VoiceParticipant[] }>(
          `/voice/participants/${encodeURIComponent(serverId)}/${encodeURIComponent(channelId)}`,
        );
        if (!cancelled) {
          setParticipantResult({ serverId, channelId, connection, participants: data.participants, error: null });
        }
      } catch {
        if (!cancelled) {
          setParticipantResult({ serverId, channelId, connection, participants: [], error: 'Não foi possível carregar participantes' });
        }
      } finally {
        if (!cancelled) timer = setTimeout(fetchParticipants, 5000);
      }
    };
    void fetchParticipants();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isConnected, serverId, channelId]);

  const handleConnect = async () => {
    try {
      await connect({
        serverId,
        serverName: '', // Will be filled from context
        channelId,
        label: channelName,
      });
    } catch (err) {
      console.error('Connect failed:', err);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    onClose?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showSettings) setShowSettings(false);
      else if (showParticipants) setShowParticipants(false);
      else handleDisconnect();
    }
  };

  // Speaking indicator animation
  const localSpeaking = isConnected && !muted && !deafened && speakingUsers.some((speaker) => speaker.userId === user?.id);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-[#090909]/98 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={t('server.voice.channel')}
    >
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDisconnect}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-fg-muted hover:bg-raised hover:text-fg transition-colors"
            aria-label={t('server.voice.disconnect')}
          >
            <X size={20} />
          </button>
          <div>
            <p className="font-medium text-fg truncate max-w-[200px]">{channelName}</p>
            <p className="text-xs text-fg-subtle flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {t('server.voice.connected')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Participants toggle */}
          <button
            type="button"
            onClick={() => setShowParticipants(!showParticipants)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors bg-raised text-fg hover:bg-raised/80"
            aria-expanded={showParticipants}
            aria-label={t('server.voice.participants')}
          >
            <Users size={16} />
            <span>{participants.length}</span>
          </button>

          {/* Settings toggle */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-fg-muted hover:bg-raised hover:text-fg transition-colors"
            aria-expanded={showSettings}
            aria-label={t('server.voice.settings')}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Voice Grid - Center */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <AnimatePresence mode="wait">
            {isConnected ? (
              <motion.div
                key="connected"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-6 w-full max-w-md"
              >
                {/* Voice Visualizer */}
                <VoiceVisualizer
                  speaking={localSpeaking}
                  speakingUsers={speakingUsers}
                  muted={muted}
                  deafened={deafened}
                />

                {/* Connection Info */}
                <div className="text-center">
                  <p className="text-sm text-fg-subtle">{t('server.voice.voiceActivity')}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full transition-colors',
                        muted || deafened ? 'bg-warning' : localSpeaking ? 'bg-brand' : 'bg-border'
                      )}
                    />
                    <span className="text-sm font-mono text-fg-subtle">
                      {muted ? t('server.voice.muted') : deafened ? t('server.voice.deafened') : localSpeaking ? '🔴 AO VIVO' : '—'}
                    </span>
                  </div>
                </div>

                {error && <p className="text-sm text-danger" role="alert">{error}</p>}
                {/* Controls */}
                <VoiceControls
                  muted={muted}
                  deafened={deafened}
                  noVideo={noVideo}
                  sharing={sharing}
                  onToggleMute={toggleMute}
                  onToggleDeafen={toggleDeafen}
                  onToggleVideo={toggleVideo}
                  onToggleShare={toggleShare}
                  onDisconnect={handleDisconnect}
                />
              </motion.div>
            ) : (
              <motion.div
                key="disconnected"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-6 text-center"
              >
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-brand/10">
                  <Volume2 size={40} className="text-brand" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-fg">{t('server.voice.joinChannel')}</h2>
                  <p className="text-sm text-fg-subtle mt-1">{channelName}</p>
                </div>
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="mt-4 inline-flex h-12 w-48 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-base font-semibold text-[#090909] hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#090909]/30 border-t-[#090909]" />
                      {t('common.connecting')}
                    </>
                  ) : (
                    t('server.voice.join')
                  )}
                </button>
                {error && (
                  <p className="text-sm text-danger" role="alert">
                    {error}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Participants Panel - Right */}
        <AnimatePresence>
          {showParticipants && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-72 border-l border-border bg-[#0a0c10] flex flex-col"
            >
              <div className="flex h-12 items-center justify-between border-b border-border px-4">
                <h3 className="font-medium text-fg">{t('server.voice.participants')}</h3>
                <button
                  type="button"
                  onClick={() => setShowParticipants(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-raised hover:text-fg transition-colors"
                  aria-label={t('common.close')}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {participantsError && (
                <p className="text-sm text-danger" role="alert">{participantsError}</p>
              )}
                <ul className="space-y-2" role="list">
                  {participants.map((p) => (
                    <ParticipantItem
                      key={p.id}
                      participant={p}
                      isSpeaking={speakingUsers.some((s) => s.userId === p.id)}
                      isLocal={p.id === user?.id}
                      t={t as (key: string, ...args: unknown[]) => string}
                    />
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Panel - Bottom Sheet */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="border-t border-border bg-[#0a0c10] p-4"
          >
            <div className="space-y-6">
              {/* Advanced Settings */}
              <div>
                <h4 className="text-sm font-medium text-fg-subtle mb-3">{t('server.voice.advanced')}</h4>
                <div className="space-y-3">
                  <SettingsRow
                    label={t('server.voice.noiseSuppression')}
                    description={t('server.voice.noiseSuppressionDesc')}
                    Icon={Activity}
                  />
                  <SettingsRow
                    label={t('server.voice.echoCancellation')}
                    description={t('server.voice.echoCancellationDesc')}
                    Icon={VolumeX}
                  />
                  <SettingsRow
                    label={t('server.voice.autoGainControl')}
                    description={t('server.voice.autoGainControlDesc')}
                    Icon={Volume2}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SpeakingUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  speaking: boolean;
}

function VoiceVisualizer({
  speaking,
  speakingUsers,
  muted,
  deafened,
}: {
  speaking: boolean;
  speakingUsers: SpeakingUser[];
  muted: boolean;
  deafened: boolean;
}) {
  const ringCount = 3;

  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      {/* Outer rings for speaking animation */}
      {speaking && !muted && !deafened && (
        <>
          {[...Array(ringCount)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{
                duration: 1.5,
                delay: i * 0.2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className="absolute inset-0 rounded-full border-2 border-brand/60"
            />
          ))}
        </>
      )}

      {/* Main avatar ring */}
      <div
        className={cn(
          'relative flex h-36 w-36 items-center justify-center rounded-full border-4 transition-all duration-300',
          muted || deafened
            ? 'border-warning bg-warning/10'
            : speaking
              ? 'border-brand bg-brand/10 shadow-[0_0_30px_rgba(88,166,255,0.4)]'
              : 'border-border bg-raised'
        )}
      >
        <UserRound size={48} className={cn('text-fg', muted || deafened ? 'text-warning' : speaking ? 'text-brand' : 'text-fg-muted')} />
      </div>

      {/* Speaking indicators for other participants */}
      <div className="absolute inset-0" aria-hidden="true">
        {speakingUsers.slice(0, 4).map((user, i) => {
          const angle = (i / Math.max(1, speakingUsers.length)) * Math.PI * 2;
          const radius = 80;
          const x = Math.cos(angle) * radius + 96; // center at 96 (half of 192)
          const y = Math.sin(angle) * radius + 96;
          return (
            <motion.div
              key={user.userId}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand bg-brand/10 shadow-[0_0_15px_rgba(88,166,255,0.5)]"
              style={{ left: x - 8, top: y - 8, transformOrigin: 'center' }}
            >
              <UserRound size={20} className="text-brand" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function VoiceControls({
  muted,
  deafened,
  noVideo,
  sharing,
  onToggleMute,
  onToggleDeafen,
  onToggleVideo,
  onToggleShare,
  onDisconnect,
}: {
  muted: boolean;
  deafened: boolean;
  noVideo: boolean;
  sharing: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleVideo: () => void;
  onToggleShare: () => void;
  onDisconnect: () => void;
}) {
  const buttons: Array<{
    active: boolean;
    onClick: () => void;
    Icon: React.ComponentType<{ size?: number }>;
    label: string;
    shortcut: string;
    danger?: boolean;
    size?: 'md' | 'lg';
  }> = [
    {
      active: muted,
      onClick: onToggleMute,
      Icon: muted ? MicOff : Mic,
      label: muted ? 'Unmute' : 'Mute',
      shortcut: 'M',
      danger: muted,
    },
    {
      active: deafened,
      onClick: onToggleDeafen,
      Icon: deafened ? HeadphoneOff : Headphones,
      label: deafened ? 'Undeafen' : 'Deafen',
      shortcut: 'D',
      danger: deafened,
    },
    {
      active: noVideo,
      onClick: onToggleVideo,
      Icon: noVideo ? VideoOff : Video,
      label: noVideo ? 'Video On' : 'Video Off',
      shortcut: 'V',
    },
    {
      active: sharing,
      onClick: onToggleShare,
      Icon: ScreenShare,
      label: sharing ? 'Stop Share' : 'Share Screen',
      shortcut: 'S',
    },
    {
      active: false,
      onClick: onDisconnect,
      Icon: X,
      label: 'Disconnect',
      shortcut: 'Esc',
      danger: true,
      size: 'lg',
    },
  ];

  return (
    <div className="flex items-center justify-center gap-3 w-full max-w-md px-4">
      {buttons.map((btn, i) => (
        <VoiceControlButton
          key={i}
          active={btn.active}
          onClick={btn.onClick}
          Icon={btn.Icon}
          label={btn.label}
          shortcut={btn.shortcut}
          danger={btn.danger}
          size={btn.size}
        />
      ))}
    </div>
  );
}

function VoiceControlButton({
  active,
  onClick,
  Icon,
  label,
  shortcut,
  danger = false,
  size = 'md',
}: {
  active: boolean;
  onClick: () => void;
  Icon: React.ComponentType<{ size?: number }>;
  label: string;
  shortcut: string;
  danger?: boolean;
  size?: 'md' | 'lg';
}) {
  const sizeClasses = size === 'lg' ? 'h-16 w-16 text-2xl' : 'h-12 w-12 text-xl';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center gap-1.5',
        sizeClasses,
        'rounded-xl transition-all duration-200',
        active
          ? danger
            ? 'bg-danger/20 text-danger shadow-[0_0_20px_rgba(255,68,68,0.3)]'
            : 'bg-brand/20 text-brand shadow-[0_0_20px_rgba(88,166,255,0.3)]'
          : 'bg-raised text-fg hover:bg-raised/80',
        danger && !active && 'hover:bg-danger/10 hover:text-danger'
      )}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon size={size === 'lg' ? 28 : 24} />
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
        {shortcut}
      </span>
      {/* Active indicator ring */}
      {active && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2"
          style={{ borderColor: danger ? 'rgb(255,68,68)' : 'rgb(88,166,255)' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.8, 0.3, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </button>
  );
}

function ParticipantItem({
  participant,
  isSpeaking,
  isLocal,
  t,
}: {
  participant: { id: string; name: string; avatarUrl: string | null; speaking: boolean };
  isSpeaking: boolean;
  isLocal: boolean;
  t: (key: string, ...args: unknown[]) => string;
}) {
  return (
    <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-raised transition-colors group">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/20">
        {participant.avatarUrl ? (
          <img src={participant.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-brand">
            {participant.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        {/* Speaking ring */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{ scale: 1.2, opacity: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border-2 border-brand"
            />
          )}
        </AnimatePresence>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg truncate">{participant.name}</p>
        {isLocal && (
          <p className="text-xs text-fg-subtle">({t('common.you')})</p>
        )}
      </div>
      {isSpeaking && (
        <div className="flex items-center gap-1 text-brand">
          <Activity size={14} className="animate-pulse" />
          <span className="text-xs font-medium">LIVE</span>
        </div>
      )}
    </li>
  );
}

function SettingsRow({
  label,
  description,
  Icon,
}: {
  label: string;
  description: string;
  Icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-raised text-fg-subtle">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="text-xs text-fg-subtle">{description}</p>
      </div>
      <label className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-border transition-colors cursor-pointer">
        <input type="checkbox" className="sr-only" defaultChecked />
        <span className="absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform" />
      </label>
    </div>
  );
}