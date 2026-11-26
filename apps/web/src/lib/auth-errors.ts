import type { MessageKey } from '@/i18n/messages';
import { AUTH_ERROR_CODES } from '@bonten/shared';

/**
 * Mapeia o código de erro vindo da API para a chave de tradução.
 * Fallback genérico para códigos desconhecidos (nunca mostra texto cru).
 */
const KNOWN: Record<string, MessageKey> = {
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 'errors.auth.invalid_credentials',
  [AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED]:
    'errors.auth.email_already_registered',
  [AUTH_ERROR_CODES.USERNAME_ALREADY_TAKEN]:
    'errors.auth.username_already_taken',
  [AUTH_ERROR_CODES.WEAK_PASSWORD]: 'errors.auth.weak_password',
  [AUTH_ERROR_CODES.UNAUTHENTICATED]: 'errors.auth.unauthenticated',
  [AUTH_ERROR_CODES.CSRF_INVALID]: 'errors.auth.csrf_invalid',
  [AUTH_ERROR_CODES.SESSION_EXPIRED]: 'errors.auth.session_expired',
  [AUTH_ERROR_CODES.RATE_LIMITED]: 'errors.auth.rate_limited',
  'validation_failed': 'errors.validation_failed',
  'internal_error': 'errors.internal_error',
};

export function errorKey(code: string): MessageKey {
  return KNOWN[code] ?? 'errors.internal_error';
}

/** Mensagem de falha de rede (fetch rejeitou antes de resposta HTTP). */
export const NETWORK_ERROR_KEY: MessageKey = 'errors.network';