import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GAME_SEEDS = [
  { slug: 'lol', name: 'League of Legends', format: '5v5', teamSize: 5, playersPerMatch: 10, partySizesAllowed: [1, 2, 3, 5], roles: ['top', 'jungle', 'mid', 'adc', 'support'], hasMaps: false, hasTeams: true, ratingModel: 'elo' },
  { slug: 'valorant', name: 'Valorant', format: '5v5', teamSize: 5, playersPerMatch: 10, partySizesAllowed: [1, 2, 3, 5], roles: [], hasMaps: true, hasTeams: true, ratingModel: 'elo' },
  { slug: 'cs2', name: 'Counter-Strike 2', format: '5v5', teamSize: 5, playersPerMatch: 10, partySizesAllowed: [1, 2, 3, 5], roles: [], hasMaps: true, hasTeams: true, ratingModel: 'elo' },
  { slug: 'tft', name: 'Teamfight Tactics', format: '8-player-ffa', teamSize: 1, playersPerMatch: 8, partySizesAllowed: [1, 2], roles: [], hasMaps: false, hasTeams: false, ratingModel: 'placement' },
];

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.game.findMany({ orderBy: { name: 'asc' } });
  }

  async findBySlug(slug: string) {
    return this.prisma.game.findUnique({ where: { slug } });
  }

  async seed() {
    for (const g of GAME_SEEDS) {
      await this.prisma.game.upsert({
        where: { slug: g.slug },
        update: {
          playersPerMatch: g.playersPerMatch,
          roles: g.roles,
        },
        create: g,
      });
    }
    return { seeded: GAME_SEEDS.length };
  }
}