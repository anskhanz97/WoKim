import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'evidence_items' })
export class EvidenceItemEntity {
  @PrimaryColumn({ type: 'char', length: 36, collation: 'ascii_bin' })
  id!: string;
  @Column({
    name: 'evidence_set_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
  })
  evidenceSetId!: string;
  @Column({
    name: 'attachment_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
  })
  attachmentId!: string;
  @Column({ type: 'varchar', length: 16 }) side!:
    'before' | 'after' | 'reference';
  @Column({ type: 'text', nullable: true }) caption!: string | null;
  @Column({
    name: 'viewport_label',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  viewportLabel!: string | null;
  @Column({
    name: 'captured_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  capturedAt!: Date | null;
  @Column({ name: 'sort_order', type: 'int', unsigned: true, default: 0 })
  sortOrder!: number;
}
