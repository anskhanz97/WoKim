import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'entry_revisions' })
export class EntryRevisionEntity {
  @PrimaryColumn({ type: 'char', length: 36 }) id!: string;
  @Column({ name: 'entry_id', type: 'char', length: 36 }) entryId!: string;
  @Column({ name: 'revision_no', type: 'int', unsigned: true })
  revisionNo!: number;
  @Column({ type: 'varchar', length: 240, nullable: true }) title!:
    string | null;
  @Column({ name: 'content_text', type: 'mediumtext', nullable: true })
  contentText!: string | null;
  @Column({
    name: 'change_reason',
    type: 'varchar',
    length: 240,
    nullable: true,
  })
  changeReason!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
}
