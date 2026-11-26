'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit3, Trash2, Users, Lock, ChevronDown } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { Community } from '@/lib/api';

interface ServerHeaderTriggerProps {
  server: Community | null;
  currentUserId: string | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onManageMembers?: () => void;
  onSettings?: () => void;
}

export function ServerHeaderTrigger({
  server,
  currentUserId,
  onEdit,
  onDelete,
  onManageMembers,
  onSettings,
}: ServerHeaderTriggerProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const isOwner = server?.ownerId === currentUserId;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (buttonRef.current?.contains(event.target as Node)) return;
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [open]);

  const items = isOwner
    ? [
        { label: t('communities.settings'), icon: Edit3, action: () => { onEdit(); setOpen(false); }, variant: 'default' as const },
        { label: t('communities.members'), icon: Users, action: () => { onManageMembers?.(); setOpen(false); }, variant: 'default' as const },
        { label: server?.isPrivate ? t('communities.invite') : t('communities.leave'), icon: server?.isPrivate ? Users : Lock, action: () => { onSettings?.(); setOpen(false); }, variant: 'default' as const },
        { label: t('modal.deleteTitle'), icon: Trash2, action: () => { onDelete(); setOpen(false); }, variant: 'destructive' as const },
      ]
    : [
        { label: t('communities.leave'), icon: Lock, action: () => { onSettings?.(); setOpen(false); }, variant: 'default' as const },
      ];

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        className="rounded-md p-1 text-fg-muted transition-colors hover:bg-raised hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-label={t('server.settings')}
      >
        <ChevronDown size={16} />
      </button>
      {open && createPortal(
        <div
          className="fixed inset-0 z-50"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="absolute inset-0" aria-hidden />
          <div
            ref={menuRef}
            role="menu"
            className="absolute right-0 top-full mt-1 w-48 rounded-md border border-border bg-surface shadow-lg py-1"
            style={{ zIndex: 50 }}
          >
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                role="menuitem"
                onClick={item.action}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  item.variant === 'destructive'
                    ? 'text-danger hover:bg-danger/10'
                    : 'text-fg hover:bg-raised'
                }`}
              >
                <item.icon size={16} className="shrink-0" />
                {item.label}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}