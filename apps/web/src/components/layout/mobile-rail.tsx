'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Users, MessageSquare, Trophy, Server, Gamepad2 } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { useVoice } from '@/voice/provider';

interface MobileRailProps {
  onOpenCommandPalette: () => void;
  onOpenAddServer: () => void;
}

export function MobileRail({ onOpenCommandPalette: _onOpenCommandPalette, onOpenAddServer }: MobileRailProps) {
  const { t } = useI18n();
  const { connection } = useVoice();
  const pathname = usePathname();
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Bottom Rail */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden" role="navigation" aria-label={t('nav.mobile')}>
        <div className="flex h-16 items-center justify-between border-t border-border bg-surface/95 backdrop-blur px-2">
          <Link
            href="/inicio"
            className={`flex flex-1 flex-col items-center gap-1 px-2 py-1.5 text-[10px] font-medium transition-colors ${
              pathname === '/inicio' ? 'text-brand' : 'text-fg-muted'
            }`}
            aria-current={pathname === '/inicio' ? 'page' : undefined}
          >
            <Home size={22} />
            <span>{t('nav.home')}</span>
          </Link>

          <Link
            href="/servidores"
            className={`relative flex flex-1 flex-col items-center gap-1 px-2 py-1.5 text-[10px] font-medium transition-colors ${
              pathname === '/servidores' ? 'text-brand' : 'text-fg-muted'
            }`}
            aria-current={pathname === '/servidores' ? 'page' : undefined}
          >
            <Users size={22} />
            <span>{t('nav.communities')}</span>
          </Link>

          {/* Center: Voice or Add Server */}
          <div className="relative flex flex-1 flex-col items-center gap-1">
            {connection ? (
              <button
                type="button"
                onClick={() => setVoiceMenuOpen(!voiceMenuOpen)}
                className={`relative flex flex-1 flex-col items-center gap-1 px-2 py-1.5 text-[10px] font-medium transition-colors ${
                  voiceMenuOpen ? 'text-brand' : 'text-brand'
                }`}
                aria-expanded={voiceMenuOpen}
                aria-label={t('server.voice.connected')}
              >
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand/20">
                  <Gamepad2 size={20} className="text-brand" />
                  <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-success border-2 border-surface" />
                </span>
                <span>{t('server.voice.connected')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAddServer}
                className={`relative flex flex-1 flex-col items-center gap-1 px-2 py-1.5 text-[10px] font-medium transition-colors text-brand`}
                aria-label={t('nav.addServer')}
              >
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand/20">
                  <Server size={22} className="text-brand" />
                  <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-brand border-2 border-surface">
                    <span className="text-[10px] font-bold text-[#090909]">+</span>
                  </span>
                </span>
                <span>{t('nav.addServer')}</span>
              </button>
            )}
          </div>

          <Link
            href="/jogadores"
            className={`relative flex flex-1 flex-col items-center gap-1 px-2 py-1.5 text-[10px] font-medium transition-colors ${
              pathname === '/jogadores' ? 'text-brand' : 'text-fg-muted'
            }`}
            aria-current={pathname === '/jogadores' ? 'page' : undefined}
          >
            <MessageSquare size={22} />
            <span>{t('nav.players')}</span>
          </Link>

          <Link
            href="/competitivo"
            className={`flex flex-1 flex-col items-center gap-1 px-2 py-1.5 text-[10px] font-medium transition-colors ${
              pathname === '/competitivo' ? 'text-brand' : 'text-fg-muted'
            }`}
            aria-current={pathname === '/competitivo' ? 'page' : undefined}
          >
            <Trophy size={22} />
            <span>{t('nav.competitive')}</span>
          </Link>
        </div>

        {/* Voice quick actions menu */}
        {voiceMenuOpen && connection && (
          <div className="border-t border-border bg-surface p-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { /* toggleMute */ setVoiceMenuOpen(false); }}
                className="flex flex-col items-center gap-1 rounded-lg border border-border bg-raised p-2 text-xs text-fg"
              >
                <span className="text-brand">🎤</span>
                <span>{t('server.voice.mute')}</span>
              </button>
              <button
                type="button"
                onClick={() => { /* toggleDeafen */ setVoiceMenuOpen(false); }}
                className="flex flex-col items-center gap-1 rounded-lg border border-border bg-raised p-2 text-xs text-fg"
              >
                <span className="text-brand">🔇</span>
                <span>{t('server.voice.deafen')}</span>
              </button>
              <button
                type="button"
                onClick={() => { /* disconnect */ setVoiceMenuOpen(false); }}
                className="flex flex-col items-center gap-1 rounded-lg border border-border bg-raised p-2 text-xs text-danger"
              >
                <span>📴</span>
                <span>{t('server.voice.disconnect')}</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile sidebar overlay for command palette trigger */}
      <div className="lg:hidden" />
    </>
  );
}