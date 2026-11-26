import {
  Controller,
  Post,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { imageSize } from 'image-size';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { PublicUser } from '@bonten/shared';

/** Arquivo enviado via multipart (campos usados aqui; multer adiciona buffer). */
interface UploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/**
 * Tamanhos de imagem aceitos por tipo de uso.
 * `w`/`h` = recomendado; `minW`/`minH` = mínimo aceito (proporção precisa bater).
 */
const IMAGE_SPECS: Record<string, { w: number; h: number; minW: number; minH: number }> = {
  avatar: { w: 1024, h: 1024, minW: 128, minH: 128 },
  serverIcon: { w: 512, h: 512, minW: 128, minH: 128 },
  banner: { w: 1360, h: 480, minW: 680, minH: 240 },
  serverBanner: { w: 1920, h: 1080, minW: 960, minH: 540 },
};

const ASPECT_TOLERANCE = 0.02;

/** Tipos de imagem que aceitam GIF apenas para usuários VIP. */
const VIP_GIF_KINDS = new Set(['avatar', 'serverIcon', 'banner', 'serverBanner']);

@Controller('uploads')
@UseGuards(AuthGuard)
@UseInterceptors(FileInterceptor('file'))
export class UploadsController {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('s3.endpoint') ?? '';
    const region = config.get<string>('s3.region') ?? 'us-east-1';
    const accessKey = config.get<string>('s3.accessKey') ?? '';
    const secretKey = config.get<string>('s3.secretKey') ?? '';
    this.bucket = config.get<string>('s3.bucket') ?? 'bonten-media';
    this.publicUrl = config.get<string>('s3.publicUrl') ?? '';

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: config.get<boolean>('s3.forcePathStyle') ?? true,
    });
  }

  @Post()
  async upload(
    @UploadedFile() file: UploadFile,
    @Body('kind') kind: string | undefined,
    @CurrentUser() user: PublicUser,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException({ code: 'file_required' });
    }

    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException({
        code: 'file_type_not_allowed',
        detail: `Allowed: ${[...ALLOWED_MIME].join(', ')}`,
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException({
        code: 'file_too_large',
        detail: `Max: ${MAX_FILE_SIZE / 1024 / 1024} MB`,
      });
    }

    // GIF em foto/ícone/banner é recurso VIP.
    if (
      file.mimetype === 'image/gif' &&
      kind &&
      VIP_GIF_KINDS.has(kind) &&
      !user.isVip
    ) {
      throw new ForbiddenException({ code: 'vip_required' });
    }

    // Valida dimensões quando `kind` tem preset (avatar, ícone, banner).
    if (kind && IMAGE_SPECS[kind]) {
      const spec = IMAGE_SPECS[kind];
      const dims = imageSize(file.buffer);
      if (!dims.width || !dims.height) {
        throw new BadRequestException({ code: 'image_unreadable' });
      }
      if (dims.width < spec.minW || dims.height < spec.minH) {
        throw new BadRequestException({
          code: 'image_too_small',
          detail: `${kind}: min ${spec.minW}×${spec.minH}`,
        });
      }
      const aspect = dims.width / dims.height;
      const expected = spec.w / spec.h;
      if (Math.abs(aspect - expected) > ASPECT_TOLERANCE) {
        throw new BadRequestException({
          code: 'image_wrong_aspect',
          detail: `${kind}: ${spec.w}×${spec.h}`,
        });
      }
    }

    const ext = MIME_TO_EXT[file.mimetype] ?? extname(file.originalname);
    const key = `u/${user.id}/${randomUUID()}${ext}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      const url = this.publicUrl
        ? `${this.publicUrl.replace(/\/$/, '')}/${key}`
        : `/${this.bucket}/${key}`;

      return { url };
    } catch {
      throw new HttpException(
        { code: 'upload_failed', detail: 'S3 upload failed' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}