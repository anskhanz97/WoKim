import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Response } from 'express';
import { entityTag, parseIfMatch } from '../common/http-version';
import { ListQueryDto, paginate } from '../common/pagination';
import {
  CaptureMetadataDto,
  EntryQueryDto,
  UpdateAttachmentDto,
  UpdateEntryDto,
} from './entries.dto';
import { EntriesService, type UploadedFile } from './entries.service';

@ApiCookieAuth()
@ApiTags('entries')
@Controller()
export class EntriesController {
  constructor(private readonly service: EntriesService) {}
  @Get('entries') async list(@Query() query: EntryQueryDto) {
    return paginate(await this.service.list(query), query);
  }
  @Post('entries')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: { files: 20, fileSize: 50 * 1024 * 1024, fieldSize: 1024 * 1024 },
    }),
  )
  async capture(
    @Headers('idempotency-key') key: string | undefined,
    @Body('metadata') raw: string,
    @UploadedFiles() files: UploadedFile[] = [],
    @Res({ passthrough: true }) response: Response,
  ) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw || '{}');
    } catch {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'metadata must be valid JSON.',
      });
    }
    const metadata = plainToInstance(CaptureMetadataDto, parsed);
    const errors = await validate(metadata, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length)
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Capture metadata is invalid.',
      });
    const data = await this.service.capture(key || '', metadata, files);
    response.status(201);
    return { data };
  }
  @Post('entries/:id/attachments')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: { files: 20, fileSize: 50 * 1024 * 1024 },
    }),
  )
  async addAttachments(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @UploadedFiles() files: UploadedFile[] = [],
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.addAttachments(
      id,
      parseIfMatch(tag),
      files,
    );
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Get('entries/:id') async get(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.get(id);
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Patch('entries/:id') async update(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: UpdateEntryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.update(id, parseIfMatch(tag), input);
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Get('entries/:id/revisions') async revisions(
    @Param('id') id: string,
    @Query() query: ListQueryDto,
  ) {
    return paginate(await this.service.revisionsFor(id), query);
  }
  @Delete('entries/:id') @HttpCode(204) async trash(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
  ) {
    await this.service.trash(id, parseIfMatch(tag));
  }
  @Patch('attachments/:id') async updateAttachment(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: UpdateAttachmentDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.updateAttachment(
      id,
      parseIfMatch(tag),
      input,
    );
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Delete('attachments/:id') async trashAttachment(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.trashAttachment(id, parseIfMatch(tag));
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Get('jobs/:id') async job(@Param('id') id: string) {
    return { data: await this.service.job(id) };
  }
  @Get('attachments/:id/thumbnail')
  @Header('Cache-Control', 'private, no-store')
  async thumbnail(@Param('id') id: string, @Res() response: Response) {
    const stored = await this.service.thumbnail(id);
    response.setHeader('Content-Type', 'image/webp');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Length', stored.size);
    stored.stream().pipe(response);
  }
  @Get('attachments/:id/playback')
  @Header('Cache-Control', 'private, no-store')
  async playback(
    @Param('id') id: string,
    @Headers('range') range: string | undefined,
    @Res() response: Response,
  ) {
    return this.sendContent(await this.service.playback(id), range, response);
  }
  @Get('attachments/:id/content')
  @Header('Cache-Control', 'private, no-store')
  async content(
    @Param('id') id: string,
    @Headers('range') range: string | undefined,
    @Res() response: Response,
  ) {
    return this.sendContent(await this.service.content(id), range, response);
  }
  private sendContent(
    stored: Awaited<ReturnType<EntriesService['content']>>,
    range: string | undefined,
    response: Response,
  ) {
    response.setHeader('Content-Type', stored.file.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(stored.file.originalName)}`,
    );
    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!match) {
        response.status(416).end();
        return;
      }
      const start = Number(match[1]);
      const end = match[2]
        ? Math.min(Number(match[2]), stored.size - 1)
        : stored.size - 1;
      if (start > end || start >= stored.size) {
        response.status(416).end();
        return;
      }
      response.status(206);
      response.setHeader(
        'Content-Range',
        `bytes ${start}-${end}/${stored.size}`,
      );
      response.setHeader('Content-Length', end - start + 1);
      stored.stream(start, end).pipe(response);
      return;
    }
    response.setHeader('Content-Length', stored.size);
    stored.stream().pipe(response);
  }
}
