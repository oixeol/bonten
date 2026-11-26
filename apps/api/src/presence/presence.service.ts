import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PresenceService implements OnModuleInit, OnModuleDestroy {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Cleanup stale presences on startup
    await this.cleanupStalePresences();
  }

  async onModuleDestroy() {
    // Cleanup on shutdown
  }

  async setOnline(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ONLINE' },
    });
  }

  async setIdle(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'IDLE' },
    });
  }

  async setDnd(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'DND' },
    });
  }

  async setOffline(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'OFFLINE' },
    });
  }

  async getOnlineUsers() {
    return this.prisma.user.findMany({
      where: { status: { in: ['ONLINE', 'IDLE', 'DND'] } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
      },
    });
  }

  async cleanupStalePresences() {
    // If we had Redis-based presence tracking with heartbeats,
    // we'd mark users offline who haven't sent a heartbeat recently.
    // For now, we rely on WebSocket disconnect events to set offline.
    // This is a placeholder for future Redis-based presence.
  }
}