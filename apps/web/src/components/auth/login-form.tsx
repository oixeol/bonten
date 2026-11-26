'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/auth/provider';
import { useI18n } from '@/i18n/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { ApiClientError } from '@/lib/api';
import { errorKey, NETWORK_ERROR_KEY } from '@/lib/auth-errors';
import { validateRequired } from '@/lib/validation';

export function LoginForm() {
  const { t } = useI18n();
  const { login } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const idErr = validateRequired(identifier);
    const pwErr = validateRequired(password);
    if (idErr || pwErr) {
      setError(t(idErr ?? pwErr!));
      return;
    }

    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next && next.startsWith('/') ? next : '/inicio');
    } catch (err) {
      const key =
        err instanceof ApiClientError ? errorKey(err.code) : NETWORK_ERROR_KEY;
      setError(t(key));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label={t('auth.identifier')} htmlFor="identifier" error={error ?? undefined}>
        <Input
          id="identifier"
          name="identifier"
          autoComplete="username"
          placeholder={t('auth.identifier.placeholder')}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          invalid={!!error}
        />
      </Field>

      <Field label={t('auth.password')} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder={t('auth.password.placeholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!error}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t('auth.submitting') : t('auth.submit.login')}
      </Button>

      <p className="text-center text-sm text-fg-muted">
        {t('auth.to.register')}{' '}
        <Link
          href="/register"
          className="font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {t('auth.to.register.cta')}
        </Link>
      </p>
    </form>
  );
}