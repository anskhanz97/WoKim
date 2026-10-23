import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { CommandReceiptEntity } from '../database/entities/command-receipt.entity';
import { DailyCheckInEntity } from '../database/entities/daily-check-in.entity';
import { DailyCheckInItemEntity } from '../database/entities/daily-check-in-item.entity';
import { EntryEntity } from '../database/entities/entry.entity';
import { FocusSessionEntity } from '../database/entities/focus-session.entity';
import { FollowUpEntity } from '../database/entities/follow-up.entity';
import { InterruptionEntity } from '../database/entities/interruption.entity';
import { ProjectEntity } from '../database/entities/project.entity';
import { TaskEntity } from '../database/entities/task.entity';
import { UserEntity } from '../database/entities/user.entity';
import type {
  CheckInItemDto,
  FocusFinishDto,
  FocusPauseDto,
  FocusStartDto,
  FocusSwitchDto,
  SaveCheckInDto,
} from './focus.dto';

@Injectable()
export class FocusService {
  constructor(private readonly dataSource: DataSource) {}

  async get() {
    return this.snapshot(this.dataSource.manager);
  }

  start(key: string, input: FocusStartDto) {
    return this.command('focus.start', key, input, async (manager, owner) => {
      if (owner.activeFocusSessionId)
        throw new ConflictException({
          code: 'FOCUS_CONFLICT',
          message: 'Pause or switch the active task first.',
        });
      const task = await this.eligibleTask(manager, input.taskId);
      const session = await this.open(manager, task);
      owner.activeFocusSessionId = session.id;
      owner.focusVersion += 1;
      await manager.save(owner);
    });
  }

  switch(key: string, input: FocusSwitchDto) {
    return this.command('focus.switch', key, input, async (manager, owner) => {
      const current = await this.current(manager, owner);
      if (!current)
        throw new ConflictException({
          code: 'FOCUS_CONFLICT',
          message: 'There is no active task to switch from.',
        });
      if (current.task.id === input.targetTaskId) return;
      const target = await this.eligibleTask(manager, input.targetTaskId);
      const checkpointId = await this.checkpoint(
        manager,
        current.task,
        input.checkpoint,
      );
      current.session.endedAt = new Date();
      current.session.endReason = 'switch';
      current.session.checkpointEntryId = checkpointId;
      current.task.status = 'paused';
      if (input.nextAction !== undefined)
        current.task.nextAction = input.nextAction.trim() || null;
      current.task.version += 1;
      await manager.save([current.session, current.task]);
      const next = await this.open(manager, target);
      await manager.save(
        manager.create(InterruptionEntity, {
          id: randomUUID(),
          fromFocusSessionId: current.session.id,
          toFocusSessionId: next.id,
        }),
      );
      owner.activeFocusSessionId = next.id;
      owner.focusVersion += 1;
      await manager.save(owner);
    });
  }

  pause(key: string, input: FocusPauseDto) {
    return this.command('focus.pause', key, input, async (manager, owner) => {
      const current = await this.current(manager, owner);
      if (!current)
        throw new ConflictException({
          code: 'FOCUS_CONFLICT',
          message: 'There is no active task to pause.',
        });
      current.session.endedAt = new Date();
      current.session.endReason = input.reason;
      current.session.checkpointEntryId = await this.checkpoint(
        manager,
        current.task,
        input.checkpoint,
      );
      current.task.status = input.reason === 'wait' ? 'waiting' : 'paused';
      if (input.nextAction !== undefined)
        current.task.nextAction = input.nextAction.trim() || null;
      current.task.version += 1;
      owner.activeFocusSessionId = null;
      owner.focusVersion += 1;
      await manager.save([current.session, current.task, owner]);
    });
  }

  finish(key: string, input: FocusFinishDto) {
    return this.command('focus.finish', key, input, async (manager, owner) => {
      const current = await this.current(manager, owner);
      if (!current)
        throw new ConflictException({
          code: 'FOCUS_CONFLICT',
          message: 'There is no active task to finish.',
        });
      current.session.endedAt = new Date();
      current.session.endReason = input.action;
      current.session.checkpointEntryId = await this.checkpoint(
        manager,
        current.task,
        input.checkpoint,
      );
      current.task.status = input.action === 'done' ? 'done' : 'cancelled';
      current.task.completedAt = input.action === 'done' ? new Date() : null;
      current.task.version += 1;
      owner.activeFocusSessionId = null;
      owner.focusVersion += 1;
      await manager.save([current.session, current.task, owner]);
    });
  }

  async sessions(taskId: string) {
    return this.dataSource.manager.find(FocusSessionEntity, {
      where: { taskId },
      order: { startedAt: 'DESC', id: 'ASC' },
    });
  }

