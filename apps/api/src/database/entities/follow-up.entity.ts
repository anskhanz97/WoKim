import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'follow_ups' })
export class FollowUpEntity {
  @PrimaryColumn({ type: 'char', length: 36, collation: 'ascii_bin' })
  id!: string;
  @Column({
    name: 'project_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
    nullable: true,
  })
  projectId!: string | null;
  @Column({
    name: 'task_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
    nullable: true,
  })
  taskId!: string | null;
  @Column({
    name: 'person_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
    nullable: true,
  })
  personId!: string | null;
  @Column({
    name: 'source_entry_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
    nullable: true,
  })
  sourceEntryId!: string | null;
  @Column({ type: 'text' }) question!: string;
  @Column({ type: 'varchar', length: 16, default: 'waiting' }) status!:
    'waiting' | 'answered' | 'cancelled';
  @Column({ name: 'follow_up_on', type: 'date', nullable: true }) followUpOn!:
    string | null;
  @Column({ type: 'text', nullable: true }) resolution!: string | null;
  @Column({
    name: 'resolved_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  resolvedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt!: Date;
  @VersionColumn({ type: 'int', unsigned: true, default: 1 }) version!: number;
}
