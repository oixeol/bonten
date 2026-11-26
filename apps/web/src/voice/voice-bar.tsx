'use client';

import {
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  PhoneOff,
  Settings,
  Video,
  VideoOff,
  ScreenShare,
  Signal,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { useVoice } from './provider';

function VoiceBtn({
  active,
  onClick,
  label,
  danger = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const tone = danger
    ? 'text-danger hover:bg-danger/10'
    : active
      ? 'bg-raised text-fg'
      : 'text-fg-muted hover:bg-raised hover:text-fg';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${tone}`}
    >
      {children}
    </button>
  );
}

/**
 * Barra de voz fixa (rodapé). Visível em qualquer rota enquanto conectado.
 * Nome do canal à esquerda, ícones ao centro, ping à direita.
 */
export function VoiceBar() {
  const { t } = useI18n();
  const {
    connection,
    muted,
    deafened,
    noVideo,
    sharing,
    speakingUsers,
    disconnect,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleShare,
  } = useVoice();

  if (!connection) return null;

  // Check if current user is speaking
  const isSpeaking = speakingUsers.length > 0; // Simplified - in real app, check for current user

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-t border-border bg-[#101216] px-4">
      <div className="flex flex-1 items-center gap-1.5 text-xs text-success">
        <span className={`h-2 w-2 rounded-full ${muted ? 'bg-warning' : deafened ? 'bg-danger' : 'bg-success'}`} />
        <span className="truncate font-medium">{connection.label}</span>
        {isSpeaking && <span className="text-[10px] font-semibold bg-brand/20 text-brand px-1.5 rounded">LIVE</span>}
      </div>
      <div className="flex items-center gap-1">
        <VoiceBtn active={muted} onClick={toggleMute} label={t('server.voice.mute')}>
          {muted ? <MicOff size={16} /> : <Mic size={16} />}
        </VoiceBtn>
        <VoiceBtn active={deafened} onClick={toggleDeafen} label={t('server.voice.deafen')}>
          {deafened ? <HeadphoneOff size={16} /> : <Headphones size={16} />}
        </VoiceBtn>
        <VoiceBtn active={noVideo} onClick={toggleVideo} label={t('server.voice.noVideo')}>
          {noVideo ? <VideoOff size={16} /> : <Video size={16} />}
        </VoiceBtn>
        <VoiceBtn active={sharing} onClick={toggleShare} label={t('server.voice.shareScreen')}>
          <ScreenShare size={16} />
        </VoiceBtn>
        <VoiceBtn active={false} onClick={disconnect} label={t('server.voice.disconnect')} danger>
          <PhoneOff size={16} />
        </VoiceBtn>
        <VoiceBtn active={false} onClick={() => {}} label={t('server.voice.settings')}>
          <Settings size={16} />
        </VoiceBtn>
      </div>
      <div className="flex flex-1 items-center justify-end gap-1.5 text-xs text-fg-subtle">
        <Signal size={14} className="text-success" />
        <span className="font-medium">{t('server.voice.ping').replace('{ms}', '32')}</span>
      </div>
    </div>
  );
}