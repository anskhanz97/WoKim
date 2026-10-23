import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'evidence_sets' })
export class EvidenceSetEntity {
  @PrimaryColumn({ type: 'char', length: 36, collation: 'ascii_bin' })
  id!: string;
  @Column({ name: 'task_id', type: 'char', length: 36, collation: 'ascii_bin' })
  taskId!: string;
  @Column({ type: 'varchar', length: 240 }) title!: string;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt!: Date;
  @VersionColumn({ type: 'int', unsigned: true, default: 1 }) version!: number;
}
