import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';
import type { AuthenticatedRequest } from './types';
import type { PublicUser } from '@bonten/shared';

export const SID_COOKIE = 'bonten_sid';

/**
 * Global. Resolve sessão a partir do cookie, anexa req.user/req.session.
 * NÃO rejeita — só popula. A proteção real vem do AuthGuard nas rotas.
 * Sessão expirada/inválida: limpa req.user e segue (AuthGuard decide).
 */
@Injectable()
export class SessionResolverGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = req.cookies?.[SID_COOKIE];
    if (!token) return true;

    const session = await this.sessions.get(token);
    if (!session) return true;

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) {
      await this.sessions.destroy(token);
      return true;
    }

    req.session = session;
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      status: user.status.toLowerCase() as PublicUser['status'],
      locale: user.locale as PublicUser['locale'],
      isVip: user.isVip,
      createdAt: user.createdAt.toISOString(),
    };
    return true;
  }
}