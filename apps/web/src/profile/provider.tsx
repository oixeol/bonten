'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Modal } from '@/components/ui/modal';
import { ProfileContent, profileExists } from './profile-content';
import { useAuth } from '@/auth/provider';
import { useI18n } from '@/i18n/provider';

interface ProfileContextValue {
  /** Abre o perfil de um usuário (slug/username; "me" = atual). */
  openProfile: (username: string) => void;
  closeProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * Provider global: mantém um único Modal de perfil.
 * Qualquer componente pode abrir o perfil sem trocar de rota.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [slug, setSlug] = useState<string | null>(null);

  const openProfile = useCallback((username: string) => {
    setSlug(username || 'me');
  }, []);

  const closeProfile = useCallback(() => setSlug(null), []);

  const value = useMemo(
    () => ({ openProfile, closeProfile }),
    [openProfile, closeProfile],
  );

  const exists = slug ? profileExists(slug, user?.username) : false;
  const title = slug
    ? slug === 'me' || slug === user?.username
      ? (user?.displayName ?? user?.username ?? 'Perfil')
      : slug
    : '';

  return (
    <ProfileContext.Provider value={value}>
      {children}
      <Modal
        open={slug !== null}
        onClose={closeProfile}
        title={t('profile.title')}
        widthClass="max-w-xl"
      >
        {exists ? (
          <ProfileContent key={slug} slug={slug as string} />
        ) : (
          <p className="py-8 text-center text-sm text-fg-muted">
            {t('profile.notFound')}
          </p>
        )}
        <span className="sr-only">{title}</span>
      </Modal>
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile deve ser usado dentro de <ProfileProvider>');
  return ctx;
}