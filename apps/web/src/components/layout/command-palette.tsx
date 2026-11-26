'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { MessageKey } from '@/i18n/messages';
import { useAuth } from '@/auth/provider';
import { useVoice } from '@/voice/provider';

interface Command {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  action: () => void;
  section?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { t } = useI18n();
  const { logout } = useAuth();
  const { connection, disconnect, toggleMute, toggleDeafen, muted, deafened } = useVoice();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build commands list based on current state
  const commands = useMemo((): Command[] => [
    // Navigation
    { id: 'nav-home', label: t('nav.home'), description: 'Ir para Início', shortcut: 'g h', section: 'navigation', action: () => window.location.href = '/inicio', icon: null },
    { id: 'nav-communities', label: t('nav.communities'), description: 'Abrir Servidores', shortcut: 'g c', section: 'navigation', action: () => window.location.href = '/servidores', icon: null },
    { id: 'nav-players', label: t('nav.players'), description: 'Abrir Mensagens', shortcut: 'g m', section: 'navigation', action: () => window.location.href = '/jogadores', icon: null },
    { id: 'nav-discover', label: t('nav.discover'), description: 'Abrir Descobrir', shortcut: 'g d', section: 'navigation', action: () => window.location.href = '/descobrir', icon: null },
    { id: 'nav-competitive', label: t('nav.competitive'), description: 'Abrir Competitivo', shortcut: 'g k', section: 'navigation', action: () => window.location.href = '/competitivo', icon: null },
    { id: 'nav-parties', label: 'Parties', description: 'Abrir Parties', shortcut: 'g p', section: 'navigation', action: () => window.location.href = '/parties', icon: null },
    // Profile
    { id: 'profile-me', label: t('profile.edit'), description: 'Editar perfil', shortcut: 'g p', section: 'profile', action: () => window.location.href = '/perfil/me', icon: null },
    { id: 'logout', label: t('auth.logout'), description: 'Sair da conta', shortcut: '', section: 'profile', action: () => { void logout(); onClose(); }, icon: null },
    // Voice
    { id: 'voice-connect', label: t('server.voice.connect'), description: 'Entrar no canal de voz', shortcut: 'v c', section: 'voice', action: () => {}, icon: null, disabled: !connection },
    { id: 'voice-disconnect', label: t('server.voice.disconnect'), description: 'Sair do canal de voz', shortcut: 'v d', section: 'voice', action: () => { disconnect(); onClose(); }, icon: null, disabled: !connection },
    { id: 'voice-mute', label: muted ? t('server.voice.unmute') : t('server.voice.mute'), description: muted ? 'Ativar microfone' : 'Mutar microfone', shortcut: 'm', section: 'voice', action: () => { toggleMute(); onClose(); }, icon: null, disabled: !connection },
    { id: 'voice-deafen', label: deafened ? t('server.voice.undeafen') : t('server.voice.deafen'), description: deafened ? 'Ativar som' : 'Surdo', shortcut: 'd', section: 'voice', action: () => { toggleDeafen(); onClose(); }, icon: null, disabled: !connection },
  ], [t, connection, muted, deafened, logout, disconnect, toggleMute, toggleDeafen, onClose]);

  const filteredCommands = useMemo(() => commands
    .filter((cmd) => {
      if (!cmd.action) return false;
      const search = query.toLowerCase();
      return (
        cmd.label.toLowerCase().includes(search) ||
        cmd.description?.toLowerCase().includes(search) ||
        cmd.shortcut?.toLowerCase().includes(search) ||
        cmd.section?.toLowerCase().includes(search)
      );
    })
    .slice(0, 8), [commands, query]);

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  // Handle keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filteredCommands[selectedIndex];
      if (cmd?.action) {
        cmd.action();
      }
      return;
    }
  }, [filteredCommands, selectedIndex, onClose]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      document.addEventListener('keydown', handleGlobalKeyDown);
    }
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [open, handleGlobalKeyDown]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-base/80" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-lg border border-border bg-surface shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center gap-2 border-b border-border px-4 py-3">
          <Search size={18} className="text-fg-subtle" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder={t('cmdk.placeholder')}
            className="flex-1 bg-transparent text-lg text-fg outline-none placeholder:text-fg-subtle"
            autoFocus
          />
          <kbd className="hidden px-2 py-0.5 text-[10px] font-mono text-fg-subtle bg-raised rounded sm:inline-flex">⌘K</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-fg-muted">
              {t('cmdk.noResults')}
            </div>
          ) : (
            <ul role="listbox" aria-label={t('cmdk.commands')}>
              {groupCommands(filteredCommands).map((group, groupIndex) => (
                <li key={group.section}>
                  <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle bg-raised/50 border-b border-border">
                    {t(`cmdk.section.${group.section}` as MessageKey) || group.section}
                  </div>
                  {group.items.map((cmd, itemIndex) => {
                    const isSelected = groupIndex === 0 && itemIndex === selectedIndex; // Simplified selection
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={() => { if (cmd.action) { cmd.action(); } }}
                        disabled={cmd.disabled}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-raised' : 'hover:bg-raised'} ${cmd.disabled ? 'opacity-50 pointer-events-none' : ''}`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="flex-1 truncate font-medium text-fg">{cmd.label}</span>
                        {cmd.shortcut && (
                          <kbd className="ml-auto shrink-0 px-2 py-0.5 text-[10px] font-mono text-fg-subtle bg-raised rounded">
                            {formatShortcut(cmd.shortcut)}
                          </kbd>
                        )}
                        <ChevronRight size={14} className="text-fg-subtle" />
                      </button>
                    );
                  })}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-4 py-2 text-xs text-fg-subtle">
          {t('cmdk.footer')}
        </div>
      </div>
    </div>,
    document.body
  );
}

function groupCommands(commands: Command[]) {
  const sections = new Map<string, Command[]>();
  for (const cmd of commands) {
    const section = cmd.section || 'other';
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section)!.push(cmd);
  }
  return Array.from(sections.entries()).map(([section, items]) => ({ section, items }));
}

function formatShortcut(shortcut: string): string {
  return shortcut
    .split(' ')
    .map((part) => part.toUpperCase().replace('G', 'G').replace('V', 'V').replace('M', 'M').replace('D', 'D').replace('C', 'C').replace('K', 'K').replace('H', 'H'))
    .join(' ');
}