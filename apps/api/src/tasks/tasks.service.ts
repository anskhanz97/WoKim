import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { CommandReceiptEntity } from '../database/entities/command-receipt.entity';
import { EntryEntity } from '../database/entities/entry.entity';
import { PersonEntity } from '../database/entities/person.entity';
import { ProjectEntity } from '../database/entities/project.entity';
import { TaskEntity, type TaskStatus } from '../database/entities/task.entity';
import type {
  ConvertEntryToTaskDto,
  CreateTaskDto,
  DeadlineDto,
  SupersessionDto,
  TaskTransitionDto,
  TaskQueryDto,
  UpdateTaskDto,
} from './tasks.dto';

interface SupersessionEdge {
  olderId: string;
  newerId: string;
}

export interface SupersessionLink {
  id: string;
  reason: string | null;
}

interface ActivityRow {
  id: string;
  eventType: string;
  taskId: string | null;
  entryId: string | null;
  payload: string | Record<string, unknown>;
  createdAt: Date;
}

export type TaskView = Record<string, unknown> &
  TaskEntity & {
    deadline:
      | { kind: 'hard' | 'target' | null; date: string }
      | { kind: 'hard' | 'target' | null; at: string; timezone: string | null }
      | null;
  };

@Injectable()
export class TasksService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
    @InjectRepository(EntryEntity)
    private readonly entries: Repository<EntryEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(PersonEntity)
    private readonly people: Repository<PersonEntity>,
    @InjectRepository(CommandReceiptEntity)
    private readonly receipts: Repository<CommandReceiptEntity>,
  ) {}

  async list(filters: TaskQueryDto) {
    this.assertDateRange(filters.dueFrom, filters.dueTo);
    const query = this.tasks
      .createQueryBuilder('task')
      .where('task.trashed_at IS NULL');
    if (filters.projectId)
      query.andWhere('task.project_id=:projectId', {
        projectId: filters.projectId,
      });
    if (filters.status)
      query.andWhere('task.status=:status', { status: filters.status });
    if (filters.type) query.andWhere('task.type=:type', { type: filters.type });
    if (filters.priority)
      query.andWhere('task.priority=:priority', { priority: filters.priority });
    if (filters.personId)
      query.andWhere('task.requested_by_person_id=:personId', {
        personId: filters.personId,
      });
    if (filters.dueFrom)
      query.andWhere('COALESCE(task.due_date,DATE(task.due_at))>=:dueFrom', {
        dueFrom: filters.dueFrom.slice(0, 10),
      });
    if (filters.dueTo)
      query.andWhere('COALESCE(task.due_date,DATE(task.due_at))<=:dueTo', {
        dueTo: filters.dueTo.slice(0, 10),
      });
    return (
      await query
        .orderBy('task.updated_at', 'DESC')
        .addOrderBy('task.id', 'ASC')
        .getMany()
    ).map((task) => this.view(task));
  }

  private assertDateRange(from?: string, to?: string) {
    if (!from || !to) return;
    const start = new Date(from),
      end = new Date(to);
    if (start > end || end.valueOf() - start.valueOf() > 366 * 86400000)
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message:
          'The due-date range must be ordered and no longer than 366 days.',
      });
  }

  async get(id: string) {
    const task = await this.tasks.findOneBy({ id, trashedAt: IsNull() });
    if (!task)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Task not found.',
      });
    return this.view(task);
  }

  async create(input: CreateTaskDto) {
    await this.assertReferences(input.projectId, input.requestedByPersonId);
    const task = this.tasks.create({
      id: randomUUID(),
      ...this.values(input),
      projectId: input.projectId,
      sourceEntryId: null,
      status: 'ready',
      completedAt: null,
      trashedAt: null,
    });
    return this.view(await this.tasks.save(task));
  }

  async update(id: string, version: number, input: UpdateTaskDto) {
    if (input.requestedByPersonId)
      await this.assertPerson(input.requestedByPersonId);
    const deadline =
      input.deadline === undefined ? {} : this.deadlineValues(input.deadline);
    const values = this.clean({
      title: input.title?.trim(),
      description:
        input.description === undefined
          ? undefined
          : input.description?.trim() || null,
      type: input.type,
      priority: input.priority,
      requestedByPersonId:
        input.requestedByPersonId === undefined
          ? undefined
          : input.requestedByPersonId || null,
      nextAction:
        input.nextAction === undefined
          ? undefined
          : input.nextAction?.trim() || null,
      branchName:
        input.branchName === undefined
          ? undefined
          : input.branchName?.trim() || null,
      links: input.links === undefined ? undefined : input.links,
      ...deadline,
    });
    const result = await this.tasks
      .createQueryBuilder()
      .update()
      .set({ ...values, version: () => 'version + 1' })
      .where('id=:id AND version=:version AND trashed_at IS NULL', {
        id,
        version,
      })
      .execute();
    if (result.affected !== 1) throw this.versionConflict();
    return this.get(id);
  }

  async transition(
    id: string,
    version: number,
    key: string,
    input: TaskTransitionDto,
  ) {
    this.assertKey(key);
    const hash = this.hash({ id, version, input });
    const prior = await this.receipts.findOneBy({ commandKey: key });
    if (prior) return this.replay(prior, hash);
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
      if (task.version !== version) throw this.versionConflict();
      const status = this.transitionStatus(task.status, input.action);
      task.status = status;
      task.completedAt = status === 'done' ? new Date() : null;
      task.version += 1;
      await manager.save(task);
      await manager.query(
        'INSERT INTO activity_events (id,event_type,project_id,task_id,payload) VALUES (?,?,?,?,?)',
        [
          randomUUID(),
          'task.transitioned',
          task.projectId,
          task.id,
          JSON.stringify({ action: input.action, status }),
        ],
      );
      const view = this.view(task);
      await manager.save(
        manager.create(CommandReceiptEntity, {
          commandKey: key,
          operation: 'tasks.transition',
          requestHash: hash,
          resultStatus: 200,
          result: view,
          expiresAt: new Date(Date.now() + 7 * 86400000),
        }),
      );
      return view;
    });
  }

  async convert(entryId: string, key: string, input: ConvertEntryToTaskDto) {
    this.assertKey(key);
    const hash = this.hash({ entryId, input });
    const prior = await this.receipts.findOneBy({ commandKey: key });
    if (prior) return this.replay(prior, hash);
    await this.assertReferences(input.projectId, input.requestedByPersonId);
    return this.dataSource.transaction(async (manager) => {
      const entry = await manager.findOne(EntryEntity, {
        where: { id: entryId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!entry || entry.trashedAt)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Entry not found.',
        });
      if (entry.taskId) {
        const existing = await manager.findOneByOrFail(TaskEntity, {
          id: entry.taskId,
        });
        return this.view(existing);
      }
      if (entry.version !== input.expectedEntryVersion)
        throw new PreconditionFailedException({
          code: 'VERSION_CONFLICT',
          message:
            'The source entry changed elsewhere. Reload before converting.',
        });
      if (entry.projectId && entry.projectId !== input.projectId)
        throw new UnprocessableEntityException({
          code: 'RELATIONSHIP_INVALID',
          message: 'The entry and task must belong to the same project.',
        });
      const task = manager.create(TaskEntity, {
        id: randomUUID(),
        ...this.values(input),
        projectId: input.projectId,
        sourceEntryId: entry.id,
        status: 'ready',
        completedAt: null,
        trashedAt: null,
      });
      await manager.save(task);
      entry.projectId = input.projectId;
      entry.taskId = task.id;
      entry.inboxState = 'organized';
      entry.version += 1;
      await manager.save(entry);
      await manager.query(
        'INSERT INTO activity_events (id,event_type,project_id,task_id,entry_id,payload) VALUES (?,?,?,?,?,?)',
        [
          randomUUID(),
          'entry.converted_to_task',
          task.projectId,
          task.id,
          entry.id,
          JSON.stringify({}),
        ],
      );
      const view = this.view(task);
      await manager.save(
        manager.create(CommandReceiptEntity, {
          commandKey: key,
          operation: 'entries.convert_to_task',
          requestHash: hash,
          resultStatus: 201,
          result: view,
          expiresAt: new Date(Date.now() + 7 * 86400000),
        }),
      );
      return view;
    });
  }

  async addSupersessions(
    newerId: string,
    version: number,
    input: SupersessionDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const newer = await manager.findOne(EntryEntity, {
        where: { id: newerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!newer || newer.trashedAt)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Replacement entry not found.',
        });
      if (newer.version !== version)
        throw new PreconditionFailedException({
          code: 'VERSION_CONFLICT',
          message: 'The replacement entry changed elsewhere.',
        });
      this.assertRequirement(newer);
      const older = await manager.findBy(EntryEntity, {
        id: In(input.olderEntryIds),
      });
      if (older.length !== input.olderEntryIds.length)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'An older entry was not found.',
        });
      const edges = await manager.query<SupersessionEdge[]>(
        'SELECT older_entry_id AS olderId,newer_entry_id AS newerId FROM entry_supersessions',
      );
      for (const item of older) {
        this.assertRequirement(item);
        if (
          item.id === newer.id ||
          item.projectId !== newer.projectId ||
          this.reaches(edges, newer.id, item.id)
        )
          throw new UnprocessableEntityException({
            code: 'RELATIONSHIP_INVALID',
            message:
              'Supersessions must stay within one project and cannot form a cycle.',
          });
        const existing = edges.find((edge) => edge.olderId === item.id);
        if (existing && existing.newerId !== newer.id)
          throw new ConflictException({
            code: 'INVALID_TRANSITION',
            message: 'An older entry already has a different replacement.',
          });
        await manager.query(
          'INSERT INTO entry_supersessions (older_entry_id,newer_entry_id,reason) VALUES (?,?,?) ON DUPLICATE KEY UPDATE reason=VALUES(reason)',
          [item.id, newer.id, input.reason?.trim() || null],
        );
        edges.push({ olderId: item.id, newerId: newer.id });
      }
      newer.version += 1;
      await manager.save(newer);
      return this.entryRequirementView(manager, newer);
    });
  }

  async removeSupersession(newerId: string, olderId: string, version: number) {
    return this.dataSource.transaction(async (manager) => {
      const newer = await manager.findOne(EntryEntity, {
        where: { id: newerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!newer || newer.version !== version) throw this.versionConflict();
      await manager.query(
        'DELETE FROM entry_supersessions WHERE older_entry_id=? AND newer_entry_id=?',
        [olderId, newerId],
      );
      newer.version += 1;
      await manager.save(newer);
      return this.entryRequirementView(manager, newer);
    });
  }

  async decisions(projectId: string) {
    if (!(await this.projects.findOneBy({ id: projectId })))
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Project not found.',
      });
    const rows = await this.entries
      .createQueryBuilder('entry')
      .where('entry.project_id=:projectId', { projectId })
      .andWhere("entry.entry_type IN ('instruction','decision')")
      .andWhere('entry.trashed_at IS NULL')
      .orderBy('entry.created_at', 'DESC')
      .addOrderBy('entry.id', 'ASC')
      .getMany();
    return Promise.all(
      rows.map((entry) =>
        this.entryRequirementView(this.dataSource.manager, entry),
      ),
    );
  }

  async history(projectId: string, from?: string, to?: string) {
    if (!(await this.projects.findOneBy({ id: projectId })))
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Project not found.',
      });
    const rows = await this.dataSource.manager.query<ActivityRow[]>(
      `SELECT id,event_type AS eventType,task_id AS taskId,entry_id AS entryId,
              payload,created_at AS createdAt
       FROM activity_events
       WHERE project_id=?
         AND (? IS NULL OR created_at>=?)
         AND (? IS NULL OR created_at<?)
       ORDER BY created_at DESC,id ASC`,
      [
        projectId,
        from || null,
        from || null,
        to || null,
        to ? `${to} 23:59:59.999` : null,
      ],
    );
    return rows.map((row) => ({
      ...row,
      payload:
        typeof row.payload === 'string'
          ? (JSON.parse(row.payload) as Record<string, unknown>)
          : row.payload,
    }));
  }

  private async entryRequirementView(
    manager: EntityManager,
    entry: EntryEntity,
  ) {
    const [replaces, replacedBy] = await Promise.all([
      manager.query<SupersessionLink[]>(
        'SELECT older_entry_id AS id,reason FROM entry_supersessions WHERE newer_entry_id=? ORDER BY created_at,older_entry_id',
        [entry.id],
      ),
      manager.query<SupersessionLink[]>(
        'SELECT newer_entry_id AS id,reason FROM entry_supersessions WHERE older_entry_id=?',
        [entry.id],
      ),
    ]);
    return { ...entry, replaces, replacedBy: replacedBy[0] ?? null };
  }

  private values(input: CreateTaskDto) {
    return {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      priority: input.priority || 'normal',
      requestedByPersonId: input.requestedByPersonId || null,
      nextAction: input.nextAction?.trim() || null,
      branchName: input.branchName?.trim() || null,
      links: input.links || null,
      ...this.deadlineValues(input.deadline),
    };
  }
  private deadlineValues(deadline?: DeadlineDto | null) {
    if (!deadline)
      return {
        deadlineKind: null,
        dueDate: null,
        dueAt: null,
        dueTimezone: null,
      };
    const hasDate = Boolean(deadline.date),
      hasAt = Boolean(deadline.at);
    if (
      hasDate === hasAt ||
      (hasDate && deadline.timezone) ||
      (hasAt && !deadline.timezone)
    )
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Deadline must contain either date, or at with timezone.',
      });
    if (deadline.date) {
      const validShape = /^\d{4}-\d{2}-\d{2}$/.test(deadline.date);
      const parsed = validShape
        ? new Date(`${deadline.date}T00:00:00.000Z`)
        : null;
      if (
        !parsed ||
        Number.isNaN(parsed.valueOf()) ||
        parsed.toISOString().slice(0, 10) !== deadline.date
      )
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message:
            'Deadline date must be a real calendar date in YYYY-MM-DD form.',
        });
    }
    if (deadline.timezone) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: deadline.timezone }).format();
      } catch {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Deadline timezone is invalid.',
        });
      }
    }
    return {
      deadlineKind: deadline.kind,
      dueDate: deadline.date || null,
      dueAt: deadline.at ? new Date(deadline.at) : null,
      dueTimezone: deadline.timezone || null,
    };
  }
  private view(task: TaskEntity): TaskView {
    const deadline = task.dueDate
      ? { kind: task.deadlineKind, date: task.dueDate }
      : task.dueAt
        ? {
            kind: task.deadlineKind,
            at: task.dueAt.toISOString(),
            timezone: task.dueTimezone,
          }
        : null;
    return { ...task, deadline };
  }
  private transitionStatus(
    status: TaskStatus,
    action: TaskTransitionDto['action'],
  ): TaskStatus {
    if (status === 'in_progress')
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message:
          'Use a focus command to pause, wait, finish, or cancel active work.',
      });
    if (action === 'reopen') {
      if (!['done', 'cancelled'].includes(status))
        throw new ConflictException({
          code: 'INVALID_TRANSITION',
          message: 'Only done or cancelled tasks can be reopened.',
        });
      return 'ready';
    }
    if (['done', 'cancelled'].includes(status))
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: 'Reopen this task before changing its status.',
      });
    return action === 'wait'
      ? 'waiting'
      : action === 'cancel'
        ? 'cancelled'
        : action;
  }
  private async assertReferences(projectId: string, personId?: string) {
    await this.assertProject(projectId);
    if (personId) await this.assertPerson(personId);
  }
  private async assertProject(id: string) {
    const project = await this.projects.findOneBy({ id });
    if (!project || project.status !== 'active')
      throw new UnprocessableEntityException({
        code: 'RELATIONSHIP_INVALID',
        message: 'Tasks require an active project.',
      });
  }
  private async assertPerson(id: string) {
    if (!(await this.people.findOneBy({ id, archivedAt: IsNull() })))
      throw new UnprocessableEntityException({
        code: 'RELATIONSHIP_INVALID',
        message: 'Requester was not found or is archived.',
      });
  }
  private assertRequirement(entry: EntryEntity) {
    if (
      !entry.projectId ||
      !['instruction', 'decision'].includes(entry.entryType)
    )
      throw new UnprocessableEntityException({
        code: 'RELATIONSHIP_INVALID',
        message:
          'Only project instructions and decisions can participate in supersession.',
      });
  }
  private reaches(edges: SupersessionEdge[], start: string, target: string) {
    const seen = new Set<string>(),
      stack = [start];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === target) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const edge of edges)
        if (edge.olderId === id) stack.push(edge.newerId);
    }
    return false;
  }
  private clean(values: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== undefined),
    );
  }
  private assertKey(key: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key,
      )
    )
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Idempotency-Key must be a UUID.',
      });
  }
  private hash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest();
  }
  private replay(receipt: CommandReceiptEntity, hash: Buffer): TaskView {
    if (!receipt.requestHash.equals(hash))
      throw new ConflictException({
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'That command key was already used for different content.',
      });
    return receipt.result as TaskView;
  }
  private versionConflict() {
    return new PreconditionFailedException({
      code: 'VERSION_CONFLICT',
      message: 'The task changed elsewhere. Reload before saving.',
    });
  }
}
