import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportType, ReportStatus, ModerationActionType } from '@prisma/client';
import { AiModerationService } from '../ai-moderation/ai-moderation.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private aiModeration: AiModerationService,
  ) {}

  async createReport(userId: string, data: {
    targetId: string;
    type: ReportType;
    reason: string;
    evidenceUrl?: string;
  }) {
    if (userId === data.targetId) throw new ForbiddenException('Cannot report yourself');
    const report = await this.prisma.report.create({
      data: {
        reporterId: userId,
        targetId: data.targetId,
        type: data.type,
        reason: data.reason,
        evidenceUrl: data.evidenceUrl,
      },
    });

    // Avaliacao por IA (assincrona, nao bloqueia a resposta).
    void this.runAiAssessment(report.id, userId, data);

    return report;
  }

  private async runAiAssessment(reportId: string, _reporterId: string, data: {
    targetId: string;
    type: ReportType;
    reason: string;
    evidenceUrl?: string;
  }) {
    try {
      const assessment = await this.aiModeration.assess({
        report_id: reportId,
        target_type: 'user',
        category: data.type.toLowerCase(),
        reason: data.reason,
        evidence: data.evidenceUrl,
        reporter_history: {},
        target_history: {},
      });
      if (!assessment) return;

      // Regras de decisao (secao 10.2):
      // - Confianca alta + gravidade baixa: acao automatica reversivel (ocultar).
      // - Gravidade media ou confianca media: fila de moderadores.
      // - Gravidade alta: prioridade maxima, alerta imediato.
      // Banimentos/remocao sempre exigem confirmacao humana.
      let newStatus: ReportStatus = ReportStatus.PENDING;
      if (assessment.severity >= 4) {
        newStatus = ReportStatus.UNDER_REVIEW; // prioridade maxima
      } else if (assessment.recommended_action === 'auto_hide' && assessment.confidence >= 0.75) {
        newStatus = ReportStatus.RESOLVED; // acao automatica reversivel
      }

      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: newStatus,
          actionReason: `[IA] ${assessment.summary} ${assessment.justification}`,
        },
      });
    } catch (err) {
      // Falha silenciosa: report fica PENDING para revisao humana.
    }
  }

  async listPending(userId: string, adminOnly = false) {
    if (adminOnly) {
      // Only admins can see all pending reports; check role elsewhere
      return this.prisma.report.findMany({
        where: { status: ReportStatus.PENDING },
        include: { reporter: true, target: true },
        orderBy: { createdAt: 'desc' },
      });
    }
    // Regular users see only their own reports
    return this.prisma.report.findMany({
      where: { reporterId: userId },
      include: { reporter: true, target: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderate(userId: string, reportId: string, action: {
    status: ReportStatus;
    action?: ModerationActionType;
    reason?: string;
  }) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { reporter: true, target: true },
    });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== ReportStatus.PENDING) throw new ForbiddenException('Report already processed');

    await this.prisma.moderationLog.create({
      data: {
        moderatorId: userId,
        actionType: action.action ?? ModerationActionType.WARN,
        targetId: report.targetId,
        reason: action.reason,
        reportId: report.id,
      },
    });

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: action.status,
        reviewedBy: userId,
        action: action.action,
        actionReason: action.reason,
      },
    });
  }

  async userReportCount(userId: string) {
    const counts = await this.prisma.report.groupBy({
      by: ['status'],
      where: { targetId: userId },
      _count: true,
    });
    const result: Record<string, number> = {};
    for (const c of counts) result[c.status] = c._count;
    return result;
  }
}