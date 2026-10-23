import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'focus_sessions' })
export class FocusSessionEntity {
  @PrimaryColumn({ type: 'char', length: 36, collation: 'ascii_bin' })
  id!: string;
  @Column({ name: 'task_id', type: 'char', length: 36, collation: 'ascii_bin' })
  taskId!: string;
  @Column({ name: 'started_at', type: 'datetime', precision: 3 })
  startedAt!: Date;
  @Column({ name: 'ended_at', type: 'datetime', precision: 3, nullable: true })
  endedAt!: Date | null;
  @Column({ name: 'end_reason', type: 'varchar', length: 16, nullable: true })
  endReason!: string | null;
  @Column({
    name: 'checkpoint_entry_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
    nullable: true,
  })
  checkpointEntryId!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
}
