import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
// isUUID available if needed

@Injectable()
export class MatchmakingService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private getMatchmakingUrl(): string {
    return this.config.get<string>('MATCHMAKING_URL') ?? 'http://localhost:8080';
  }

  async joinQueue(userId: string, gameId: string, mode: string, region: string) {
    // Verificar se o jogador já está em uma party ou fila
    const existingQueue = await this.prisma.matchmakingQueue.findFirst({
      where: { userId, status: 'waiting' },
    });
    if (existingQueue) throw new ForbiddenException('Already in queue');

    // Verificar se está em uma party ativa
    const partyMember = await this.prisma.partyMember.findFirst({
      where: { userId, party: { status: { in: ['lobby', 'in_queue'] } } },
    });

    const entry = await this.prisma.matchmakingQueue.create({
      data: {
        gameId,
        mode,
        region,
        userId: partyMember ? null : userId,
        partyId: partyMember?.partyId ?? null,
        status: 'waiting',
      },
    });

    // Notificar o serviço Rust (se disponível)
    try {
      await fetch(`${this.getMatchmakingUrl()}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id, gameId, mode, region, userId, partyId: partyMember?.partyId }),
      });
    } catch {
      // Rust service unavailable; NestJS handles queue directly
    }

    return entry;
  }

  async leaveQueue(userId: string) {
    const entry = await this.prisma.matchmakingQueue.findFirst({
      where: { userId, status: 'waiting' },
    });
    if (!entry) throw new NotFoundException('Not in queue');

    await this.prisma.matchmakingQueue.update({
      where: { id: entry.id },
      data: { status: 'cancelled' },
    });

    try {
      await fetch(`${this.getMatchmakingUrl()}/queue/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id }),
      });
    } catch {}

    return { left: true };
  }

  async getQueueStatus(userId: string) {
    const entry = await this.prisma.matchmakingQueue.findFirst({
      where: { userId, status: { in: ['waiting', 'matched'] } },
      include: { game: true },
      orderBy: { joinedAt: 'desc' },
    });
    return entry;
  }

  async acceptMatch(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Match not found');

    const player = await this.prisma.matchPlayer.findFirst({
      where: { matchId, userId },
    });
    if (!player) throw new ForbiddenException('Not a participant');

    const result = await this.prisma.matchResult.findUnique({ where: { matchId } });
    if (!result) throw new NotFoundException('Match result not found');

    // Determine which team the player is on
    const isTeamA = player.team === 'A';
    await this.prisma.matchResult.update({
      where: { matchId },
      data: isTeamA ? { confirmedByA: true } : { confirmedByB: true },
    });

    // Check if both confirmed
    const updated = await this.prisma.matchResult.findUnique({ where: { matchId } });
    if (updated?.confirmedByA && updated?.confirmedByB) {
      await this.prisma.match.update({ where: { id: matchId }, data: { status: 'in_progress', startedAt: new Date() } });
    }

    return { accepted: true, matchStarted: updated?.confirmedByA && updated?.confirmedByB };
  }

  async declineMatch(matchId: string, _userId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Match not found');

    await this.prisma.match.update({ where: { id: matchId }, data: { status: 'cancelled' } });
    await this.prisma.matchResult.update({ where: { matchId }, data: { disputed: true } });

    return { declined: true };
  }

  async getMatch(matchId: string) {
    return this.prisma.match.findUnique({
      where: { id: matchId },
      include: { players: { include: { user: true } }, result: true, game: true },
    });
  }

  // Party size validation (seção 12.3.1)
  validatePartySize(gameSlug: string, partySize: number, mode: string): boolean {
    if (gameSlug === 'tft') {
      return partySize === 1 || partySize === 2; // solo or double up
    }
    // 5v5 games
    if (mode.includes('wingman') || mode.includes('2v2')) {
      return partySize === 2;
    }
    // Competitive 5v5
    return [1, 2, 3, 5].includes(partySize);
  }
}