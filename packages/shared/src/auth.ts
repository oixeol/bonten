/**
 * Contratos de autenticação compartilhados entre frontend e backend.
 * Reexporta PublicUser de index.ts para evitar duplicação.
 */

import type { Locale, PublicUser } from './index';

export type { PublicUser };

/** Resposta de sessão após login/registro. */
export interface SessionResponse {
  user: PublicUser;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  displayName?: string;
  locale?: Locale;
}

export interface LoginRequest {
  /** E-mail OU nome de usuário. */
  identifier: string;
  password: string;
}