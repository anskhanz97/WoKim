import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  PreconditionFailedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  mkdir,
  rename,
  stat,
  statfs,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { environment } from '../config/environment';
import { AttachmentEntity } from '../database/entities/attachment.entity';
import { CommandReceiptEntity } from '../database/entities/command-receipt.entity';
import { EntryRevisionEntity } from '../database/entities/entry-revision.entity';
import { EntryEntity } from '../database/entities/entry.entity';
import { ProcessingJobEntity } from '../database/entities/processing-job.entity';
import { PersonEntity } from '../database/entities/person.entity';
import { ProjectEntity } from '../database/entities/project.entity';
import { TaskEntity } from '../database/entities/task.entity';
import type {
  CaptureMetadataDto,
  EntryQueryDto,
  UpdateAttachmentDto,
  UpdateEntryDto,
} from './entries.dto';
import { detectMedia } from './media-signature';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
interface StoredFile {
  entity: AttachmentEntity;
  absolutePath: string;
}

@Injectable()
export class EntriesService {
  private readonly storageRoot = resolve(environment().storageRoot);
  private readonly storageUploadStopPercent =
    environment().storageUploadStopPercent;
  private readonly storageMinimumFreeBytes =
    environment().storageMinimumFreeBytes;
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(EntryEntity)
    private readonly entries: Repository<EntryEntity>,
    @InjectRepository(AttachmentEntity)
    private readonly attachments: Repository<AttachmentEntity>,
    @InjectRepository(EntryRevisionEntity)
    private readonly revisions: Repository<EntryRevisionEntity>,
    @InjectRepository(CommandReceiptEntity)
    private readonly receipts: Repository<CommandReceiptEntity>,
    @InjectRepository(ProcessingJobEntity)
    private readonly jobs: Repository<ProcessingJobEntity>,
  ) {}

  async list(filters: EntryQueryDto) {
    this.assertDateRange(filters.from, filters.to);
    const query = this.entries
      .createQueryBuilder('entry')
      .where('entry.trashed_at IS NULL')
      .andWhere('entry.inbox_state=:state', {
        state: filters.state || 'unprocessed',
      });
    if (filters.projectId)
      query.andWhere('entry.project_id=:projectId', {
        projectId: filters.projectId,
      });
    if (filters.taskId)
      query.andWhere('entry.task_id=:taskId', { taskId: filters.taskId });
    if (filters.personId)
      query.andWhere('entry.sender_person_id=:personId', {
        personId: filters.personId,
      });
    if (filters.type)
      query.andWhere('entry.entry_type=:type', { type: filters.type });
    if (filters.from)
      query.andWhere('COALESCE(entry.occurred_at,entry.created_at)>=:from', {
        from: filters.from,
      });
    if (filters.to)
      query.andWhere('COALESCE(entry.occurred_at,entry.created_at)<=:to', {
        to: `${filters.to.slice(0, 10)} 23:59:59.999`,
      });
    const entries = await query
      .orderBy('entry.created_at', 'DESC')
      .addOrderBy('entry.id', 'ASC')
      .getMany();
    if (!entries.length) return [];
    const attachments = await this.attachments.find({
      where: {
        entryId: In(entries.map((entry) => entry.id)),
        trashedAt: IsNull(),
      },
      order: { createdAt: 'ASC' },
    });
    const attachmentIds = attachments.map((attachment) => attachment.id);
    const jobs = attachmentIds.length
      ? await this.jobs.find({ where: { attachmentId: In(attachmentIds) } })
      : [];
    const statusRank: Record<string, number> = {
      failed: 4,
      running: 3,
      queued: 2,
      completed: 1,
    };
    return entries.map((entry) => {
      const files = attachments.filter(
        (attachment) => attachment.entryId === entry.id,
      );
      const statuses = jobs
        .filter(
          (job) =>
            job.attachmentId &&
            files.some((file) => file.id === job.attachmentId),
        )
        .map((job) => job.status)
        .sort(
          (left, right) => (statusRank[right] || 0) - (statusRank[left] || 0),
        );
      return {
        ...entry,
        attachments: files.map((file) => this.attachmentView(file)),
        processingState: statuses[0] || (files.length ? 'not requested' : null),
      };
    });
  }

  private assertDateRange(from?: string, to?: string) {
    if (!from || !to) return;
    const start = new Date(from),
      end = new Date(to);
    if (start > end || end.valueOf() - start.valueOf() > 366 * 86400000)
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message:
          'The entry date range must be ordered and no longer than 366 days.',
      });
  }
  async get(id: string) {
    const entry = await this.entries.findOneBy({ id, trashedAt: IsNull() });
    if (!entry)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Entry not found.',
      });
    const attachments = await this.attachments.find({
      where: { entryId: id, trashedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    return {
      ...entry,
      attachments: attachments.map((file) => this.attachmentView(file)),
    };
  }
  async revisionsFor(id: string) {
    await this.get(id);
    return this.revisions.find({
      where: { entryId: id },
      order: { revisionNo: 'DESC' },
    });
  }
  async job(id: string) {
    const job = await this.jobs.findOneBy({ id });
    if (!job)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Job not found.',
      });
    return {
      id: job.id,
      kind: job.kind,
      attachmentId: job.attachmentId,
      status: job.status,
      result: job.result,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      lastErrorCode: job.lastErrorCode,
      lastErrorMessage: job.lastErrorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  async capture(
    key: string,
    metadata: CaptureMetadataDto,
    files: UploadedFile[],
  ) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key,
      )
    )
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Idempotency-Key must be a UUID.',
      });
    const text = metadata.contentText?.trim() || null;
    if (!text && files.length === 0)
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Add text or at least one file.',
      });
    if (files.length > 20)
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'At most 20 files may be attached.',
      });
    if (files.reduce((total, file) => total + file.size, 0) > 75 * 1024 * 1024)
      throw new PayloadTooLargeException({
        code: 'UPLOAD_TOO_LARGE',
        message: 'The capture exceeds the 75 MiB aggregate upload limit.',
      });
    const fileHashes = files.map((file) =>
      createHash('sha256').update(file.buffer).digest('hex'),
    );
    const requestHash = createHash('sha256')
      .update(JSON.stringify(metadata))
      .update(fileHashes.join(':'))
      .digest();
    const prior = await this.receipts.findOneBy({ commandKey: key });
    if (prior) {
      if (!prior.requestHash.equals(requestHash))
        throw new ConflictException({
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'That command key was already used for different content.',
        });
      return prior.result;
    }
    let projectId = metadata.projectId || null;
    if (metadata.taskId) {
      const task = await this.dataSource.manager.findOneBy(TaskEntity, {
        id: metadata.taskId,
        trashedAt: IsNull(),
      });
      if (!task)
        throw new BadRequestException({
          code: 'RELATIONSHIP_INVALID',
          message: 'The selected task is unavailable.',
        });
      if (projectId && projectId !== task.projectId)
        throw new ConflictException({
          code: 'RELATIONSHIP_INVALID',
          message: 'The selected task belongs to a different project.',
        });
      projectId = task.projectId;
    }
    if (
      projectId &&
      !(await this.dataSource.manager.findOneBy(ProjectEntity, {
        id: projectId,
      }))
    )
      throw new BadRequestException({
        code: 'RELATIONSHIP_INVALID',
        message: 'The selected project is unavailable.',
      });
    if (
      metadata.senderPersonId &&
      !(await this.dataSource.manager.findOneBy(PersonEntity, {
        id: metadata.senderPersonId,
      }))
    )
      throw new BadRequestException({
        code: 'RELATIONSHIP_INVALID',
        message: 'The selected person is unavailable.',
      });
    const entry = this.entries.create({
      id: randomUUID(),
      projectId,
      taskId: metadata.taskId || null,
      title: metadata.title?.trim() || null,
      entryType: metadata.entryType || 'note',
      inboxState: projectId ? 'organized' : 'unprocessed',
      sourceKind: metadata.sourceKind || (files.length ? 'upload' : 'typed'),
      originalText: text,
      contentText: text,
      sourceUrl: metadata.sourceUrl || null,
      sourceLabel: metadata.sourceLabel?.trim() || null,
      senderPersonId: metadata.senderPersonId || null,
      occurredAt: metadata.occurredAt ? new Date(metadata.occurredAt) : null,
      occurredTimezone: metadata.occurredTimezone || null,
      trashedAt: null,
    });
    const stored: StoredFile[] = [];
    try {
      for (const [index, file] of files.entries())
        stored.push(await this.store(entry.id, file, fileHashes[index]));
      if (metadata.attachmentPurpose)
        for (const item of stored)
          item.entity.purpose = metadata.attachmentPurpose;
      const result = await this.dataSource.transaction(async (manager) => {
        await manager.save(entry);
        if (stored.length)
          await manager.save(stored.map((item) => item.entity));
        const jobs = stored.map((item) =>
          manager.create(ProcessingJobEntity, {
            id: randomUUID(),
            kind: 'inspect_media',
            attachmentId: item.entity.id,
            status: 'queued',
            input: {},
            result: null,
            attempts: 0,
            maxAttempts: 3,
            availableAt: new Date(),
            leaseToken: null,
            leaseExpiresAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            dedupeKey: `inspect_media:${item.entity.id}`,
          }),
        );
        const processingSettings = (
          await manager.query<Array<{ transcriptionEnabled: number }>>(
            'SELECT transcription_enabled transcriptionEnabled FROM processing_settings WHERE id=1',
          )
        )[0];
        const transcribeAudio =
          metadata.transcribeAudio ??
          Boolean(processingSettings?.transcriptionEnabled);
        if (transcribeAudio) {
          for (const item of stored.filter((storedItem) =>
            storedItem.entity.mimeType.startsWith('audio/'),
          ))
            jobs.push(
              manager.create(ProcessingJobEntity, {
                id: randomUUID(),
                kind: 'transcribe',
                attachmentId: item.entity.id,
                status: 'queued',
                input: {},
                result: null,
                attempts: 0,
                maxAttempts: 3,
                availableAt: new Date(),
                leaseToken: null,
                leaseExpiresAt: null,
                lastErrorCode: null,
                lastErrorMessage: null,
                dedupeKey: `transcribe:${item.entity.id}`,
              }),
            );
        }
        if (jobs.length) await manager.save(jobs);
        await manager.query(
          'INSERT INTO activity_events (id,event_type,project_id,entry_id,payload) VALUES (?,?,?,?,?)',
          [
            randomUUID(),
            'entry.captured',
            entry.projectId,
            entry.id,
            JSON.stringify({ attachmentCount: stored.length }),
          ],
        );
        const view = {
          ...entry,
          attachments: stored.map((item) => this.attachmentView(item.entity)),
          inspectionJobIds: jobs.map((job) => job.id),
        };
        await manager.save(
          manager.create(CommandReceiptEntity, {
            commandKey: key,
            operation: 'entries.capture',
            requestHash,
            resultStatus: 201,
            result: view,
            expiresAt: new Date(Date.now() + 7 * 86400000),
          }),
        );
        return view;
      });
      return result;
    } catch (error) {
      await Promise.all(
        stored.map((item) => unlink(item.absolutePath).catch(() => undefined)),
      );
      throw error;
    }
  }

  async addAttachments(
    entryId: string,
    version: number,
    files: UploadedFile[],
  ) {
    if (!files.length)
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Add at least one file.',
      });
    if (files.reduce((total, file) => total + file.size, 0) > 75 * 1024 * 1024)
      throw new PayloadTooLargeException({
        code: 'UPLOAD_TOO_LARGE',
        message: 'The attachment upload exceeds the 75 MiB aggregate limit.',
      });
    const stored: StoredFile[] = [];
    try {
      for (const file of files) {
        const hash = createHash('sha256').update(file.buffer).digest('hex');
        stored.push(await this.store(entryId, file, hash));
      }
      return await this.dataSource.transaction(async (manager) => {
        const entry = await manager.findOne(EntryEntity, {
          where: { id: entryId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!entry || entry.trashedAt)
          throw new NotFoundException({
            code: 'NOT_FOUND',
            message: 'Entry not found.',
          });
        if (entry.version !== version)
          throw new PreconditionFailedException({
            code: 'VERSION_CONFLICT',
            message: 'The entry changed elsewhere. Reload before adding files.',
          });
        await manager.save(stored.map((item) => item.entity));
        await manager.save(
          stored.map((item) =>
            manager.create(ProcessingJobEntity, {
              id: randomUUID(),
              kind: 'inspect_media',
              attachmentId: item.entity.id,
              status: 'queued',
              input: {},
              result: null,
              attempts: 0,
              maxAttempts: 3,
              availableAt: new Date(),
              leaseToken: null,
              leaseExpiresAt: null,
              lastErrorCode: null,
              lastErrorMessage: null,
              dedupeKey: `inspect_media:${item.entity.id}`,
            }),
          ),
        );
        entry.version += 1;
        await manager.save(entry);
        await manager.query(
          'INSERT INTO activity_events (id,event_type,project_id,entry_id,payload) VALUES (?,?,?,?,?)',
          [
            randomUUID(),
            'entry.attachments_added',
            entry.projectId,
            entry.id,
            JSON.stringify({ attachmentCount: stored.length }),
          ],
        );
        const attachments = await manager.find(AttachmentEntity, {
          where: { entryId, trashedAt: IsNull() },
          order: { createdAt: 'ASC' },
        });
        return {
          ...entry,
          attachments: attachments.map((file) => this.attachmentView(file)),
        };
      });
    } catch (error) {
      await Promise.all(
        stored.map((item) => unlink(item.absolutePath).catch(() => undefined)),
      );
      throw error;
    }
  }

  async update(id: string, version: number, input: UpdateEntryDto) {
    return this.dataSource.transaction(async (manager) => {
      const entry = await manager.findOne(EntryEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!entry || entry.trashedAt)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Entry not found.',
        });
      if (entry.version !== version)
        throw new PreconditionFailedException({
          code: 'VERSION_CONFLICT',
          message: 'This entry changed elsewhere. Reload before saving.',
        });
      let targetProjectId =
        input.projectId !== undefined
          ? input.projectId || null
          : entry.projectId;
      const targetTaskId =
        input.taskId !== undefined ? input.taskId || null : entry.taskId;
      if (targetTaskId) {
        const task = await manager.findOneBy(TaskEntity, {
          id: targetTaskId,
          trashedAt: IsNull(),
        });
        if (!task)
          throw new BadRequestException({
            code: 'RELATIONSHIP_INVALID',
            message: 'The selected task is unavailable.',
          });
        if (targetProjectId && targetProjectId !== task.projectId)
          throw new ConflictException({
            code: 'RELATIONSHIP_INVALID',
            message: 'The selected task belongs to a different project.',
          });
        targetProjectId = task.projectId;
      }
      if (targetProjectId) {
        const project = await manager.findOneBy(ProjectEntity, {
          id: targetProjectId,
        });
        if (!project)
          throw new BadRequestException({
            code: 'RELATIONSHIP_INVALID',
            message: 'The selected project is unavailable.',
          });
      }
      if (input.senderPersonId) {
        const person = await manager.findOneBy(PersonEntity, {
          id: input.senderPersonId,
        });
        if (!person)
          throw new BadRequestException({
            code: 'RELATIONSHIP_INVALID',
            message: 'The selected person is unavailable.',
          });
      }
      const contentChanged =
        input.contentText !== undefined || input.title !== undefined;
      if (contentChanged) {
        const revisionNo =
          (await manager.count(EntryRevisionEntity, {
            where: { entryId: id },
          })) + 1;
        await manager.save(
          manager.create(EntryRevisionEntity, {
            id: randomUUID(),
            entryId: id,
            revisionNo,
            title: entry.title,
            contentText: entry.contentText,
            changeReason: input.changeReason?.trim() || null,
          }),
        );
      }
      if (input.title !== undefined) entry.title = input.title?.trim() || null;
      if (input.contentText !== undefined)
        entry.contentText = input.contentText?.trim() || null;
      if (input.entryType !== undefined) entry.entryType = input.entryType;
      if (input.inboxState !== undefined) entry.inboxState = input.inboxState;
      if (input.projectId !== undefined || input.taskId !== undefined) {
        entry.projectId = targetProjectId;
        entry.taskId = targetTaskId;
        if (entry.projectId && entry.inboxState === 'unprocessed')
          entry.inboxState = 'organized';
      }
      if (input.senderPersonId !== undefined)
        entry.senderPersonId = input.senderPersonId || null;
      entry.version += 1;
      await manager.save(entry);
      await manager.query(
        'INSERT INTO activity_events (id,event_type,project_id,entry_id,payload) VALUES (?,?,?,?,?)',
        [
          randomUUID(),
          'entry.updated',
          entry.projectId,
          entry.id,
          JSON.stringify({ contentChanged }),
        ],
      );
      const attachments = await manager.find(AttachmentEntity, {
        where: { entryId: id, trashedAt: IsNull() },
        order: { createdAt: 'ASC' },
      });
      return {
        ...entry,
        attachments: attachments.map((file) => this.attachmentView(file)),
      };
    });
  }

  async trash(id: string, version: number): Promise<void> {
    const result = await this.entries
      .createQueryBuilder()
      .update()
      .set({ trashedAt: new Date(), version: () => 'version + 1' })
      .where('id = :id AND version = :version AND trashed_at IS NULL', {
        id,
        version,
      })
      .execute();
    if (result.affected !== 1)
      throw new PreconditionFailedException({
        code: 'VERSION_CONFLICT',
        message: 'Entry changed elsewhere or no longer exists.',
      });
  }

  async updateAttachment(
    id: string,
    parentVersion: number,
    input: UpdateAttachmentDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const attachment = await manager.findOneBy(AttachmentEntity, {
        id,
        trashedAt: IsNull(),
      });
      if (!attachment)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Attachment not found.',
        });
      const entry = await manager.findOne(EntryEntity, {
        where: { id: attachment.entryId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!entry || entry.version !== parentVersion)
        throw new PreconditionFailedException({
          code: 'VERSION_CONFLICT',
          message: 'The parent entry changed elsewhere. Reload before saving.',
        });
      if (input.purpose !== undefined) attachment.purpose = input.purpose;
      if (input.caption !== undefined)
        attachment.caption = input.caption?.trim() || null;
      if (input.ocrEnabled !== undefined)
        attachment.ocrEnabled = input.ocrEnabled;
      await manager.save(attachment);
      if (
        input.ocrEnabled === true &&
        attachment.mimeType.startsWith('image/') &&
        !(await manager.findOne(ProcessingJobEntity, {
          where: [
            { attachmentId: id, kind: 'ocr', status: 'queued' },
            { attachmentId: id, kind: 'ocr', status: 'running' },
          ],
        }))
      )
        await manager.save(
          manager.create(ProcessingJobEntity, {
            id: randomUUID(),
            kind: 'ocr',
            attachmentId: id,
            status: 'queued',
            input: {},
            result: null,
            attempts: 0,
            maxAttempts: 3,
            availableAt: new Date(),
            leaseToken: null,
            leaseExpiresAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            dedupeKey: `ocr:${id}`,
          }),
        );
      entry.version += 1;
      await manager.save(entry);
      const attachments = await manager.find(AttachmentEntity, {
        where: { entryId: entry.id, trashedAt: IsNull() },
        order: { createdAt: 'ASC' },
      });
      return {
        ...entry,
        attachments: attachments.map((file) => this.attachmentView(file)),
      };
    });
  }

  async trashAttachment(id: string, parentVersion: number) {
    return this.dataSource.transaction(async (manager) => {
      const attachment = await manager.findOneBy(AttachmentEntity, {
        id,
        trashedAt: IsNull(),
      });
      if (!attachment)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Attachment not found.',
        });
      const entry = await manager.findOne(EntryEntity, {
        where: { id: attachment.entryId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!entry || entry.version !== parentVersion)
        throw new PreconditionFailedException({
          code: 'VERSION_CONFLICT',
          message: 'The parent entry changed elsewhere. Reload before saving.',
        });
      attachment.trashedAt = new Date();
      await manager.save(attachment);
      await manager.update(
        ProcessingJobEntity,
        { attachmentId: id, status: 'queued' },
        { status: 'cancelled' },
      );
      entry.version += 1;
      await manager.save(entry);
      const attachments = await manager.find(AttachmentEntity, {
        where: { entryId: entry.id, trashedAt: IsNull() },
        order: { createdAt: 'ASC' },
      });
      return {
        ...entry,
        attachments: attachments.map((file) => this.attachmentView(file)),
      };
    });
  }

  async content(id: string, variant: 'original' | 'playback' = 'original') {
    const file = await this.attachments.findOneBy({ id, trashedAt: IsNull() });
    if (!file)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Attachment not found.',
      });
    const storageKey =
      variant === 'playback' ? file.playbackKey : file.storageKey;
    if (!storageKey)
      throw new ConflictException({
        code: 'PROCESSING_UNAVAILABLE',
        message: 'Audio playback is not ready.',
      });
    const absolutePath = resolve(this.storageRoot, storageKey);
    if (!absolutePath.startsWith(this.storageRoot))
      throw new NotFoundException();
    const info = await stat(absolutePath).catch(() => null);
    if (!info)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Stored file is unavailable.',
      });
    return {
      file:
        variant === 'playback'
          ? {
              ...file,
              mimeType: 'audio/mpeg',
              originalName: `${file.originalName.replace(/\.[^.]+$/, '')}.mp3`,
            }
          : file,
      absolutePath,
      size: info.size,
      stream: (start?: number, end?: number) =>
        createReadStream(absolutePath, { start, end }),
    };
  }

  async thumbnail(id: string) {
    const file = await this.attachments.findOneBy({ id, trashedAt: IsNull() });
    if (!file?.thumbnailKey)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Thumbnail is not available.',
      });
    const absolutePath = resolve(this.storageRoot, file.thumbnailKey);
    if (!absolutePath.startsWith(this.storageRoot))
      throw new NotFoundException();
    const info = await stat(absolutePath).catch(() => null);
    if (!info)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Thumbnail is unavailable.',
      });
    return { size: info.size, stream: () => createReadStream(absolutePath) };
  }

  async playback(id: string) {
    const stored = await this.attachments.findOneBy({
      id,
      trashedAt: IsNull(),
    });
    if (!stored?.mimeType.startsWith('audio/') || stored.mediaState !== 'ready')
      throw new ConflictException({
        code: 'PROCESSING_UNAVAILABLE',
        message: 'Audio playback is not ready.',
      });
    return this.content(id, 'playback');
  }

  private async store(
    entryId: string,
    file: UploadedFile,
    hexHash: string,
  ): Promise<StoredFile> {
    const detected = detectMedia(file.buffer);
    if (!detected)
      throw new UnsupportedMediaTypeException({
        code: 'UNSUPPORTED_MEDIA',
        message: `${file.originalname} is not a supported image or audio file.`,
      });
    const max = detected.mimeType.startsWith('image/')
      ? 10 * 1024 * 1024
      : 50 * 1024 * 1024;
    if (file.size > max)
      throw new PayloadTooLargeException({
        code: 'UPLOAD_TOO_LARGE',
        message: `${file.originalname} exceeds the allowed size.`,
      });
    const id = randomUUID();
    const now = new Date();
    const key = join(
      'originals',
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      `${id}${detected.extension}`,
    );
    const absolutePath = resolve(this.storageRoot, key);
    const tempPath = `${absolutePath}.part`;
    await mkdir(resolve(absolutePath, '..'), { recursive: true });
    const disk = await statfs(this.storageRoot);
    const totalBytes = disk.blocks * disk.bsize;
    const projectedFreeBytes = disk.bavail * disk.bsize - file.size;
    const projectedUsedPercent =
      ((totalBytes - projectedFreeBytes) / totalBytes) * 100;
    if (
      projectedFreeBytes < this.storageMinimumFreeBytes ||
      projectedUsedPercent >= this.storageUploadStopPercent
    ) {
      throw new HttpException(
        {
          code: 'STORAGE_HIGH_WATER',
          message:
            'The private storage volume is near its configured limit. Free space or move data before uploading another file.',
        },
        HttpStatus.INSUFFICIENT_STORAGE,
      );
    }
    await writeFile(tempPath, file.buffer, { flag: 'wx' });
    await rename(tempPath, absolutePath);
    return {
      absolutePath,
      entity: this.attachments.create({
        id,
        entryId,
        originalName: file.originalname.slice(0, 255),
        storageKey: key.replaceAll('\\', '/'),
        mimeType: detected.mimeType,
        byteSize: String(file.size),
        sha256: Buffer.from(hexHash, 'hex'),
        purpose: 'reference',
        caption: null,
        width: null,
        height: null,
        durationMs: null,
        thumbnailKey: null,
        playbackKey: null,
        mediaState: 'pending',
        ocrEnabled: false,
        trashedAt: null,
      }),
    };
  }
  private attachmentView(file: AttachmentEntity) {
    return {
      id: file.id,
      entryId: file.entryId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      byteSize: Number(file.byteSize),
      purpose: file.purpose,
      caption: file.caption,
      mediaState: file.mediaState,
      width: file.width,
      height: file.height,
      durationMs: file.durationMs,
      ocrEnabled: file.ocrEnabled,
      createdAt: file.createdAt,
    };
  }
}
