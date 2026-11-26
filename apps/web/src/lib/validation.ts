import type { MessageKey } from '@/i18n/messages';

/** Validações locais que espelham os DTOs do backend (register.dto / login.dto). */

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRequired(value: string): MessageKey | undefined {
  return value.trim().length > 0 ? undefined : 'val.required';
}

export function validateEmail(value: string): MessageKey | undefined {
  if (!value.trim()) return 'val.required';
  return EMAIL_REGEX.test(value.trim()) ? undefined : 'val.email';
}

export function validateUsername(value: string): MessageKey | undefined {
  if (!value.trim()) return 'val.required';
  return USERNAME_REGEX.test(value.trim()) ? undefined : 'val.username';
}

export function validatePassword(value: string): MessageKey | undefined {
  if (!value) return 'val.required';
  return value.length >= 8 ? undefined : 'val.password';
}