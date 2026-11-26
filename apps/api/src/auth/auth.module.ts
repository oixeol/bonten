import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { SessionResolverGuard } from './session-resolver.guard';
import { CsrfGuard } from './csrf.guard';
import { AllExceptionsFilter } from '../common/all-exceptions.filter';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    // Ordem importa: resolve sessão antes do CSRF.
    { provide: APP_GUARD, useClass: SessionResolverGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  exports: [AuthService, SessionService],
})
export class AuthModule {}