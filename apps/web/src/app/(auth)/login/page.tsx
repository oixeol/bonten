'use client';

import { useI18n } from '@/i18n/provider';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-fg">{t('auth.login.title')}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t('auth.login.subtitle')}</p>
      </div>
      <LoginForm />
    </div>
  );
}