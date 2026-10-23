import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'export_jobs' })
export class ExportJobEntity {
  @PrimaryColumn({ type: 'char', length: 36, collation: 'ascii_bin' })
  id!: string;
  @Column({ type: 'varchar', length: 16 }) scope!: 'all' | 'project';
  @Column({
    name: 'project_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
    nullable: true,
  })
  projectId!: string | null;
  @Column({ type: 'varchar', length: 16 }) status!:
    'running' | 'succeeded' | 'failed' | 'cancelled';
  @Column({ name: 'storage_key', type: 'varchar', length: 512, nullable: true })
  storageKey!: string | null;
  @Column({ name: 'error_code', type: 'varchar', length: 64, nullable: true })
  errorCode!: string | null;
  @Column({ name: 'expires_at', type: 'datetime', precision: 3 })
  expiresAt!: Date;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
  @Column({
    name: 'completed_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  completedAt!: Date | null;
}
