import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PublicUser } from '@bonten/shared';
import type { AuthenticatedRequest } from './types';

/** Injeta o usuário autenticado (req.user) num parâmetro do handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PublicUser | undefined => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return req.user;
  },
);