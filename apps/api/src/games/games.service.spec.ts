import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  game: {
    findMany: jest.fn().mockResolvedValue([{ slug: 'lol', name: 'League of Legends' }]),
    findUnique: jest.fn().mockResolvedValue({ slug: 'lol', name: 'League of Legends' }),
    upsert: jest.fn().mockResolvedValue({ slug: 'lol' }),
  },
};

describe('GamesService', () => {
  let service: GamesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<GamesService>(GamesService);
  });

  it('should list games', async () => {
    const games = await service.findAll();
    expect(games).toHaveLength(1);
  });

  it('should find game by slug', async () => {
    const game = await service.findBySlug('lol');
    expect(game?.slug).toBe('lol');
  });

  it('should seed 4 games', async () => {
    const result = await service.seed();
    expect(result.seeded).toBe(4);
  });
});