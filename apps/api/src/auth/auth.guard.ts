import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AUTH_ERROR_CODES } from '@bonten/shared';
import type { AuthenticatedRequest } from './types';

/** Protege rotas que exigem usuário autenticado. Roda após SessionResolverGuard. */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.UNAUTHENTICATED,
      });
    }
    return true;
  }
}