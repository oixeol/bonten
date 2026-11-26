import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import {
  type SessionResponse,
  type PublicUser,
} from '@bonten/shared';
import { AuthService } from './auth.service';
import { SessionService, newCsrfToken } from './session.service';
import { AuthGuard } from './auth.guard';
import { CsrfGuard, CSRF_COOKIE, CsrfExempt } from './csrf.guard';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticatedRequest } from './types';
import { SID_COOKIE } from './session-resolver.guard';

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false, // em prod = true
  sameSite: 'lax' as const,
  path: '/',
};

const CSRF_COOKIE_OPTIONS = {
  httpOnly: false, // JavaScript precisa ler para double-submit
  secure: false, // em prod = true
  sameSite: 'lax' as const, // 3000→4000 é same-site (porta não faz parte do site)
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @CsrfExempt()
  @UseGuards(CsrfGuard)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    const { user } = await this.auth.register(dto);
    const csrf = newCsrfToken();
    const token = await this.sessions.create(user.id, csrf);
    this.setAuthCookies(res, token, csrf);
    return { user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @CsrfExempt()
  @UseGuards(CsrfGuard)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    const user = await this.auth.login(dto.identifier, dto.password);
    const csrf = newCsrfToken();
    const token = await this.sessions.create(user.id, csrf);
    this.setAuthCookies(res, token, csrf);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = req.cookies?.[SID_COOKIE];
    if (token) await this.sessions.destroy(token);
    this.clearAuthCookies(res);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: PublicUser): { user: PublicUser } {
    return { user };
  }

  @Get('csrf-token')
  @UseGuards(AuthGuard)
  async csrfToken(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ csrfToken: string }> {
    const csrf = newCsrfToken();
    const token = req.cookies?.[SID_COOKIE];
    if (!token) {
      // Não deveria acontecer (AuthGuard garante req.user); defensivo.
      throw new UnauthorizedException();
    }
    await this.sessions.rotateCsrf(token, csrf);
    const isProd = this.config.get<string>('nodeEnv') === 'production';
    res.cookie(CSRF_COOKIE, csrf, {
      ...CSRF_COOKIE_OPTIONS,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 86400000,
    });
    return { csrfToken: csrf };
  }

  private setAuthCookies(
    res: Response,
    token: string,
    csrf: string,
  ): void {
    const isProd = this.config.get<string>('nodeEnv') === 'production';
    res.cookie(SID_COOKIE, token, {
      ...SESSION_COOKIE_OPTIONS,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 86400000,
    });
    // 3000→4000 é same-site (porta não faz parte do site), então SameSite=Lax
    // basta e evita o requisito Secure que faria o browser rejeitar em http.
    res.cookie(CSRF_COOKIE, csrf, {
      ...CSRF_COOKIE_OPTIONS,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 86400000,
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(SID_COOKIE, SESSION_COOKIE_OPTIONS);
    res.clearCookie(CSRF_COOKIE, CSRF_COOKIE_OPTIONS);
  }
}