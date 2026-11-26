import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHash, randomBytes } from 'node:crypto';
import type { SessionData } from '@bonten/shared';
import { REDIS_CLIENT } from '../redis/redis.module';

const SESSION_PREFIX = 'sess:';

export const SID_COOKIE = 'bonten_sid';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Sessões opacas guardadas no Redis (decisão Fase 0 #5).
 * O cookie carrega o token opaco; o Redis guarda os dados por hash do token.
 */
@Injectable()
export class SessionService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  private get ttl(): number {
    return this.config.get<number>('sessionTtlSeconds') ?? 604800;
  }

  /** Cria sessão, retorna o token opaco (vai no cookie). */
  async create(userId: string, csrfToken: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const data: SessionData = {
      userId,
      createdAt: Date.now(),
      csrfHash: hashToken(csrfToken),
    };
    await this.redis.set(
      SESSION_PREFIX + hashToken(token),
      JSON.stringify(data),
      'EX',
      this.ttl,
    );
    return token;
  }

  /** Carrega sessão pelo token opaco; renova TTL (sliding). */
  async get(token: string): Promise<SessionData | null> {
    const key = SESSION_PREFIX + hashToken(token);
    const raw = await this.redis.get(key);
    if (!raw) return null;
    // Sliding expiration.
    await this.redis.expire(key, this.ttl);
    return JSON.parse(raw) as SessionData;
  }

  async destroy(token: string): Promise<void> {
    await this.redis.del(SESSION_PREFIX + hashToken(token));
  }

  /** Troca o CSRF de uma sessão existente sem criar nova sessão. */
  async rotateCsrf(token: string, csrfToken: string): Promise<SessionData | null> {
    const key = SESSION_PREFIX + hashToken(token);
    const raw = await this.redis.get(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as SessionData;
    data.csrfHash = hashToken(csrfToken);
    await this.redis.set(key, JSON.stringify(data), 'EX', this.ttl);
    return data;
  }
}

export { hashToken };
export function newCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}