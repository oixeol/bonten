import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  teamMember: {
    findMany: jest.fn(),
  },
};

describe('TeamsService', () => {
  let service: TeamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<TeamsService>(TeamsService);
    jest.clearAllMocks();
  });

  it('lists only teams the current user actively belongs to', async () => {
    mockPrisma.teamMember.findMany.mockResolvedValue([{ teamId: 'team-id' }]);

    await expect(service.listMine('user-id')).resolves.toEqual(['team-id']);
    expect(mockPrisma.teamMember.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-id', leftAt: null },
      select: { teamId: true },
    });
  });
});
