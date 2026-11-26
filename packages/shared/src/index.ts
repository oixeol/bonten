/**
 * Contratos compartilhados entre backend (NestJS) e frontend (Next.js).
 * O backend envia códigos de erro/evento; o frontend traduz (seção 6.8).
 * Nenhum texto pronto de UI aqui — apenas códigos estáveis.
 */

/**
 * Códigos de erro de autenticação/autorização e de domínio.
 * O frontend mantém um dicionário de tradução por código, organizado por módulo.
 */
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'auth.invalid_credentials',
  EMAIL_ALREADY_REGISTERED: 'auth.email_already_registered',
  USERNAME_ALREADY_TAKEN: 'auth.username_already_taken',
  WEAK_PASSWORD: 'auth.weak_password',
  UNAUTHENTICATED: 'auth.unauthenticated',
  FORBIDDEN: 'auth.forbidden',
  CSRF_INVALID: 'auth.csrf_invalid',
  SESSION_EXPIRED: 'auth.session_expired',
  RATE_LIMITED: 'auth.rate_limited',
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/** Formato único de erro retornado pela API. */
export interface ApiError {
  code: string;
  /** Detalhe técnico opcional, nunca com segredo. Para logs/dev. */
  detail?: string;
}

/** Locales suportados no MVP (seção 6.8). */
export const LOCALES = ['pt-BR', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export * from './auth';

export const USER_STATUSES = ['online', 'idle', 'dnd', 'offline'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Usuário público (nunca inclui hash de senha). */
export interface PublicUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  status: UserStatus;
  locale: Locale;
  isVip: boolean;
  createdAt: string;
}

/** Payload de sessão persistido no Redis. */
export interface SessionData {
  userId: string;
  createdAt: number;
  /** Hash do token CSRF atrelado à sessão (não o token em claro). */
  csrfHash: string;
}