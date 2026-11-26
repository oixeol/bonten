import { Module } from '@nestjs/common';
import { PenaltiesService } from './penalties.service';

@Module({
  providers: [PenaltiesService],
  exports: [PenaltiesService],
})
export class PenaltiesModule {}