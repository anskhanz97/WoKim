import './config/load-environment';
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import { parseBuffer } from 'music-metadata';
import sharp from 'sharp';
import { AttachmentEntity } from './database/entities/attachment.entity';
import { ProcessingJobEntity } from './database/entities/processing-job.entity';
import { DerivedTextEntity } from './database/entities/derived-text.entity';
import { AppDataSource } from './database/data-source';
import { environment } from './config/environment';
import { detectMedia } from './entries/media-signature';

const root = resolve(environment().storageRoot);
const execFileAsync = promisify(execFile);

async function claim(): Promise<ProcessingJobEntity | null> {
  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    await runner.query(
      "UPDATE processing_jobs SET status='failed',lease_token=NULL,lease_expires_at=NULL,last_error_code='LEASE_EXPIRED',last_error_message='Worker lease expired after the final attempt.' WHERE status='running' AND lease_expires_at<NOW(3) AND attempts>=max_attempts",
    );
    await runner.query(
      "UPDATE processing_jobs SET status='queued',lease_token=NULL,lease_expires_at=NULL WHERE status='running' AND lease_expires_at<NOW(3) AND attempts<max_attempts",
    );
    const rows = (await runner.query(
      "SELECT id FROM processing_jobs WHERE status='queued' AND available_at<=NOW(3) ORDER BY available_at,id LIMIT 1 FOR UPDATE",
    )) as Array<{ id: string }>;
    if (!rows.length) {
      await runner.commitTransaction();
      return null;
    }
    const token = randomUUID();
    await runner.query(
      "UPDATE processing_jobs SET status='running',attempts=attempts+1,lease_token=?,lease_expires_at=DATE_ADD(NOW(3),INTERVAL 15 MINUTE) WHERE id=?",
      [token, rows[0].id],
    );
    await runner.commitTransaction();
    return AppDataSource.getRepository(ProcessingJobEntity).findOneByOrFail({
      id: rows[0].id,
    });
  } catch (error) {
    await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
  }
}

