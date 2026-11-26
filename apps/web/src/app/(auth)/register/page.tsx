'use client';

import { useI18n } from '@/i18n/provider';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-fg">{t('auth.register.title')}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t('auth.register.subtitle')}</p>
      </div>
      <RegisterForm />
    </div>
  );
}