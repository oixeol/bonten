import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AUTH_ERROR_CODES } from '@bonten/shared';

function makeUsersService(overrides: Record<string, unknown> = {}) {
  return {
    findByEmail: jest.fn().mockResolvedValue(null),
    findByUsername: jest.fn().mockResolvedValue(null),
    findByIdentifier: jest.fn().mockResolvedValue(null),
    create: jest
      .fn()
      .mockImplementation(async (data: Record<string, unknown>) => ({
        id: 'uuid-1',
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        avatarUrl: null,
        bio: null,
        status: 'ONLINE',
        locale: data.locale ?? 'en',
        isVip: false,
        e2eePublicKey: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      })),
    ...overrides,
  };
}

const sampleDbUser = (passwordHash: string) => ({
  id: 'uuid-1',
  email: 'a@b.com',
  username: 'player1',
  passwordHash,
  displayName: 'Player 1',
  avatarUrl: null,
  bio: null,
  status: 'ONLINE',
  locale: 'en',
  isVip: false,
  e2eePublicKey: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
});

describe('AuthService', () => {
  let users: ReturnType<typeof makeUsersService>;
  let service: AuthService;

  beforeEach(() => {
    users = makeUsersService();
    service = new AuthService(users as never);
  });

  it('registra um novo usuário com senha em hash Argon2id', async () => {
    const { user } = await service.register({
      email: 'a@b.com',
      username: 'player1',
      password: 'senha12345',
    });

    expect(user.email).toBe('a@b.com');
    expect(user.username).toBe('player1');
    // Nunca retorna hash.
    expect(user).not.toHaveProperty('passwordHash');

    const createdArg = users.create.mock.calls[0][0];
    expect(createdArg.passwordHash).toMatch(/^\$argon2id\$/);
    expect(createdArg.passwordHash).not.toBe('senha12345');
  });

  it('rejeita e-mail já registrado', async () => {
    const svc = new AuthService(
      makeUsersService({
        findByEmail: jest.fn().mockResolvedValue({ id: 'x' }),
      }) as never,
    );

    await expect(
      svc.register({ email: 'a@b.com', username: 'u1', password: 'senha12345' }),
    ).rejects.toMatchObject({
      response: { code: AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED },
    });
  });

  it('rejeita username já em uso', async () => {
    const svc = new AuthService(
      makeUsersService({
        findByUsername: jest.fn().mockResolvedValue({ id: 'x' }),
      }) as never,
    );

    await expect(
      svc.register({ email: 'a@b.com', username: 'u1', password: 'senha12345' }),
    ).rejects.toMatchObject({
      response: { code: AUTH_ERROR_CODES.USERNAME_ALREADY_TAKEN },
    });
  });

  it('autentica com credenciais corretas', async () => {
    const hash = await AuthService.hashPassword('senha12345');
    const svc = new AuthService(
      makeUsersService({
        findByIdentifier: jest.fn().mockResolvedValue(sampleDbUser(hash)),
      }) as never,
    );

    const user = await svc.login('a@b.com', 'senha12345');
    expect(user.id).toBe('uuid-1');
  });

  it('rejeita senha incorreta', async () => {
    const hash = await AuthService.hashPassword('certa12345');
    const svc = new AuthService(
      makeUsersService({
        findByIdentifier: jest.fn().mockResolvedValue(sampleDbUser(hash)),
      }) as never,
    );

    await expect(svc.login('a@b.com', 'errada123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita login de usuário inexistente', async () => {
    await expect(service.login('nobody', 'whatever1')).rejects.toMatchObject({
      response: { code: AUTH_ERROR_CODES.INVALID_CREDENTIALS },
    });
  });
});