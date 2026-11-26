'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { ProfileContent, profileExists } from '@/profile/profile-content';

export default function PerfilPage() {
  const { t } = useI18n();
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const slug = params.username ?? 'me';

  if (!profileExists(slug)) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-fg-muted">{t('profile.notFound')}</p>
        <Link
          href="/jogadores"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-hover"
        >
          <ArrowLeft size={15} />
          {t('players.discover.title')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 lg:px-6">
      <ProfileContent slug={slug} onBack={() => router.back()} />
    </div>
  );
}