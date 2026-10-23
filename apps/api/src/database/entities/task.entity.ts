import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export const taskTypes = [
  'bug',
  'feature',
  'change',
  'testing',
  'integration',
  'investigation',
  'chore',
] as const;
export const taskStatuses = [
  'ready',
  'in_progress',
  'paused',
  'waiting',
  'done',
  'cancelled',
] as const;
export const taskPriorities = ['low', 'normal', 'high', 'urgent'] as const;
export type TaskType = (typeof taskTypes)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];

@Entity({ name: 'tasks' })
export class TaskEntity {
  @PrimaryColumn({ type: 'char', length: 36, collation: 'ascii_bin' })
  id!: string;
  @Column({
    name: 'project_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
  })
  projectId!: string;
  @Column({ type: 'varchar', length: 240 }) title!: string;
  @Column({ type: 'mediumtext', nullable: true }) description!: string | null;
  @Column({ type: 'varchar', length: 24 }) type!: TaskType;
  @Column({ type: 'varchar', length: 16, default: 'ready' })
  status!: TaskStatus;
  @Column({ type: 'varchar', length: 8, default: 'normal' })
  priority!: TaskPriority;
  @Column({
    name: 'requested_by_person_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
    nullable: true,
  })
  requestedByPersonId!: string | null;
  @Column({
    name: 'source_entry_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
    nullable: true,
    unique: true,
  })
  sourceEntryId!: string | null;
  @Column({ name: 'next_action', type: 'text', nullable: true }) nextAction!:
    string | null;
  @Column({ name: 'branch_name', type: 'varchar', length: 240, nullable: true })
  branchName!: string | null;
  @Column({ type: 'json', nullable: true }) links!: Array<{
    kind: string;
    label: string;
    url: string;
  }> | null;
  @Column({ name: 'deadline_kind', type: 'varchar', length: 8, nullable: true })
  deadlineKind!: 'hard' | 'target' | null;
  @Column({ name: 'due_date', type: 'date', nullable: true }) dueDate!:
    string | null;
  @Column({ name: 'due_at', type: 'datetime', precision: 3, nullable: true })
  dueAt!: Date | null;
  @Column({ name: 'due_timezone', type: 'varchar', length: 64, nullable: true })
  dueTimezone!: string | null;
  @Column({
    name: 'completed_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  completedAt!: Date | null;
  @Column({
    name: 'trashed_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  trashedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt!: Date;
  @VersionColumn({ type: 'int', unsigned: true, default: 1 }) version!: number;
}
