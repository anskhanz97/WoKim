import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'processing_jobs' })
export class ProcessingJobEntity {
  @PrimaryColumn({ type: 'char', length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 24 }) kind!: string;
  @Column({ name: 'attachment_id', type: 'char', length: 36, nullable: true })
  attachmentId!: string | null;
  @Column({ type: 'varchar', length: 16, default: 'queued' }) status!: string;
  @Column({ type: 'json' }) input!: Record<string, unknown>;
  @Column({ type: 'json', nullable: true }) result!: Record<
    string,
    unknown
  > | null;
  @Column({ type: 'int', unsigned: true, default: 0 }) attempts!: number;
  @Column({ name: 'max_attempts', type: 'int', unsigned: true, default: 3 })
  maxAttempts!: number;
  @Column({ name: 'available_at', type: 'datetime', precision: 3 })
  availableAt!: Date;
  @Column({ name: 'lease_token', type: 'char', length: 36, nullable: true })
  leaseToken!: string | null;
  @Column({
    name: 'lease_expires_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  leaseExpiresAt!: Date | null;
  @Column({
    name: 'last_error_code',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  lastErrorCode!: string | null;
  @Column({
    name: 'last_error_message',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  lastErrorMessage!: string | null;
  @Column({ name: 'dedupe_key', type: 'varchar', length: 191, nullable: true })
  dedupeKey!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt!: Date;
  @VersionColumn({ type: 'int', unsigned: true, default: 1 }) version!: number;
}
