import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'derived_texts' })
export class DerivedTextEntity {
  @PrimaryColumn({ type: 'char', length: 36, collation: 'ascii_bin' })
  id!: string;
  @Column({
    name: 'attachment_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
  })
  attachmentId!: string;
  @Column({ type: 'varchar', length: 16 }) kind!: 'ocr' | 'transcript';
  @Column({ name: 'revision_no', type: 'int', unsigned: true })
  revisionNo!: number;
  @Column({ name: 'machine_text', type: 'longtext' }) machineText!: string;
  @Column({ name: 'reviewed_text', type: 'longtext', nullable: true })
  reviewedText!: string | null;
  @Column({ name: 'search_text', type: 'longtext' }) searchText!: string;
  @Column({ type: 'varchar', length: 32, nullable: true }) language!:
    string | null;
  @Column({ name: 'model_id', type: 'varchar', length: 191, nullable: true })
  modelId!: string | null;
  @Column({ type: 'json', nullable: true }) segments!: Array<{
    startMs: number;
    endMs: number;
    text: string;
  }> | null;
  @Column({ name: 'is_current', type: 'boolean', default: true })
  isCurrent!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
  @VersionColumn({ type: 'int', unsigned: true, default: 1 }) version!: number;
}
