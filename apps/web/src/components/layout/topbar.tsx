'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, User, Settings } from 'lucide-react';
import { BontenLogo } from '@/components/brand/bonten-logo';
import { useI18n } from '@/i18n/provider';
import { useAuth } from '@/auth/provider';
import { useProfile } from '@/profile/provider';
import { EditProfileModal } from '@/components/layout/edit-profile-modal';
import type { MessageKey } from '@/i18n/messages';

interface NavItem {
  href: string;
  labelKey: MessageKey;
}

const NAV: NavItem[] = [
  { href: '/inicio', labelKey: 'nav.home' },
  { href: '/servidores', labelKey: 'nav.communities' },
  { href: '/jogadores', labelKey: 'nav.players' },
  { href: '/descobrir', labelKey: 'nav.discover' },
  { href: '/competitivo', labelKey: 'nav.competitive' },
  { href: '/times', labelKey: 'nav.teams' },
];

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

interface UserMenuItem {
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

function UserMenu({ user, openProfile, logout, t }: { user: { id: string; displayName: string; avatarUrl: string | null }; openProfile: (tab: string) => void; logout: () => void; t: (k: MessageKey) => string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const items: UserMenuItem[] = [
    { label: t('profile.title'), icon: <User size={16} />, action: () => { openProfile('me'); setOpen(false); } },
    { label: t('communities.settings'), icon: <Settings size={16} />, action: () => { setOpen(false); } },
    { label: t('auth.logout'), icon: <LogOut size={16} />, action: () => { logout(); setOpen(false); } },
  ];

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-raised"
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-[#090909]"
          title={user.displayName}
        >
          {initials(user.displayName)}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm text-fg sm:inline">
          {user.displayName}
        </span>
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
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-fg transition-colors hover:bg-raised"
              >
                <span className="shrink-0">{item.icon}</span>
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

export function Topbar() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const { openProfile } = useProfile();
  const pathname = usePathname();
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  return (
    <>
      <header className="relative flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
        <Link
          href="/inicio"
          className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <BontenLogo size={26} />
        </Link>

        <nav
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1"
          aria-label={t('nav.home')}
        >
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  active
                    ? 'bg-raised text-fg'
                    : 'text-fg-muted hover:bg-raised hover:text-fg'
                }`}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {user && (
            <UserMenu
              user={user}
              openProfile={openProfile}
              logout={logout}
              t={t}
            />
          )}
        </div>
      </header>

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        onSaved={() => {}}
      />
    </>
  );
}