import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Garante o formato único de erro { code } em toda resposta de erro (seção 6.8).
 * O backend emite código estável; o frontend traduz.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'internal_error';
    let detail: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === 'string') {
        code = 'http_error';
      } else if (r && typeof r === 'object') {
        const body = r as Record<string, unknown>;
        code = (body.code as string) ?? 'http_error';
        detail = body.detail as string | undefined;
        // Validação do class-validator: message = string[].
        if (!body.code && Array.isArray(body.message)) {
          code = 'validation_failed';
        }
      }
    } else if (exception instanceof Error) {
      detail = process.env.NODE_ENV === 'production' ? undefined : exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} -> ${status} ${code}`);
    }

    res.status(status).json({ code, ...(detail ? { detail } : {}) });
  }
}