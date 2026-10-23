import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export type EntryType =
  | 'note'
  | 'instruction'
  | 'decision'
  | 'question'
  | 'work_update'
  | 'checkpoint'
  | 'reference';
export type InboxState = 'unprocessed' | 'organized' | 'dismissed';

@Entity({ name: 'entries' })
export class EntryEntity {
  @PrimaryColumn({ type: 'char', length: 36 }) id!: string;
  @Column({ name: 'project_id', type: 'char', length: 36, nullable: true })
  projectId!: string | null;
  @Column({
    name: 'task_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
    nullable: true,
  })
  taskId!: string | null;
  @Column({ type: 'varchar', length: 240, nullable: true }) title!:
    string | null;
  @Column({ name: 'entry_type', type: 'varchar', length: 24, default: 'note' })
  entryType!: EntryType;
  @Column({
    name: 'inbox_state',
    type: 'varchar',
    length: 16,
    default: 'unprocessed',
  })
  inboxState!: InboxState;
  @Column({ name: 'source_kind', type: 'varchar', length: 24 }) sourceKind!:
    'typed' | 'pasted' | 'upload' | 'recording';
  @Column({ name: 'original_text', type: 'mediumtext', nullable: true })
  originalText!: string | null;
  @Column({ name: 'content_text', type: 'mediumtext', nullable: true })
  contentText!: string | null;
  @Column({ name: 'source_url', type: 'varchar', length: 2048, nullable: true })
  sourceUrl!: string | null;
  @Column({
    name: 'source_label',
    type: 'varchar',
    length: 240,
    nullable: true,
  })
  sourceLabel!: string | null;
  @Column({
    name: 'sender_person_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  senderPersonId!: string | null;
  @Column({
    name: 'occurred_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  occurredAt!: Date | null;
  @Column({
    name: 'occurred_timezone',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  occurredTimezone!: string | null;
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
