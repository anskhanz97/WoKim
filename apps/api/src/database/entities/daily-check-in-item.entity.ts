import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'daily_check_in_items' })
export class DailyCheckInItemEntity {
  @PrimaryColumn({ type: 'char', length: 36, collation: 'ascii_bin' })
  id!: string;
  @Column({
    name: 'check_in_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
  })
  checkInId!: string;
  @Column({ type: 'varchar', length: 16 }) section!:
    'current' | 'paused' | 'due' | 'waiting';
  @Column({
    name: 'task_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
    nullable: true,
  })
  taskId!: string | null;
  @Column({
    name: 'follow_up_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
    nullable: true,
  })
  followUpId!: string | null;
  @Column({
    name: 'project_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
    nullable: true,
  })
  projectId!: string | null;
  @Column({ type: 'json' }) snapshot!: Record<string, unknown>;
  @Column({ name: 'sort_order', type: 'int', unsigned: true })
  sortOrder!: number;
}
