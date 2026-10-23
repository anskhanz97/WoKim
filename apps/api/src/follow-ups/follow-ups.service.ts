import {
  ConflictException,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AttachmentEntity } from '../database/entities/attachment.entity';
import { EntryEntity } from '../database/entities/entry.entity';
import { EvidenceItemEntity } from '../database/entities/evidence-item.entity';
import { EvidenceSetEntity } from '../database/entities/evidence-set.entity';
import { FollowUpEntity } from '../database/entities/follow-up.entity';
import { PersonEntity } from '../database/entities/person.entity';
import { ProjectEntity } from '../database/entities/project.entity';
import { TaskEntity } from '../database/entities/task.entity';
import type {
  CreateEvidenceSetDto,
  CreateFollowUpDto,
  EvidenceItemDto,
  UpdateEvidenceItemDto,
  UpdateEvidenceSetDto,
  UpdateFollowUpDto,
} from './follow-ups.dto';

@Injectable()
export class FollowUpsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(FollowUpEntity)
    private readonly followUps: Repository<FollowUpEntity>,
    @InjectRepository(EvidenceSetEntity)
    private readonly sets: Repository<EvidenceSetEntity>,
  ) {}

  list(filters: {
    status?: string;
    personId?: string;
    projectId?: string;
    taskId?: string;
  }) {
    const query = this.followUps
      .createQueryBuilder('follow')
      .orderBy('follow.follow_up_on', 'ASC')
      .addOrderBy('follow.created_at', 'DESC')
      .addOrderBy('follow.id', 'ASC');
    if (filters.status)
      query.andWhere('follow.status=:status', { status: filters.status });
    if (filters.personId)
      query.andWhere('follow.person_id=:personId', {
        personId: filters.personId,
      });
    if (filters.projectId)
      query.andWhere('follow.project_id=:projectId', {
        projectId: filters.projectId,
      });
    if (filters.taskId)
      query.andWhere('follow.task_id=:taskId', { taskId: filters.taskId });
    return query.getMany();
  }

  async createFollowUp(input: CreateFollowUpDto) {
    const projectId = await this.validateFollowUp(
      input.projectId,
      input.taskId,
      input.personId,
      input.sourceEntryId,
    );
    return this.followUps.save(
      this.followUps.create({
        id: randomUUID(),
        projectId,
        taskId: input.taskId || null,
        personId: input.personId || null,
        sourceEntryId: input.sourceEntryId || null,
        question: input.question.trim(),
        status: 'waiting',
        followUpOn: input.followUpOn || null,
        resolution: null,
        resolvedAt: null,
      }),
    );
  }

  async getFollowUp(id: string) {
    const row = await this.followUps.findOneBy({ id });
    if (!row)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Follow-up not found.',
      });
    return row;
  }

  async updateFollowUp(id: string, version: number, input: UpdateFollowUpDto) {
    const values: Partial<FollowUpEntity> = {};
    if (input.question !== undefined) values.question = input.question.trim();
    if (input.followUpOn !== undefined)
      values.followUpOn = input.followUpOn || null;
    if (input.resolution !== undefined)
      values.resolution = input.resolution?.trim() || null;
    if (input.status !== undefined) {
      values.status = input.status;
      values.resolvedAt = input.status === 'waiting' ? null : new Date();
    }
    const result = await this.followUps
      .createQueryBuilder()
      .update()
      .set({ ...values, version: () => 'version + 1' })
      .where('id=:id AND version=:version', { id, version })
      .execute();
    if (result.affected !== 1) throw this.conflict();
    return this.getFollowUp(id);
  }

  async listSets(taskId?: string, projectId?: string) {
    const query = this.sets
      .createQueryBuilder('evidence')
      .innerJoin(TaskEntity, 'task', 'task.id=evidence.task_id')
      .orderBy('evidence.created_at', 'DESC')
      .addOrderBy('evidence.id', 'ASC');
    if (taskId) query.andWhere('evidence.task_id=:taskId', { taskId });
    if (projectId) query.andWhere('task.project_id=:projectId', { projectId });
    return Promise.all(
      (await query.getMany()).map((set) => this.evidence(set.id)),
    );
  }

  async taskImages(taskId: string) {
    return this.dataSource.manager
      .createQueryBuilder(AttachmentEntity, 'attachment')
      .innerJoin(EntryEntity, 'entry', 'entry.id=attachment.entry_id')
      .where('entry.task_id=:taskId', { taskId })
      .andWhere('entry.trashed_at IS NULL')
      .andWhere('attachment.trashed_at IS NULL')
      .andWhere("attachment.mime_type LIKE 'image/%'")
      .orderBy('attachment.created_at', 'DESC')
      .addOrderBy('attachment.id', 'ASC')
      .getMany();
  }

  async createSet(input: CreateEvidenceSetDto) {
    const task = await this.dataSource.manager.findOneBy(TaskEntity, {
      id: input.taskId,
      trashedAt: IsNull(),
    });
    if (!task)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Task not found.',
      });
    const set = await this.sets.save(
      this.sets.create({
        id: randomUUID(),
        taskId: task.id,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
      }),
    );
    return this.evidence(set.id);
  }

  async evidence(id: string) {
    return this.evidenceWith(this.dataSource.manager, id);
  }

  private async evidenceWith(manager: EntityManager, id: string) {
    const set = await manager.findOneBy(EvidenceSetEntity, { id });
    if (!set)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Evidence set not found.',
      });
    const items = await manager
      .createQueryBuilder(EvidenceItemEntity, 'item')
      .innerJoinAndMapOne(
        'item.attachment',
        AttachmentEntity,
        'attachment',
        'attachment.id=item.attachment_id',
      )
      .where('item.evidence_set_id=:id', { id })
      .orderBy('item.side', 'ASC')
      .addOrderBy('item.sort_order', 'ASC')
      .addOrderBy('item.id', 'ASC')
      .getMany();
    return { ...set, items };
  }

  async updateSet(id: string, version: number, input: UpdateEvidenceSetDto) {
    const values: Partial<EvidenceSetEntity> = {};
    if (input.title !== undefined) values.title = input.title.trim();
    if (input.notes !== undefined) values.notes = input.notes?.trim() || null;
    const result = await this.sets
      .createQueryBuilder()
      .update()
      .set({ ...values, version: () => 'version + 1' })
      .where('id=:id AND version=:version', { id, version })
      .execute();
    if (result.affected !== 1) throw this.conflict();
    return this.evidence(id);
  }

  async deleteSet(id: string, version: number) {
    const result = await this.sets
      .createQueryBuilder()
      .delete()
      .where('id=:id AND version=:version', { id, version })
      .execute();
    if (result.affected !== 1) throw this.conflict();
  }

  async addItem(setId: string, version: number, input: EvidenceItemDto) {
    return this.dataSource.transaction(async (manager) => {
      const set = await manager.findOne(EvidenceSetEntity, {
        where: { id: setId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!set || set.version !== version) throw this.conflict();
      const attachment = await manager.findOne(AttachmentEntity, {
        where: { id: input.attachmentId },
      });
      if (
        !attachment ||
        attachment.trashedAt ||
        !attachment.mimeType.startsWith('image/')
      )
        throw new UnprocessableEntityException({
          code: 'RELATIONSHIP_INVALID',
          message: 'Evidence requires an available image attachment.',
        });
      const entry = await manager.findOneByOrFail(EntryEntity, {
        id: attachment.entryId,
      });
      if (entry.taskId !== set.taskId)
        throw new UnprocessableEntityException({
          code: 'RELATIONSHIP_INVALID',
          message: 'Evidence image must belong to the same task.',
        });
      try {
        await manager.save(
          manager.create(EvidenceItemEntity, {
            id: randomUUID(),
            evidenceSetId: set.id,
            attachmentId: attachment.id,
            side: input.side,
            caption: input.caption?.trim() || null,
            viewportLabel: input.viewportLabel?.trim() || null,
            capturedAt: input.capturedAt ? new Date(input.capturedAt) : null,
            sortOrder: input.sortOrder || 0,
          }),
        );
      } catch (error) {
        if ((error as { code?: string }).code === 'ER_DUP_ENTRY')
          throw new ConflictException({
            code: 'RELATIONSHIP_EXISTS',
            message: 'That image is already in this evidence set.',
          });
        throw error;
      }
      set.version += 1;
      await manager.save(set);
      return this.evidenceWith(manager, set.id);
    });
  }

  async updateItem(
    setId: string,
    itemId: string,
    version: number,
    input: UpdateEvidenceItemDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const set = await manager.findOne(EvidenceSetEntity, {
        where: { id: setId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!set || set.version !== version) throw this.conflict();
      const item = await manager.findOneBy(EvidenceItemEntity, {
        id: itemId,
        evidenceSetId: setId,
      });
      if (!item)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Evidence item not found.',
        });
      if (input.side !== undefined) item.side = input.side;
      if (input.caption !== undefined)
        item.caption = input.caption?.trim() || null;
      if (input.viewportLabel !== undefined)
        item.viewportLabel = input.viewportLabel?.trim() || null;
      if (input.capturedAt !== undefined)
        item.capturedAt = input.capturedAt ? new Date(input.capturedAt) : null;
      if (input.sortOrder !== undefined) item.sortOrder = input.sortOrder;
      await manager.save(item);
      set.version += 1;
      await manager.save(set);
      return this.evidenceWith(manager, set.id);
    });
  }

  async removeItem(setId: string, itemId: string, version: number) {
    return this.dataSource.transaction(async (manager) => {
      const set = await manager.findOne(EvidenceSetEntity, {
        where: { id: setId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!set || set.version !== version) throw this.conflict();
      const result = await manager.delete(EvidenceItemEntity, {
        id: itemId,
        evidenceSetId: setId,
      });
      if (result.affected !== 1)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Evidence item not found.',
        });
      set.version += 1;
      await manager.save(set);
      return this.evidenceWith(manager, set.id);
    });
  }

  private async validateFollowUp(
    projectId?: string,
    taskId?: string,
    personId?: string,
    sourceEntryId?: string,
  ) {
    let resolvedProject = projectId || null;
    if (taskId) {
      const task = await this.dataSource.manager.findOneBy(TaskEntity, {
        id: taskId,
      });
      if (!task)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Task not found.',
        });
      if (resolvedProject && resolvedProject !== task.projectId)
        throw new UnprocessableEntityException({
          code: 'RELATIONSHIP_INVALID',
          message: 'Task and follow-up project must match.',
        });
      resolvedProject = task.projectId;
    }
    if (
      resolvedProject &&
      !(await this.dataSource.manager.findOneBy(ProjectEntity, {
        id: resolvedProject,
      }))
    )
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Project not found.',
      });
    if (
      personId &&
      !(await this.dataSource.manager.findOneBy(PersonEntity, { id: personId }))
    )
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Person not found.',
      });
    if (
      sourceEntryId &&
      !(await this.dataSource.manager.findOneBy(EntryEntity, {
        id: sourceEntryId,
      }))
    )
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Source entry not found.',
      });
    return resolvedProject;
  }

  private conflict() {
    return new PreconditionFailedException({
      code: 'VERSION_CONFLICT',
      message: 'The record changed elsewhere.',
    });
  }
}