  async today(date?: string) {
    const owner = await this.dataSource.manager.findOneByOrFail(UserEntity, {
      id: 1,
    });
    const localDate = date || this.localDate(owner.timezone);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate))
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Date must use YYYY-MM-DD.',
      });
    const [focus, paused, due, waiting, checkIn] = await Promise.all([
      this.get(),
      this.dataSource.manager.find(TaskEntity, {
        where: { status: 'paused' },
        order: { updatedAt: 'DESC' },
        take: 100,
      }),
      this.dataSource.manager
        .createQueryBuilder(TaskEntity, 'task')
        .where('task.trashed_at IS NULL')
        .andWhere("task.status NOT IN ('done','cancelled')")
        .andWhere('(task.due_date IS NOT NULL OR task.due_at IS NOT NULL)')
        .orderBy('COALESCE(task.due_at,task.due_date)', 'ASC')
        .limit(100)
        .getMany(),
      this.dataSource.manager.find(FollowUpEntity, {
        where: { status: 'waiting' },
        order: { followUpOn: 'ASC', createdAt: 'DESC' },
        take: 100,
      }),
      this.checkIn(localDate, false),
    ]);
    return {
      localDate,
      timezone: owner.timezone,
      focus,
      paused,
      due,
      waiting,
      checkIn,
    };
  }

  async checkIn(date: string, required = true) {
    const row = await this.dataSource.manager.findOneBy(DailyCheckInEntity, {
      localDate: date,
    });
    if (!row) {
      if (required)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Check-in not found.',
        });
      return null;
    }
    const items = await this.dataSource.manager.find(DailyCheckInItemEntity, {
      where: { checkInId: row.id },
      order: { section: 'ASC', sortOrder: 'ASC' },
    });
    return { ...row, items };
  }

  async saveCheckIn(date: string, input: SaveCheckInDto) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: input.timezone }).format();
    } catch {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Timezone is invalid.',
      });
    }
    return this.dataSource.transaction(async (manager) => {
      let row = await manager.findOne(DailyCheckInEntity, {
        where: { localDate: date },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        (!row && input.expectedVersion != null) ||
        (row && row.version !== input.expectedVersion)
      )
        throw new ConflictException({
          code: 'VERSION_CONFLICT',
          message: 'The check-in changed elsewhere.',
        });
      row ??= manager.create(DailyCheckInEntity, {
        id: randomUUID(),
        localDate: date,
        version: 1,
      });
      Object.assign(row, {
        timezone: input.timezone,
        intendedOutcome: input.intendedOutcome?.trim() || null,
        interruptionNotes: input.interruptionNotes?.trim() || null,
        deadlineNotes: input.deadlineNotes?.trim() || null,
        waitingNotes: input.waitingNotes?.trim() || null,
        reflection: input.reflection?.trim() || null,
      });
      await manager.save(row);
      await manager.delete(DailyCheckInItemEntity, { checkInId: row.id });
      for (let index = 0; index < input.items.length; index += 1)
        await manager.save(
          await this.checkInItem(manager, row.id, index, input.items[index]),
        );
      return this.checkInWithManager(manager, row);
    });
  }

  private async command(
    operation: string,
    key: string,
    input: { expectedFocusVersion: number },
    mutate: (manager: EntityManager, owner: UserEntity) => Promise<void>,
  ) {
    this.assertKey(key);
    const hash = createHash('sha256').update(JSON.stringify(input)).digest();
    const prior = await this.dataSource.manager.findOneBy(
      CommandReceiptEntity,
      { commandKey: key },
    );
    if (prior) {
      if (!prior.requestHash.equals(hash))
        throw new ConflictException({
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Command key was reused.',
        });
      return prior.result;
    }
    return this.dataSource.transaction(async (manager) => {
      const owner = await manager.findOneOrFail(UserEntity, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      if (owner.focusVersion !== input.expectedFocusVersion)
        throw new ConflictException({
          code: 'FOCUS_CONFLICT',
          message: 'Focus changed elsewhere.',
          current: await this.snapshot(manager),
        });
      await mutate(manager, owner);
      const result = await this.snapshot(manager);
      await manager.save(
        manager.create(CommandReceiptEntity, {
          commandKey: key,
          operation,
          requestHash: hash,
          resultStatus: 200,
          result,
          expiresAt: new Date(Date.now() + 7 * 86400000),
        }),
      );
      return result;
    });
  }

  private async snapshot(manager: EntityManager) {
    const owner = await manager.findOneByOrFail(UserEntity, { id: 1 });
    if (!owner.activeFocusSessionId)
      return { focusVersion: owner.focusVersion, session: null, task: null };
    const session = await manager.findOneByOrFail(FocusSessionEntity, {
      id: owner.activeFocusSessionId,
    });
    const task = await manager.findOneByOrFail(TaskEntity, {
      id: session.taskId,
    });
    return { focusVersion: owner.focusVersion, session, task };
  }

  private async current(manager: EntityManager, owner: UserEntity) {
    if (!owner.activeFocusSessionId) return null;
    const session = await manager.findOneByOrFail(FocusSessionEntity, {
      id: owner.activeFocusSessionId,
    });
    const task = await manager.findOneByOrFail(TaskEntity, {
      id: session.taskId,
    });
    return { session, task };
  }

  private async eligibleTask(manager: EntityManager, id: string) {
    const task = await manager.findOne(TaskEntity, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!task || task.trashedAt)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Task not found.',
      });
    if (!['ready', 'paused', 'waiting'].includes(task.status))
      throw new UnprocessableEntityException({
        code: 'INVALID_TRANSITION',
        message: 'Task is not eligible to start.',
      });
    const project = await manager.findOneByOrFail(ProjectEntity, {
      id: task.projectId,
    });
    if (project.status !== 'active')
      throw new UnprocessableEntityException({
        code: 'INVALID_TRANSITION',
        message: 'Reactivate the project before starting work.',
      });
    return task;
  }

  private async open(manager: EntityManager, task: TaskEntity) {
    task.status = 'in_progress';
    task.version += 1;
    await manager.save(task);
    return manager.save(
      manager.create(FocusSessionEntity, {
        id: randomUUID(),
        taskId: task.id,
        startedAt: new Date(),
        endedAt: null,
        endReason: null,
        checkpointEntryId: null,
      }),
    );
  }

  private async checkpoint(
    manager: EntityManager,
    task: TaskEntity,
    text?: string,
  ) {
    if (!text?.trim()) return null;
    const entry = manager.create(EntryEntity, {
      id: randomUUID(),
      projectId: task.projectId,
      taskId: task.id,
      title: `Checkpoint: ${task.title}`,
      entryType: 'checkpoint',
      inboxState: 'organized',
      sourceKind: 'typed',
      originalText: text.trim(),
      contentText: text.trim(),
      sourceUrl: null,
      sourceLabel: null,
      senderPersonId: null,
      occurredAt: null,
      occurredTimezone: null,
      trashedAt: null,
    });
    return (await manager.save(entry)).id;
  }

  private async checkInItem(
    manager: EntityManager,
    checkInId: string,
    sortOrder: number,
    input: CheckInItemDto,
  ) {
    const references = [input.taskId, input.followUpId, input.projectId].filter(
      Boolean,
    );
    if (references.length !== 1)
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Each check-in item needs exactly one reference.',
      });
    let snapshot: Record<string, unknown>;
    if (input.taskId) {
      const task = await manager.findOneByOrFail(TaskEntity, {
        id: input.taskId,
      });
      if (!['current', 'paused', 'due'].includes(input.section))
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Task is invalid for that section.',
        });
      snapshot = {
        label: task.title,
        status: task.status,
        nextAction: task.nextAction,
        dueDate: task.dueDate,
        dueAt: task.dueAt,
      };
    } else if (input.projectId) {
      const project = await manager.findOneByOrFail(ProjectEntity, {
        id: input.projectId,
      });
      if (input.section !== 'due')
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Projects are only valid in due.',
        });
      snapshot = {
        label: project.name,
        status: project.status,
        targetDate: project.targetDate,
      };
    } else if (input.followUpId) {
      const followUp = await manager.findOneByOrFail(FollowUpEntity, {
        id: input.followUpId,
      });
      if (input.section !== 'waiting')
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Follow-ups are only valid in waiting.',
        });
      snapshot = {
        label: followUp.question,
        status: followUp.status,
        followUpOn: followUp.followUpOn,
      };
    } else {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'A reference is required.',
      });
    }
    return manager.create(DailyCheckInItemEntity, {
      id: randomUUID(),
      checkInId,
      section: input.section,
      taskId: input.taskId || null,
      followUpId: input.followUpId || null,
      projectId: input.projectId || null,
      snapshot,
      sortOrder,
    });
  }

  private async checkInWithManager(
    manager: EntityManager,
    row: DailyCheckInEntity,
  ) {
    const items = await manager.find(DailyCheckInItemEntity, {
      where: { checkInId: row.id },
      order: { section: 'ASC', sortOrder: 'ASC' },
    });
    return { ...row, items };
  }

  private localDate(timeZone: string) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
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
}
