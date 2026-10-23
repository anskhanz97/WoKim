import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'daily_check_ins' })
export class DailyCheckInEntity {
  @PrimaryColumn({ type: 'char', length: 36, collation: 'ascii_bin' })
  id!: string;
  @Column({ name: 'local_date', type: 'date', unique: true })
  localDate!: string;
  @Column({ type: 'varchar', length: 64 }) timezone!: string;
  @Column({ name: 'intended_outcome', type: 'text', nullable: true })
  intendedOutcome!: string | null;
  @Column({ name: 'interruption_notes', type: 'text', nullable: true })
  interruptionNotes!: string | null;
  @Column({ name: 'deadline_notes', type: 'text', nullable: true })
  deadlineNotes!: string | null;
  @Column({ name: 'waiting_notes', type: 'text', nullable: true })
  waitingNotes!: string | null;
  @Column({ type: 'text', nullable: true }) reflection!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt!: Date;
  @VersionColumn({ type: 'int', unsigned: true, default: 1 }) version!: number;
}
