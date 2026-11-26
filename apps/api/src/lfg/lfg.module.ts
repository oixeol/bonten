import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { LfgController } from './lfg.controller';
import { LfgService } from './lfg.service';

@Module({
  imports: [AuthModule, PrismaModule, RealtimeModule],
  controllers: [LfgController],
  providers: [LfgService],
  exports: [LfgService],
})
export class LfgModule {}
