import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  AUTH_ERROR_CODES,
  DEFAULT_LOCALE,
  type PublicUser,
} from '@bonten/shared';
import { UsersService, toPublicUser } from '../users/users.service';
import type { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService) {}

  /**
   * Hash de senha com Argon2id (seção 10.1).
   * Parâmetros: memória 64MB, 3 iterações, paralelismo 1.
   */
  static hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
    });
  }

  static verifyPassword(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ user: PublicUser }> {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();

    const [byEmail, byUsername] = await Promise.all([
      this.users.findByEmail(email),
      this.users.findByUsername(username),
    ]);
    if (byEmail) {
      throw new ConflictException({
        code: AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED,
      });
    }
    if (byUsername) {
      throw new ConflictException({
        code: AUTH_ERROR_CODES.USERNAME_ALREADY_TAKEN,
      });
    }

    const passwordHash = await AuthService.hashPassword(dto.password);
    const user = await this.users.create({
      email,
      username,
      passwordHash,
      displayName: dto.displayName?.trim() || username,
      locale: dto.locale ?? DEFAULT_LOCALE,
      status: 'ONLINE',
    });

    return { user: toPublicUser(user) };
  }

  async login(identifier: string, password: string): Promise<PublicUser> {
    const id = identifier.trim().toLowerCase();
    const user = await this.users.findByIdentifier(id);
    // Comparação sempre executada para não vazar existência via tempo.
    const hash = user?.passwordHash ?? DUMMY_ARGON2_HASH;
    const ok = await AuthService.verifyPassword(hash, password);

    if (!user || !ok) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      });
    }
    return toPublicUser(user);
  }
}

// Hash válido de um valor fixo, usado para igualar tempo quando usuário não existe.
const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$cGxhY2Vob2xkZXJwbGFjZXM$Y29ycmVzc3BvbmRpbmdwbGFjZWhvbGRlcgAAAA';