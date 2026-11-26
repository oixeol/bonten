import { Module } from '@nestjs/common';
import { CompetitiveIntegrityService } from './competitive-integrity.service';

@Module({
  providers: [CompetitiveIntegrityService],
  exports: [CompetitiveIntegrityService],
})
export class CompetitiveIntegrityModule {}