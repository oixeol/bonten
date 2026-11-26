import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { validatePublicKey } from '../dms/encrypted-envelope';
import { UserStatus } from '@prisma/client';
import type { PublicUser } from '@bonten/shared';
import { PrismaService } from '../prisma/prisma.service';

export function toPublicUser(user: {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  status: string;
  locale: string;
  isVip: boolean;
  createdAt: Date;
}): PublicUser {
  return {
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
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findByIdentifier(identifier: string) {
    return this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    });
  }

  async create(data: {
    email: string;
    username: string;
    passwordHash: string;
    displayName: string;
    locale: string;
    status: UserStatus;
  }) {
    return this.prisma.user.create({ data });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getPublicProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        status: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async search(query: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
      take: 20,
    });
  }

  async getE2eePublicKey(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { e2eePublicKey: true },
    });
    return user?.e2eePublicKey ?? null;
  }

  async setE2eePublicKey(userId: string, publicKey: string): Promise<void> {
    validatePublicKey(publicKey);
    const result = await this.prisma.user.updateMany({
      where: { id: userId, OR: [{ e2eePublicKey: null }, { e2eePublicKey: publicKey }] },
      data: { e2eePublicKey: publicKey },
    });
    if (result.count !== 1) {
      throw new ConflictException('Chave pública já cadastrada difere. Use o dispositivo original.');
    }
  }
}