import type { PublicUser, SessionData } from '@bonten/shared';

/** Aumenta o Request do Express com dados resolvidos pelos guards. */
export interface AuthenticatedRequest {
  method?: string;
  user?: PublicUser;
  session?: SessionData;
  cookies?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
}