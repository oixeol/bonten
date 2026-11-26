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
import {
  validateEmail,
  validateUsername,
  validatePassword,
} from '@/lib/validation';
import type { MessageKey } from '@/i18n/messages';

type Errors = Partial<Record<'email' | 'username' | 'password', MessageKey>>;

export function RegisterForm() {
  const { t, locale } = useI18n();
  const { register } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: Errors = {
      email: validateEmail(email),
      username: validateUsername(username),
      password: validatePassword(password),
    };
    setErrors(next);
    setFormError(null);
    return !next.email && !next.username && !next.password;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        username: username.trim(),
        password,
        displayName: displayName.trim() || undefined,
        locale,
      });
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next && next.startsWith('/') ? next : '/inicio');
    } catch (err) {
      const key =
        err instanceof ApiClientError ? errorKey(err.code) : NETWORK_ERROR_KEY;
      setFormError(t(key));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label={t('auth.email')} htmlFor="email" error={errors.email ? t(errors.email) : undefined}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t('auth.email.placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={!!errors.email}
        />
      </Field>

      <Field
        label={t('auth.username')}
        htmlFor="username"
        hint={t('auth.username.hint')}
        error={errors.username ? t(errors.username) : undefined}
      >
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder={t('auth.username.placeholder')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          invalid={!!errors.username}
        />
      </Field>

      <Field
        label={t('auth.password')}
        htmlFor="password"
        hint={t('auth.password.hint')}
        error={errors.password ? t(errors.password) : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.password.placeholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!errors.password}
        />
      </Field>

      <Field
        label={t('auth.displayName')}
        htmlFor="displayName"
        optional={t('auth.displayName.optional')}
      >
        <Input
          id="displayName"
          name="displayName"
          placeholder={t('auth.displayName.placeholder')}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Field>

      {formError && (
        <p className="text-sm text-danger" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t('auth.submitting') : t('auth.submit.register')}
      </Button>

      <p className="text-center text-sm text-fg-muted">
        {t('auth.to.login')}{' '}
        <Link
          href="/login"
          className="font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {t('auth.to.login.cta')}
        </Link>
      </p>
    </form>
  );
}