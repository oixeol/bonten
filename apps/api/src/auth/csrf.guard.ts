import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_ERROR_CODES } from '@bonten/shared';
import type { AuthenticatedRequest } from './types';
import { hashToken } from './session.service';

export const CSRF_COOKIE = 'bonten_csrf';
export const CSRF_HEADER = 'x-csrf-token';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Marca uma rota como isenta de CSRF (ex.: login/registro, sem sessão prévia). */
export const IS_CSRF_EXEMPT = 'isCsrfExempt';
export const CsrfExempt = () => SetMetadata(IS_CSRF_EXEMPT, true);

/**
 * Double-submit + vínculo com a sessão (seção 10.1).
 * Em métodos mutantes: exige header x-csrf-token == cookie bonten_csrf
 * e que o hash bata com o csrfHash guardado na sessão.
 * Rotas sem sessão (login/registro) são isentas.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<AuthenticatedRequest>();
    if (!MUTATING.has(req.method ?? 'GET')) return true;

    const exempt = this.reflector.getAllAndOverride<boolean>(IS_CSRF_EXEMPT, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (exempt) return true;

    // Sem sessão: deixa o AuthGuard decidir (evita vazar CSRF vs 401).
    if (!req.session) return true;

    const cookieToken = req.cookies?.[CSRF_COOKIE];
    const headerToken = req.headers?.[CSRF_HEADER];
    const provided = Array.isArray(headerToken) ? headerToken[0] : headerToken;

    if (
      !cookieToken ||
      !provided ||
      cookieToken !== provided ||
      hashToken(cookieToken) !== req.session.csrfHash
    ) {
      throw new ForbiddenException({ code: AUTH_ERROR_CODES.CSRF_INVALID });
    }
    return true;
  }
}