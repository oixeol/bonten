import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiAssessment {
  report_id: string;
  suggested_category: string;
  severity: number;
  confidence: number;
  summary: string;
  justification: string;
  recommended_action: string;
  requires_human: boolean;
  patterns: string[];
}

@Injectable()
export class AiModerationService {
  private readonly logger = new Logger(AiModerationService.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('AI_MODERATION_URL') ?? 'http://localhost:8000';
  }

  async assess(report: {
    report_id: string;
    target_type: string;
    category: string;
    reason: string;
    evidence?: string;
    context?: string;
    reporter_history?: Record<string, any>;
    target_history?: Record<string, any>;
  }): Promise<AiAssessment | null> {
    try {
      const res = await fetch(`${this.baseUrl}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      if (!res.ok) {
        this.logger.warn(`AI moderation returned ${res.status}`);
        return null;
      }
      return (await res.json()) as AiAssessment;
    } catch (err) {
      this.logger.warn(`AI moderation unavailable: ${err}`);
      return null;
    }
  }

  async assessBatch(reports: any[]): Promise<AiAssessment[]> {
    try {
      const res = await fetch(`${this.baseUrl}/assess/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reports),
      });
      if (!res.ok) return [];
      return (await res.json()) as AiAssessment[];
    } catch (err) {
      this.logger.warn(`AI moderation batch unavailable: ${err}`);
      return [];
    }
  }
}