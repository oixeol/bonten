import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IntegrityAlert {
  alert_id: string;
  type: string;
  severity: string;
  players: string[];
  justification: string;
  recommended_action: string;
}

@Injectable()
export class CompetitiveIntegrityService {
  private readonly logger = new Logger(CompetitiveIntegrityService.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('COMPETITIVE_INTEGRITY_URL') ?? 'http://localhost:8001';
  }

  async analyzeMatch(matchId: string, gameId: string, mode: string, players: string[], result: any, durationSeconds: number): Promise<IntegrityAlert[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${this.baseUrl}/analyze/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, game_slug: gameId, mode, players, result, duration_seconds: durationSeconds }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return [];
      return (await res.json()) as IntegrityAlert[];
    } catch (err) {
      this.logger.warn(`Competitive integrity unavailable: ${err}`);
      return [];
    }
  }

  async analyzeRatingChange(userId: string, gameId: string, oldRating: number, newRating: number, matchId: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/analyze/rating-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, game_id: gameId, old_rating: oldRating, new_rating: newRating, match_id: matchId }),
      });
      if (!res.ok) return { alerts: [] };
      return await res.json();
    } catch (err) {
      this.logger.warn(`Competitive integrity unavailable: ${err}`);
      return { alerts: [] };
    }
  }
}