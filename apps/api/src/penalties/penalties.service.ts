import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type PenaltyLevel = 'warning' | 'rating_loss' | 'result_annulment' | 'queue_restriction' | 'suspension' | 'ban';

const PENALTY_PROGRESSION: PenaltyLevel[] = [
  'warning', 'rating_loss', 'result_annulment', 'queue_restriction', 'suspension', 'ban',
];

@Injectable()
export class PenaltiesService {
  constructor(private prisma: PrismaService) {}

  async applyPenalty(userId: string, reason: string, level: PenaltyLevel, _matchId?: string, appliedBy?: string) {
    // Create a report (reusing existing Report model for competitive context)
    const report = await this.prisma.report.create({
      data: {
        reporterId: appliedBy || userId, // system or moderator
        targetId: userId,
        type: 'OTHER',
        reason: `[Competitive] ${reason}`,
        status: 'RESOLVED',
        action: level.toUpperCase() as any,
        actionReason: reason,
      },
    });

    await this.prisma.moderationLog.create({
      data: {
        moderatorId: appliedBy || userId,
        actionType: level.toUpperCase() as any,
        targetId: userId,
        reason,
        reportId: report.id,
      },
    });

    return { penalty: level, report };
  }

  async getUserPenalties(userId: string) {
    return this.prisma.report.findMany({
      where: { targetId: userId, reason: { startsWith: '[Competitive]' } },
      orderBy: { createdAt: 'desc' },
    });
  }

  getNextLevel(currentLevel: PenaltyLevel): PenaltyLevel {
    const idx = PENALTY_PROGRESSION.indexOf(currentLevel);
    if (idx === -1 || idx >= PENALTY_PROGRESSION.length - 1) return 'ban';
    return PENALTY_PROGRESSION[idx + 1];
  }
}