async function inspect(job: ProcessingJobEntity): Promise<void> {
  if (!job.attachmentId || !job.leaseToken)
    throw new Error('Inspection job is missing its attachment or lease.');
  const attachments = AppDataSource.getRepository(AttachmentEntity);
  const attachment = await attachments.findOneByOrFail({
    id: job.attachmentId,
  });
  const path = resolve(root, attachment.storageKey);
  if (!path.startsWith(root))
    throw new Error('Attachment storage key escaped the private root.');
  const bytes = await readFile(path);
  const media = detectMedia(bytes);
  const hash = createHash('sha256').update(bytes).digest();
  if (
    !media ||
    media.mimeType !== attachment.mimeType ||
    !hash.equals(attachment.sha256)
  )
    throw new Error('Stored media failed integrity or signature inspection.');
  const dimensions =
    media.mimeType === 'image/png' && bytes.length >= 24
      ? { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
      : { width: null, height: null };
  let durationMs: number | null = null;
  let thumbnailKey: string | null = null;
  let playbackKey: string | null = null;
  if (media.mimeType.startsWith('image/')) {
    thumbnailKey = `thumbnails/${attachment.id}.webp`;
    const thumbnailPath = resolve(root, thumbnailKey);
    const temporaryPath = `${thumbnailPath}.${job.leaseToken}.part`;
    await mkdir(dirname(thumbnailPath), { recursive: true });
    const info = await sharp(bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: 480,
        height: 480,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toFile(temporaryPath);
    dimensions.width = info.width;
    dimensions.height = info.height;
    await rename(temporaryPath, thumbnailPath);
  } else if (media.mimeType.startsWith('audio/')) {
    const metadata = await parseBuffer(
      bytes,
      { mimeType: media.mimeType, size: bytes.length },
      { duration: true, skipCovers: true },
    );
    const durationSeconds = metadata.format.duration;
    if (!durationSeconds || !Number.isFinite(durationSeconds))
      throw new Error('Audio duration could not be determined.');
    if (durationSeconds > 10 * 60)
      throw new Error('Audio exceeds the ten-minute processing limit.');
    durationMs = Math.ceil(durationSeconds * 1000);
    if (!ffmpegPath)
      throw new Error('The audio playback encoder is unavailable.');
    playbackKey = `playback/${attachment.id}.mp3`;
    const playbackPath = resolve(root, playbackKey);
    const temporaryPath = `${playbackPath}.${job.leaseToken}.part`;
    await mkdir(dirname(playbackPath), { recursive: true });
    try {
      await execFileAsync(
        ffmpegPath,
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-nostdin',
          '-i',
          path,
          '-vn',
          '-map_metadata',
          '-1',
          '-codec:a',
          'libmp3lame',
          '-b:a',
          '128k',
          '-t',
          '600',
          '-f',
          'mp3',
          temporaryPath,
        ],
        { timeout: 120_000, windowsHide: true, maxBuffer: 1024 * 1024 },
      );
      await rename(temporaryPath, playbackPath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }
  await AppDataSource.transaction(async (manager) => {
    const current = await manager.findOneBy(ProcessingJobEntity, {
      id: job.id,
      leaseToken: job.leaseToken!,
      status: 'running',
    });
    if (!current) return;
    await manager.update(
      AttachmentEntity,
      { id: attachment.id },
      {
        mediaState: 'ready',
        thumbnailKey,
        playbackKey,
        durationMs,
        ...dimensions,
      },
    );
    current.status = 'succeeded';
    current.result = {
      ...dimensions,
      durationMs,
      playbackAvailable: playbackKey !== null,
      thumbnailAvailable: thumbnailKey !== null,
      mimeType: media.mimeType,
      byteSize: bytes.length,
    };
    current.leaseToken = null;
    current.leaseExpiresAt = null;
    await manager.save(current);
  });
}

async function extractOcr(job: ProcessingJobEntity): Promise<void> {
  const { attachment, path } = await processingSource(job, 'image/');
  const { createWorker } = await import('tesseract.js');
  const configuredLanguage = job.input['language'];
  const language =
    typeof configuredLanguage === 'string' ? configuredLanguage : 'eng';
  const cachePath = resolve(environment().modelCacheRoot, 'tesseract');
  await mkdir(cachePath, { recursive: true });
  const worker = await createWorker(language, undefined, { cachePath });
  try {
    const result = await worker.recognize(path);
    await publishDerived(job, attachment, 'ocr', result.data.text.trim(), {
      language,
      modelId: `tesseract.js/${language}`,
      segments: null,
    });
  } finally {
    await worker.terminate();
  }
}

async function transcribe(job: ProcessingJobEntity): Promise<void> {
  const { attachment, path } = await processingSource(job, 'audio/');
  if (!ffmpegPath) throw new Error('The audio decoder is unavailable.');
  const rawPath = resolve(root, 'processing', `${job.id}.f32le`);
  await mkdir(dirname(rawPath), { recursive: true });
  try {
    await execFileAsync(
      ffmpegPath,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-nostdin',
        '-i',
        path,
        '-vn',
        '-ac',
        '1',
        '-ar',
        '16000',
        '-f',
        'f32le',
        '-t',
        '600',
        rawPath,
      ],
      { timeout: 120_000, windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    const bytes = await readFile(rawPath);
    const audio = new Float32Array(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
    const transformers = await import('@huggingface/transformers');
    transformers.env.cacheDir = resolve(
      environment().modelCacheRoot,
      'huggingface',
    );
    transformers.env.allowRemoteModels = true;
    const configuredModel = job.input['modelId'];
    const modelId =
      typeof configuredModel === 'string'
        ? configuredModel
        : 'onnx-community/whisper-tiny';
    const pipeline = await transformers.pipeline(
      'automatic-speech-recognition',
      modelId,
      { dtype: 'q8', cache_dir: transformers.env.cacheDir },
    );
    const configuredLanguage = job.input['language'];
    const language =
      typeof configuredLanguage === 'string' ? configuredLanguage : undefined;
    const result = await pipeline(audio, {
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
      language,
      task: 'transcribe',
    });
    await publishDerived(job, attachment, 'transcript', result.text.trim(), {
      language: language || null,
      modelId,
      segments:
        result.chunks?.map((chunk) => ({
          startMs: Math.round(chunk.timestamp[0] * 1000),
          endMs: Math.round(chunk.timestamp[1] * 1000),
          text: chunk.text,
        })) || null,
    });
    await pipeline.dispose();
  } finally {
    await unlink(rawPath).catch(() => undefined);
  }
}

async function processingSource(job: ProcessingJobEntity, mediaPrefix: string) {
  if (!job.attachmentId || !job.leaseToken)
    throw new Error('Processing job is missing its attachment or lease.');
  const attachment = await AppDataSource.getRepository(
    AttachmentEntity,
  ).findOneByOrFail({ id: job.attachmentId });
  if (attachment.trashedAt)
    throw new Error('Attachment was trashed during processing.');
  if (!attachment.mimeType.startsWith(mediaPrefix))
    throw new Error('Attachment type does not match the processing job.');
  const path = resolve(root, attachment.storageKey);
  if (!path.startsWith(root))
    throw new Error('Attachment storage key escaped the private root.');
  return { attachment, path };
}

async function publishDerived(
  job: ProcessingJobEntity,
  attachment: AttachmentEntity,
  kind: 'ocr' | 'transcript',
  text: string,
  metadata: {
    language: string | null;
    modelId: string;
    segments: Array<{ startMs: number; endMs: number; text: string }> | null;
  },
) {
  await AppDataSource.transaction(async (manager) => {
    const currentJob = await manager.findOneBy(ProcessingJobEntity, {
      id: job.id,
      leaseToken: job.leaseToken!,
      status: 'running',
    });
    const currentAttachment = await manager.findOne(AttachmentEntity, {
      where: { id: attachment.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!currentJob || !currentAttachment || currentAttachment.trashedAt)
      return;
    const prior = await manager.findOne(DerivedTextEntity, {
      where: { attachmentId: attachment.id, kind, isCurrent: true },
    });
    const revisionNo = prior ? prior.revisionNo + 1 : 1;
    if (prior) {
      prior.isCurrent = false;
      await manager.save(prior);
    }
    await manager.save(
      manager.create(DerivedTextEntity, {
        id: randomUUID(),
        attachmentId: attachment.id,
        kind,
        revisionNo,
        machineText: text,
        reviewedText: null,
        searchText: text,
        language: metadata.language,
        modelId: metadata.modelId,
        segments: metadata.segments,
        isCurrent: true,
      }),
    );
    currentJob.status = 'succeeded';
    currentJob.result = { kind, revisionNo, characterCount: text.length };
    currentJob.leaseToken = null;
    currentJob.leaseExpiresAt = null;
    await manager.save(currentJob);
  });
}

async function fail(job: ProcessingJobEntity, error: unknown): Promise<void> {
  const message =
    error instanceof Error ? error.message : 'Media processing failed.';
  await AppDataSource.transaction(async (manager) => {
    await manager.update(
      ProcessingJobEntity,
      { id: job.id, leaseToken: job.leaseToken ?? undefined },
      {
        status: 'failed',
        leaseToken: null,
        leaseExpiresAt: null,
        lastErrorCode: `${job.kind.toUpperCase()}_FAILED`.slice(0, 64),
        lastErrorMessage: message.slice(0, 500),
      },
    );
    if (job.attachmentId && job.kind === 'inspect_media')
      await manager.update(
        AttachmentEntity,
        { id: job.attachmentId },
        { mediaState: 'failed' },
      );
  });
}

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const once = process.argv.includes('--once');
  try {
    do {
      const job = await claim();
      if (!job) {
        if (once) break;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
        continue;
      }
      try {
        if (job.kind === 'inspect_media') await inspect(job);
        else if (job.kind === 'ocr') await extractOcr(job);
        else if (job.kind === 'transcribe') await transcribe(job);
        else throw new Error(`Unsupported job kind: ${job.kind}`);
      } catch (error) {
        await fail(job, error);
      }
    } while (!once);
  } finally {
    await AppDataSource.destroy();
  }
}

void main();
