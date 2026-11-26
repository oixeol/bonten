'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/auth/provider';
import { useI18n } from '@/i18n/provider';
import { AppShell } from '@/components/layout/app-shell';
import { BontenLogo } from '@/components/brand/bonten-logo';

/**
 * Casca das páginas autenticadas: AppShell + guard de sessão.
 * Enquanto restaura /auth/me mostra loader; sem sessão redireciona a /login.
 */
export function AuthedShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-base">
        <BontenLogo size={30} />
        <p className="text-sm text-fg-muted">{t('common.loading')}</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}