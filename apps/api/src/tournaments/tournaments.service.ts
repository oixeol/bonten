import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isUUID } from 'class-validator';

@Injectable()
export class TournamentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    gameId: string;
    format: string;
    startDate?: string;
    endDate?: string;
  }) {
    if (!data.name || data.name.length < 3) throw new BadRequestException('Tournament name too short');
    const validFormats = ['single_elim', 'double_elim', 'groups', 'points'];
    if (!validFormats.includes(data.format)) throw new BadRequestException('Invalid format');

    return this.prisma.tournament.create({
      data: {
        name: data.name,
        gameId: data.gameId,
        format: data.format,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: 'draft',
      },
    });
  }

  async list(gameId?: string, status?: string) {
    return this.prisma.tournament.findMany({
      where: {
        ...(gameId ? { gameId } : {}),
        ...(status ? { status } : {}),
      },
      include: { game: true, teams: { include: { team: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findById(id: string) {
    if (!isUUID(id)) throw new BadRequestException('Invalid tournament UUID');
    const t = await this.prisma.tournament.findUnique({
      where: { id },
      include: { game: true, teams: { include: { team: true } } },
    });
    if (!t) throw new NotFoundException('Tournament not found');
    return t;
  }

  async registerTeam(tournamentId: string, teamId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.status !== 'draft' && tournament.status !== 'registration') {
      throw new ForbiddenException('Registration closed');
    }

    const existing = await this.prisma.tournamentTeam.findUnique({
      where: { tournamentId_teamId: { tournamentId, teamId } },
    });
    if (existing) throw new ForbiddenException('Team already registered');

    return this.prisma.tournamentTeam.create({
      data: { tournamentId, teamId, status: 'registered' },
    });
  }

  async unregisterTeam(tournamentId: string, teamId: string) {
    const tt = await this.prisma.tournamentTeam.findUnique({
      where: { tournamentId_teamId: { tournamentId, teamId } },
    });
    if (!tt) throw new NotFoundException('Registration not found');

    await this.prisma.tournamentTeam.delete({ where: { id: tt.id } });
    return { unregistered: true };
  }

  async updateStatus(tournamentId: string, status: string) {
    const valid = ['draft', 'registration', 'in_progress', 'finished'];
    if (!valid.includes(status)) throw new BadRequestException('Invalid status');
    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { status },
    });
  }

  async generateBracket(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: true },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    // Simple seeding by registration order
    const teams = tournament.teams;
    const seeds = teams.map((t, i) => ({ teamId: t.teamId, seed: i + 1 }));

    for (const s of seeds) {
      await this.prisma.tournamentTeam.update({
        where: { id: teams.find((t) => t.teamId === s.teamId)!.id },
        data: { seed: s.seed },
      });
    }

    return { seeded: seeds.length };
  }
}