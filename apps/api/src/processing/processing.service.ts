import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource, IsNull, Repository } from 'typeorm';
import { environment } from '../config/environment';
import { AttachmentEntity } from '../database/entities/attachment.entity';
import { DerivedTextEntity } from '../database/entities/derived-text.entity';
import { ProcessingJobEntity } from '../database/entities/processing-job.entity';
import { ProcessingSettingEntity } from '../database/entities/processing-setting.entity';
import type {
  RequestProcessingDto,
  UpdateProcessingSettingsDto,
} from './processing.dto';

@Injectable()
export class ProcessingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AttachmentEntity)
    private readonly attachments: Repository<AttachmentEntity>,
    @InjectRepository(ProcessingJobEntity)
    private readonly jobs: Repository<ProcessingJobEntity>,
    @InjectRepository(DerivedTextEntity)
    private readonly derivedTexts: Repository<DerivedTextEntity>,
    @InjectRepository(ProcessingSettingEntity)
    private readonly settingsRepository: Repository<ProcessingSettingEntity>,
  ) {}

  async settings() {
    const settings = await this.settingsRepository.findOneByOrFail({ id: 1 });
    const cacheRoot = resolve(environment().modelCacheRoot);
    return {
      ...settings,
      availability: {
        ocr: true,
        transcription: true,
        modelCached: existsSync(cacheRoot),
        cacheRoot,
      },
    };
  }

  async updateSettings(input: UpdateProcessingSettingsDto) {
    const settings = await this.settingsRepository.findOneByOrFail({ id: 1 });
    if (settings.version !== input.expectedVersion) throw this.stale();
    if (input.transcriptionEnabled !== undefined)
      settings.transcriptionEnabled = input.transcriptionEnabled;
    if (input.ocrLanguages !== undefined) {
      const languages = input.ocrLanguages.trim();
      if (!/^[a-z]{3}(\+[a-z]{3})*$/i.test(languages))
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'OCR languages must use values such as eng or eng+urd.',
        });
      settings.ocrLanguages = languages.toLowerCase();
    }
    if (input.transcriptionLanguage !== undefined)
      settings.transcriptionLanguage =
        input.transcriptionLanguage?.trim().toLowerCase() || null;
    if (input.modelId !== undefined) settings.modelId = input.modelId.trim();
    settings.version += 1;
    return this.settingsRepository.save(settings);
  }

  async request(attachmentId: string, input: RequestProcessingDto) {
    const attachment = await this.attachments.findOneBy({
      id: attachmentId,
      trashedAt: IsNull(),
    });
    if (!attachment)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Attachment not found.',
      });
    const kind = input.kind;
    if (kind === 'ocr' && !attachment.mimeType.startsWith('image/'))
      throw this.unsupported('OCR requires an image attachment.');
    if (kind === 'transcribe' && !attachment.mimeType.startsWith('audio/'))
      throw this.unsupported('Transcription requires an audio attachment.');
    const existing = await this.jobs.findOne({
      where: [
        { attachmentId, kind, status: 'queued' },
        { attachmentId, kind, status: 'running' },
      ],
      order: { createdAt: 'DESC' },
    });
    if (existing) return existing;
    const settings = await this.settingsRepository.findOneByOrFail({ id: 1 });
    if (kind === 'ocr' && !attachment.ocrEnabled) {
      attachment.ocrEnabled = true;
      await this.attachments.save(attachment);
    }
    return this.jobs.save(
      this.jobs.create({
        id: randomUUID(),
        kind,
        attachmentId,
        status: 'queued',
        input: {
          language:
            input.language ||
            (kind === 'ocr'
              ? settings.ocrLanguages
              : settings.transcriptionLanguage),
          modelId: kind === 'transcribe' ? settings.modelId : undefined,
        },
        result: null,
        attempts: 0,
        maxAttempts: 3,
        availableAt: new Date(),
        leaseToken: null,
        leaseExpiresAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        dedupeKey: `${kind}:${attachmentId}`,
      }),
    );
  }

  async texts(attachmentId: string) {
    const attachment = await this.attachments.findOneBy({
      id: attachmentId,
      trashedAt: IsNull(),
    });
    if (!attachment)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Attachment not found.',
      });
    return this.derivedTexts.find({
      where: { attachmentId },
      order: { kind: 'ASC', revisionNo: 'DESC', id: 'ASC' },
    });
  }

  async jobsFor(attachmentId: string) {
    const attachment = await this.attachments.findOneBy({
      id: attachmentId,
      trashedAt: IsNull(),
    });
    if (!attachment)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Attachment not found.',
      });
    return this.jobs.find({
      where: { attachmentId },
      order: { createdAt: 'DESC', id: 'ASC' },
    });
  }

  async review(id: string, expectedVersion: number, text: string) {
    return this.dataSource.transaction(async (manager) => {
      const derived = await manager.findOne(DerivedTextEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!derived)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Extracted text not found.',
        });
      if (!derived.isCurrent)
        throw new ConflictException({
          code: 'SUPERSEDED_OUTPUT',
          message: 'Review the current extraction revision instead.',
        });
      if (derived.version !== expectedVersion) throw this.stale();
      derived.reviewedText = text;
      derived.searchText = text;
      derived.version += 1;
      return manager.save(derived);
    });
  }

  async retry(id: string) {
    const job = await this.jobs.findOneBy({ id });
    if (!job)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Job not found.',
      });
    if (job.status !== 'failed')
      throw new ConflictException({
        code: 'JOB_NOT_RETRYABLE',
        message: 'Only a failed processing job can be retried.',
      });
    if (!job.attachmentId)
      throw new ConflictException({
        code: 'JOB_NOT_RETRYABLE',
        message: 'The processing job has no source attachment.',
      });
    const attachment = await this.attachments.findOneBy({
      id: job.attachmentId,
      trashedAt: IsNull(),
    });
    if (!attachment)
      throw new ConflictException({
        code: 'JOB_NOT_RETRYABLE',
        message: 'The source attachment is no longer available.',
      });
    const active = await this.jobs.findOne({
      where: [
        { attachmentId: job.attachmentId, kind: job.kind, status: 'queued' },
        { attachmentId: job.attachmentId, kind: job.kind, status: 'running' },
      ],
      order: { createdAt: 'DESC' },
    });
    if (active) return active;
    return this.jobs.save(
      this.jobs.create({
        id: randomUUID(),
        kind: job.kind,
        attachmentId: job.attachmentId,
        status: 'queued',
        input: job.input,
        result: null,
        attempts: 0,
        maxAttempts: job.maxAttempts,
        availableAt: new Date(),
        leaseToken: null,
        leaseExpiresAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        dedupeKey: job.dedupeKey,
      }),
    );
  }

  private unsupported(message: string) {
    return new BadRequestException({ code: 'UNSUPPORTED_PROCESSING', message });
  }
  private stale() {
    return new PreconditionFailedException({
      code: 'VERSION_CONFLICT',
      message: 'The processing record changed elsewhere.',
    });
  }
}
