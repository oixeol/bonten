'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/auth/provider';
import { BontenLogo } from '@/components/brand/bonten-logo';

/** Redireciona usuários já autenticados para /inicio; senão renderiza a tela. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/inicio');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <BontenLogo size={28} />
      </div>
    );
  }
  if (user) return null;

  return <>{children}</>;
}