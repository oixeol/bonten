'use client';

import { useState, type ReactNode } from 'react';
import { Topbar } from './topbar';
import { VoiceBar } from '@/voice/voice-bar';
import { MobileRail } from './mobile-rail';
import { CommandPalette } from './command-palette';

/**
 * Casca do app (seção 5.1): topbar + área de conteúdo.
 * Sem rail lateral fixo — servidores aparecem como cards (Fase 5).
 * VoiceBar fica fixo no rodapé, visível em qualquer rota enquanto conectado.
 * MobileRail fica fixo no rodapé no mobile.
 * CommandPalette (⌘K) para navegação por teclado.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [_addServerOpen, setAddServerOpen] = useState(false);

  // Global ⌘K handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCmdPaletteOpen(true);
    }
    if (e.key === 'Escape') {
      setCmdPaletteOpen(false);
      setAddServerOpen(false);
    }
  };

  return (
    <>
      <div className="flex h-dvh flex-col">
        <Topbar />
        <main id="main-content" className="min-w-0 flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
        <VoiceBar />
      </div>

      {/* Mobile bottom rail */}
      <MobileRail
        onOpenCommandPalette={() => setCmdPaletteOpen(true)}
        onOpenAddServer={() => setAddServerOpen(true)}
      />

      {/* Command Palette (⌘K) */}
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />

      {/* Global keyboard handler */}
      <div onKeyDown={handleKeyDown} className="fixed inset-0 -z-10" aria-hidden="true" />
    </>
  );
}