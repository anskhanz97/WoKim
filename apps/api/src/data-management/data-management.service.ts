/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-base-to-string, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/restrict-template-expressions */
import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ZipArchive } from 'archiver';
import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import {
  access,
  mkdir,
  readFile,
  readdir,
  stat,
  statfs,
  unlink,
} from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { DataSource, EntityManager } from 'typeorm';
import { environment } from '../config/environment';
import { ExportJobEntity } from '../database/entities/export-job.entity';
import { TaskEntity } from '../database/entities/task.entity';
import type { CreateExportDto, PurgeDto } from './data-management.dto';

export interface SearchRow {
  id: string;
  kind: string;
  title: string | null;
  body: string | null;
  projectId: string | null;
  occurredAt: Date;
  attachmentId?: string | null;
  derivedTextId?: string | null;
}

@Injectable()
export class DataManagementService {
  private readonly storageRoot = resolve(environment().storageRoot);
  constructor(private readonly dataSource: DataSource) {}

  async search(
    filters: {
      q?: string;
      type?: string;
      projectId?: string;
      personId?: string;
      status?: string;
      from?: string;
      to?: string;
    },
    literalOnly = false,
  ): Promise<Array<SearchRow & { snippet: string }>> {
    const q = filters.q?.trim();
    if (!q || q.length > 200)
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Search text must contain 1–200 characters.',
      });
    this.assertRange(filters.from, filters.to);
    const fullText = q.length >= 3 && !literalOnly;
    const taskText = fullText
      ? 'MATCH(title,description,next_action) AGAINST (? IN NATURAL LANGUAGE MODE)'
      : "(INSTR(LOWER(COALESCE(title,'')),LOWER(?))>0 OR INSTR(LOWER(COALESCE(description,'')),LOWER(?))>0 OR INSTR(LOWER(COALESCE(next_action,'')),LOWER(?))>0)";
    const entryText = fullText
      ? 'MATCH(title,content_text,original_text) AGAINST (? IN NATURAL LANGUAGE MODE)'
      : "(INSTR(LOWER(COALESCE(title,'')),LOWER(?))>0 OR INSTR(LOWER(COALESCE(content_text,'')),LOWER(?))>0 OR INSTR(LOWER(COALESCE(original_text,'')),LOWER(?))>0)";
    const requested = filters.type;
    const derivedText = fullText
      ? 'MATCH(d.search_text) AGAINST (? IN NATURAL LANGUAGE MODE)'
      : 'INSTR(LOWER(d.search_text),LOWER(?))>0';
    const [tasks, entries, people, teams, derived] = await Promise.all([
      !requested || requested === 'task'
        ? this.dataSource.query<SearchRow[]>(
            `SELECT id,'task' kind,title,COALESCE(description,next_action) body,project_id projectId,updated_at occurredAt FROM tasks WHERE trashed_at IS NULL AND ${taskText} AND (? IS NULL OR project_id=?) AND (? IS NULL OR requested_by_person_id=?) AND (? IS NULL OR status=?) LIMIT 200`,
            [
              ...(fullText ? [q] : [q, q, q]),
              filters.projectId || null,
              filters.projectId || null,
              filters.personId || null,
              filters.personId || null,
              filters.status || null,
              filters.status || null,
            ],
          )
        : [],
      !requested || requested === 'entry'
        ? this.dataSource.query<SearchRow[]>(
            `SELECT id,'entry' kind,title,COALESCE(content_text,original_text) body,project_id projectId,COALESCE(occurred_at,created_at) occurredAt FROM entries WHERE trashed_at IS NULL AND ${entryText} AND (? IS NULL OR project_id=?) AND (? IS NULL OR sender_person_id=?) AND (? IS NULL OR COALESCE(occurred_at,created_at)>=?) AND (? IS NULL OR COALESCE(occurred_at,created_at)<?) LIMIT 200`,
            [
              ...(fullText ? [q] : [q, q, q]),
              filters.projectId || null,
              filters.projectId || null,
              filters.personId || null,
              filters.personId || null,
              filters.from || null,
              filters.from || null,
              filters.to || null,
              filters.to ? `${filters.to} 23:59:59.999` : null,
            ],
          )
        : [],
      !requested || requested === 'person'
        ? this.dataSource.query<SearchRow[]>(
            "SELECT id,'person' kind,display_name title,COALESCE(notes,handle,email) body,NULL projectId,updated_at occurredAt FROM people WHERE archived_at IS NULL AND (INSTR(LOWER(COALESCE(display_name,'')),LOWER(?))>0 OR INSTR(LOWER(COALESCE(notes,'')),LOWER(?))>0 OR INSTR(LOWER(COALESCE(handle,'')),LOWER(?))>0 OR INSTR(LOWER(COALESCE(email,'')),LOWER(?))>0) AND (? IS NULL OR id=?) LIMIT 200",
            [q, q, q, q, filters.personId || null, filters.personId || null],
          )
        : [],
      !requested || requested === 'team'
        ? this.dataSource.query<SearchRow[]>(
            "SELECT id,'team' kind,name title,notes body,NULL projectId,updated_at occurredAt FROM teams WHERE archived_at IS NULL AND (INSTR(LOWER(COALESCE(name,'')),LOWER(?))>0 OR INSTR(LOWER(COALESCE(notes,'')),LOWER(?))>0) LIMIT 200",
            [q, q],
          )
        : [],
      !requested || requested === 'entry' || requested === 'derived'
        ? this.dataSource.query<SearchRow[]>(
            `SELECT e.id,'derived' kind,a.original_name title,d.search_text body,e.project_id projectId,d.created_at occurredAt,a.id attachmentId,d.id derivedTextId FROM derived_texts d JOIN attachments a ON a.id=d.attachment_id JOIN entries e ON e.id=a.entry_id WHERE d.is_current=TRUE AND a.trashed_at IS NULL AND e.trashed_at IS NULL AND ${derivedText} AND (? IS NULL OR e.project_id=?) AND (? IS NULL OR e.sender_person_id=?) AND (? IS NULL OR d.created_at>=?) AND (? IS NULL OR d.created_at<?) LIMIT 200`,
            [
              q,
              filters.projectId || null,
              filters.projectId || null,
              filters.personId || null,
              filters.personId || null,
              filters.from || null,
              filters.from || null,
              filters.to || null,
              filters.to ? `${filters.to} 23:59:59.999` : null,
            ],
          )
        : [],
    ]);
    if (fullText && !tasks.length && !entries.length && !derived.length)
      return this.search(filters, true);
    return [...tasks, ...entries, ...people, ...teams, ...derived]
      .sort(
        (left, right) =>
          new Date(right.occurredAt).valueOf() -
          new Date(left.occurredAt).valueOf(),
      )
      .slice(0, 200)
      .map((row) => ({
        ...row,
        snippet: this.snippet(row.body || row.title || '', q),
      }));
  }

  async overview(projectId: string) {
    const [
      projects,
      counts,
      recent,
      decisions,
      people,
      currentTasks,
      openFollowUps,
      checkpoints,
    ] = await Promise.all([
      this.dataSource.query<Array<Record<string, unknown>>>(
        'SELECT * FROM projects WHERE id=?',
        [projectId],
      ),
      this.dataSource.query<Array<Record<string, unknown>>>(
        'SELECT status,COUNT(*) count FROM tasks WHERE project_id=? AND trashed_at IS NULL GROUP BY status',
        [projectId],
      ),
      this.dataSource.query<Array<Record<string, unknown>>>(
        'SELECT id,event_type eventType,task_id taskId,entry_id entryId,payload,created_at createdAt FROM activity_events WHERE project_id=? ORDER BY created_at DESC,id LIMIT 20',
        [projectId],
      ),
      this.dataSource.query<Array<Record<string, unknown>>>(
        "SELECT id,title,content_text contentText,created_at createdAt FROM entries WHERE project_id=? AND entry_type IN ('instruction','decision') AND trashed_at IS NULL ORDER BY created_at DESC LIMIT 10",
        [projectId],
      ),
      this.dataSource.query<Array<Record<string, unknown>>>(
        'SELECT p.id,p.display_name displayName,pp.role_label roleLabel FROM project_people pp JOIN people p ON p.id=pp.person_id WHERE pp.project_id=? ORDER BY p.display_name',
        [projectId],
      ),
      this.dataSource.query<Array<Record<string, unknown>>>(
        "SELECT id,title,status,next_action nextAction,due_date dueDate,due_at dueAt FROM tasks WHERE project_id=? AND trashed_at IS NULL AND status NOT IN ('done','cancelled') ORDER BY FIELD(status,'in_progress','paused','waiting','ready'),updated_at DESC LIMIT 20",
        [projectId],
      ),
      this.dataSource.query<Array<Record<string, unknown>>>(
        "SELECT id,question,follow_up_on followUpOn,person_id personId,task_id taskId FROM follow_ups WHERE project_id=? AND status='waiting' ORDER BY follow_up_on IS NULL,follow_up_on,id LIMIT 20",
        [projectId],
      ),
      this.dataSource.query<Array<Record<string, unknown>>>(
        "SELECT id,title,content_text contentText,created_at createdAt FROM entries WHERE project_id=? AND entry_type='checkpoint' AND trashed_at IS NULL ORDER BY created_at DESC,id LIMIT 1",
        [projectId],
      ),
    ]);
    if (!projects[0])
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Project not found.',
      });
    return {
      project: projects[0],
      taskCounts: counts,
      recent,
      decisions,
      people,
      currentTasks,
      openFollowUps,
      lastCheckpoint: checkpoints[0] || null,
    };
  }

  async createExport(input: CreateExportDto) {
    if ((input.scope === 'project') !== Boolean(input.projectId))
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Project scope requires exactly one projectId.',
      });
    if (
      input.projectId &&
      !(
        (await this.dataSource.query('SELECT id FROM projects WHERE id=?', [
          input.projectId,
        ])) as unknown[]
      ).length
    )
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Project not found.',
      });
    const id = randomUUID(),
      storageKey = `exports/${id}.zip`,
      path = resolve(this.storageRoot, storageKey);
    await mkdir(dirname(path), { recursive: true });
    const job = await this.dataSource.manager.save(
      this.dataSource.manager.create(ExportJobEntity, {
        id,
        scope: input.scope,
        projectId: input.projectId || null,
        status: 'running',
        storageKey: null,
        errorCode: null,
        expiresAt: new Date(
          Date.now() + environment().retention.exportHours * 3600000,
        ),
        completedAt: null,
      }),
    );
    try {
      await this.writeExport(path, input.projectId);
      job.status = 'succeeded';
      job.storageKey = storageKey;
      job.completedAt = new Date();
      await this.dataSource.manager.save(job);
    } catch {
      job.status = 'failed';
      job.errorCode = 'EXPORT_FAILED';
      job.completedAt = new Date();
      await this.dataSource.manager.save(job);
      throw new ConflictException({
        code: 'EXPORT_FAILED',
        message: 'Export generation failed.',
      });
    }
    return job;
  }

  async exportContent(id: string) {
    const job = await this.dataSource.manager.findOneBy(ExportJobEntity, {
      id,
    });
    if (!job)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Export not found.',
      });
    if (job.expiresAt <= new Date())
      throw new GoneException({
        code: 'EXPORT_EXPIRED',
        message: 'Export has expired.',
      });
    if (job.status !== 'succeeded' || !job.storageKey)
      throw new ConflictException({
        code: 'NOT_READY',
        message: 'Export is not ready.',
      });
    const path = resolve(this.storageRoot, job.storageKey);
    await access(path);
    const info = await stat(path);
    return { path, size: info.size, filename: `wokim-${job.id}.zip` };
  }

  async cancelExport(id: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(ExportJobEntity)
      .set({ status: 'cancelled' })
      .where("id=:id AND status='running'", { id })
      .execute();
    if (result.affected !== 1)
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: 'Only running exports can be cancelled.',
      });
  }

  async trash() {
    const [entries, tasks, attachments] = await Promise.all([
      this.dataSource.query(
        'SELECT id,title,trashed_at trashedAt,version FROM entries WHERE trashed_at IS NOT NULL ORDER BY trashed_at DESC',
      ),
      this.dataSource.query(
        'SELECT id,title,trashed_at trashedAt,version FROM tasks WHERE trashed_at IS NOT NULL ORDER BY trashed_at DESC',
      ),
      this.dataSource.query(
        'SELECT a.id,a.original_name originalName,a.trashed_at trashedAt,e.version parentVersion FROM attachments a JOIN entries e ON e.id=a.entry_id WHERE a.trashed_at IS NOT NULL ORDER BY a.trashed_at DESC',
      ),
    ]);
    return { entries, tasks, attachments };
  }

  async trashTask(id: string, version: number, focusVersion?: number) {
    return this.dataSource.transaction(async (manager) => {
      const task = await manager.findOne(TaskEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!task || task.trashedAt)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Task not found.',
        });
      if (task.version !== version) throw this.stale();
      if (task.status === 'in_progress') {
        const owner = (
          await manager.query<Array<{ focusVersion: number }>>(
            'SELECT focus_version focusVersion FROM users WHERE id=1 FOR UPDATE',
          )
        )[0];
        if (focusVersion !== owner.focusVersion)
          throw new ConflictException({
            code: 'FOCUS_CONFLICT',
            message: 'Focus changed elsewhere.',
          });
        throw new ConflictException({
          code: 'ACTIVE_TASK',
          message: 'Finish or pause active work before trashing it.',
        });
      }
      task.status = 'cancelled';
      task.completedAt = null;
      task.trashedAt = new Date();
      task.version += 1;
      return manager.save(task);
    });
  }

  async restore(kind: string, id: string, expectedVersion: number) {
    if (kind === 'entry')
      return this.restoreVersioned(
        'entries',
        id,
        expectedVersion,
        'trashed_at=NULL',
      );
    if (kind === 'task')
      return this.restoreVersioned(
        'tasks',
        id,
        expectedVersion,
        "trashed_at=NULL,status='ready',completed_at=NULL",
      );
    if (kind === 'attachment') {
      const rows = await this.dataSource.query<Array<{ entryId: string }>>(
        'SELECT entry_id entryId FROM attachments WHERE id=? AND trashed_at IS NOT NULL',
        [id],
      );
      if (!rows[0])
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Trashed attachment not found.',
        });
      const result = await this.dataSource.query<{ affectedRows: number }>(
        'UPDATE entries SET version=version+1 WHERE id=? AND version=?',
        [rows[0].entryId, expectedVersion],
      );
      if (!result.affectedRows) throw this.stale();
      await this.dataSource.query(
        'UPDATE attachments SET trashed_at=NULL WHERE id=?',
        [id],
      );
      return { id, restored: true };
    }
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Unknown trash kind.',
    });
  }

  async purge(kind: string, id: string, input: PurgeDto) {
    if (input.confirm !== 'PURGE')
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Explicit PURGE confirmation is required.',
      });
    const files: string[] = [];
    await this.dataSource.transaction(async (manager) => {
      if (kind === 'attachment')
        await this.purgeAttachment(manager, id, input.expectedVersion, files);
      else if (kind === 'entry')
        await this.purgeEntry(manager, id, input.expectedVersion, files);
      else if (kind === 'task')
        await this.purgeTask(manager, id, input.expectedVersion);
      else
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Unknown trash kind.',
        });
      await manager.query(
        'INSERT INTO deletion_manifest (id,object_kind,object_id) VALUES (?,?,?)',
        [randomUUID(), kind, id],
      );
    });
    await Promise.all(
      files.map((key) =>
        unlink(resolve(this.storageRoot, key)).catch(() => undefined),
      ),
    );
    return { id, purged: true };
  }

  async summary() {
    const [bytes, trash, jobs, exports, disk, backup] = await Promise.all([
      this.dataSource.query<Array<{ bytes: string }>>(
        'SELECT COALESCE(SUM(byte_size),0) bytes FROM attachments',
      ),
      this.trash(),
      this.dataSource.query<Array<{ status: string; count: string }>>(
        'SELECT status,COUNT(*) count FROM processing_jobs GROUP BY status',
      ),
      this.dataSource.query<Array<{ status: string; count: string }>>(
        'SELECT status,COUNT(*) count FROM export_jobs GROUP BY status',
      ),
      statfs(this.storageRoot),
      readFile(resolve(this.storageRoot, '..', 'backup-status.json'), 'utf8')
        .then(
          (value) =>
            JSON.parse(value) as {
              lastSuccessfulAt?: string;
              lastFailureAt?: string;
              lastFailure?: string;
            },
        )
        .catch(() => null),
    ]);
    return {
      storedBytes: Number(bytes[0].bytes),
      trashCounts: {
        entries: trash.entries.length,
        tasks: trash.tasks.length,
        attachments: trash.attachments.length,
      },
      processingJobs: jobs,
      exportJobs: exports,
      disk: {
        freeBytes: disk.bavail * disk.bsize,
        totalBytes: disk.blocks * disk.bsize,
      },
      backup: backup?.lastSuccessfulAt
        ? {
            lastSuccessfulAt: backup.lastSuccessfulAt,
            ageHours:
              Math.round(
                ((Date.now() - new Date(backup.lastSuccessfulAt).valueOf()) /
                  3600000) *
                  10,
              ) / 10,
            lastFailureAt: backup.lastFailureAt ?? null,
            lastFailure: backup.lastFailure ?? null,
          }
        : null,
    };
  }

  async reconcile() {
    const referenced = await this.dataSource.query<
      Array<{ storageKey: string }>
    >(
      'SELECT storage_key storageKey FROM attachments UNION SELECT thumbnail_key FROM attachments WHERE thumbnail_key IS NOT NULL UNION SELECT playback_key FROM attachments WHERE playback_key IS NOT NULL UNION SELECT storage_key FROM export_jobs WHERE storage_key IS NOT NULL',
    );
    const expected = new Set(referenced.map((row) => row.storageKey));
    const actual: string[] = [];
    await this.walk(this.storageRoot, '', actual);
    const missing: string[] = [];
    for (const key of expected)
      try {
        await access(resolve(this.storageRoot, key));
      } catch {
        missing.push(key);
      }
    return {
      missing,
      unreferenced: actual.filter((key) => !expected.has(key)),
      checkedAt: new Date().toISOString(),
    };
  }

  async retention() {
    const expired = await this.dataSource.query<
      Array<{ id: string; storageKey: string | null }>
    >(
      'SELECT id,storage_key storageKey FROM export_jobs WHERE expires_at<=NOW(3)',
    );
    const deleted: string[] = [];
    const failed: Array<{ id: string; code: string }> = [];
    for (const job of expired) {
      try {
        if (job.storageKey) {
          try {
            await unlink(resolve(this.storageRoot, job.storageKey));
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
        }
        await this.dataSource.query('DELETE FROM export_jobs WHERE id=?', [
          job.id,
        ]);
        deleted.push(job.id);
      } catch (error) {
        failed.push({
          id: job.id,
          code: (error as NodeJS.ErrnoException).code || 'CLEANUP_FAILED',
        });
      }
    }
    const days = environment().retention.trashDays;
    const [entries, tasks, attachments] = await Promise.all([
      this.dataSource.query<Array<{ count: string }>>(
        'SELECT COUNT(*) count FROM entries WHERE trashed_at<=DATE_SUB(NOW(3),INTERVAL ? DAY)',
        [days],
      ),
      this.dataSource.query<Array<{ count: string }>>(
        'SELECT COUNT(*) count FROM tasks WHERE trashed_at<=DATE_SUB(NOW(3),INTERVAL ? DAY)',
        [days],
      ),
      this.dataSource.query<Array<{ count: string }>>(
        'SELECT COUNT(*) count FROM attachments WHERE trashed_at<=DATE_SUB(NOW(3),INTERVAL ? DAY)',
        [days],
      ),
    ]);
    return {
      expiredExportsDeleted: deleted.length,
      failures: failed,
      trashRetentionDays: days,
      purgeCandidates: {
        entries: Number(entries[0].count),
        tasks: Number(tasks[0].count),
        attachments: Number(attachments[0].count),
      },
    };
  }

  private async writeExport(path: string, projectId?: string) {
    const clause = projectId ? ' WHERE project_id=?' : '',
      params = projectId ? [projectId] : [];
    const [projects, tasks, entries, followUps, attachments, derivedTexts] =
      await Promise.all([
        this.dataSource.query(
          `SELECT * FROM projects${projectId ? ' WHERE id=?' : ''}`,
          params,
        ),
        this.dataSource.query(`SELECT * FROM tasks${clause}`, params),
        this.dataSource.query(`SELECT * FROM entries${clause}`, params),
        this.dataSource.query(`SELECT * FROM follow_ups${clause}`, params),
        this.dataSource.query(
          `SELECT a.* FROM attachments a JOIN entries e ON e.id=a.entry_id${projectId ? ' WHERE e.project_id=?' : ''}`,
          params,
        ),
        this.dataSource.query(
          `SELECT d.* FROM derived_texts d JOIN attachments a ON a.id=d.attachment_id JOIN entries e ON e.id=a.entry_id${projectId ? ' WHERE e.project_id=?' : ''}`,
          params,
        ),
      ]);
    const manifest = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      scope: projectId ? { kind: 'project', projectId } : { kind: 'all' },
      counts: {
        projects: (projects as unknown[]).length,
        tasks: (tasks as unknown[]).length,
        entries: (entries as unknown[]).length,
        followUps: (followUps as unknown[]).length,
        attachments: (attachments as unknown[]).length,
        derivedTexts: (derivedTexts as unknown[]).length,
      },
    };
    await new Promise<void>((resolvePromise, reject) => {
      const output = createWriteStream(path),
        zip = new ZipArchive({ zlib: { level: 9 } });
      output.on('close', resolvePromise);
      output.on('error', reject);
      zip.on('error', reject);
      zip.pipe(output);
      zip.append(
        JSON.stringify(
          {
            manifest,
            projects,
            tasks,
            entries,
            followUps,
            attachments,
            derivedTexts,
          },
          null,
          2,
        ),
        { name: 'data/export.json' },
      );
      zip.append(
        `# WoKim export\n\nCreated: ${manifest.createdAt}\n\nProjects: ${manifest.counts.projects}\nTasks: ${manifest.counts.tasks}\nEntries: ${manifest.counts.entries}\n`,
        { name: 'README.md' },
      );
      for (const attachment of attachments as Array<Record<string, unknown>>) {
        const key = String(attachment['storage_key']),
          name = basename(String(attachment['original_name'])).replace(
            /[^\w.-]+/g,
            '_',
          );
        zip.append(createReadStream(resolve(this.storageRoot, key)), {
          name: `originals/${attachment['id']}-${name}`,
        });
      }
      void zip.finalize();
    });
  }

  private async restoreVersioned(
    table: 'entries' | 'tasks',
    id: string,
    version: number,
    values: string,
  ) {
    const result = await this.dataSource.query<{ affectedRows: number }>(
      `UPDATE ${table} SET ${values},version=version+1 WHERE id=? AND version=? AND trashed_at IS NOT NULL`,
      [id, version],
    );
    if (!result.affectedRows) throw this.stale();
    return { id, restored: true };
  }
  private async purgeAttachment(
    manager: EntityManager,
    id: string,
    version: number,
    files: string[],
  ) {
    const rows = await manager.query<Array<Record<string, unknown>>>(
      'SELECT a.*,e.version parentVersion FROM attachments a JOIN entries e ON e.id=a.entry_id WHERE a.id=? AND a.trashed_at IS NOT NULL FOR UPDATE',
      [id],
    );
    const row = rows[0];
    if (!row)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Trashed attachment not found.',
      });
    if (Number(row['parentVersion']) !== version) throw this.stale();
    if (
      (
        await manager.query<unknown[]>(
          'SELECT id FROM evidence_items WHERE attachment_id=? LIMIT 1',
          [id],
        )
      ).length
    )
      throw new UnprocessableEntityException({
        code: 'DEPENDENCY_EXISTS',
        message: 'Remove this image from evidence before purging.',
      });
    for (const key of [
      row['storage_key'],
      row['thumbnail_key'],
      row['playback_key'],
    ])
      if (key) files.push(String(key));
    await manager.query('DELETE FROM processing_jobs WHERE attachment_id=?', [
      id,
    ]);
    await manager.query('DELETE FROM derived_texts WHERE attachment_id=?', [
      id,
    ]);
    await manager.query('DELETE FROM attachments WHERE id=?', [id]);
    await manager.query('UPDATE entries SET version=version+1 WHERE id=?', [
      row['entry_id'],
    ]);
  }
  private async purgeEntry(
    manager: EntityManager,
    id: string,
    version: number,
    files: string[],
  ) {
    const rows = await manager.query<Array<Record<string, unknown>>>(
      'SELECT * FROM entries WHERE id=? AND version=? AND trashed_at IS NOT NULL FOR UPDATE',
      [id, version],
    );
    if (!rows[0]) throw this.stale();
    if (
      rows[0]['task_id'] ||
      (
        await manager.query<unknown[]>(
          'SELECT older_entry_id FROM entry_supersessions WHERE older_entry_id=? OR newer_entry_id=? LIMIT 1',
          [id, id],
        )
      ).length
    )
      throw new UnprocessableEntityException({
        code: 'DEPENDENCY_EXISTS',
        message: 'Detach task and requirement history before purging.',
      });
    const attachments = await manager.query<Array<Record<string, unknown>>>(
      'SELECT * FROM attachments WHERE entry_id=?',
      [id],
    );
    for (const attachment of attachments) {
      if (
        (
          await manager.query<unknown[]>(
            'SELECT id FROM evidence_items WHERE attachment_id=? LIMIT 1',
            [attachment['id']],
          )
        ).length
      )
        throw new UnprocessableEntityException({
          code: 'DEPENDENCY_EXISTS',
          message: 'Remove entry images from evidence before purging.',
        });
      for (const key of [
        attachment['storage_key'],
        attachment['thumbnail_key'],
        attachment['playback_key'],
      ])
        if (key) files.push(String(key));
    }
    await manager.query(
      'DELETE FROM processing_jobs WHERE attachment_id IN (SELECT id FROM attachments WHERE entry_id=?)',
      [id],
    );
    await manager.query(
      'DELETE FROM derived_texts WHERE attachment_id IN (SELECT id FROM attachments WHERE entry_id=?)',
      [id],
    );
    await manager.query('DELETE FROM attachments WHERE entry_id=?', [id]);
    await manager.query('DELETE FROM activity_events WHERE entry_id=?', [id]);
    await manager.query('DELETE FROM entries WHERE id=?', [id]);
  }
  private async purgeTask(manager: EntityManager, id: string, version: number) {
    const rows = await manager.query<Array<Record<string, unknown>>>(
      'SELECT * FROM tasks WHERE id=? AND version=? AND trashed_at IS NOT NULL FOR UPDATE',
      [id, version],
    );
    if (!rows[0]) throw this.stale();
    const dependencies = await manager.query<unknown[]>(
      `SELECT id FROM entries WHERE task_id=? UNION ALL SELECT id FROM follow_ups WHERE task_id=? UNION ALL SELECT id FROM evidence_sets WHERE task_id=? UNION ALL SELECT id FROM focus_sessions WHERE task_id=? UNION ALL SELECT id FROM daily_check_in_items WHERE task_id=? LIMIT 1`,
      [id, id, id, id, id],
    );
    if (dependencies.length)
      throw new UnprocessableEntityException({
        code: 'DEPENDENCY_EXISTS',
        message:
          'Task history still depends on this task; keep it archived instead.',
      });
    await manager.query('DELETE FROM activity_events WHERE task_id=?', [id]);
    await manager.query('DELETE FROM tasks WHERE id=?', [id]);
  }
  private async walk(directory: string, prefix: string, output: string[]) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.isDirectory())
        await this.walk(resolve(directory, item.name), relative, output);
      else output.push(relative.replaceAll('\\', '/'));
    }
  }
  private snippet(text: string, q: string) {
    const at = text.toLocaleLowerCase().indexOf(q.toLocaleLowerCase());
    const start = Math.max(0, at - 80);
    return text.slice(start, start + 240);
  }
  private assertRange(from?: string, to?: string) {
    if (
      from &&
      to &&
      (new Date(to).valueOf() - new Date(from).valueOf()) / 86400000 > 366
    )
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Date range cannot exceed 366 days.',
      });
  }
  private stale() {
    return new PreconditionFailedException({
      code: 'VERSION_CONFLICT',
      message: 'The record changed elsewhere.',
    });
  }
}
