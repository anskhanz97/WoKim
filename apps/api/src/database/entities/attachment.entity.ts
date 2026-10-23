import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'attachments' })
export class AttachmentEntity {
  @PrimaryColumn({ type: 'char', length: 36 }) id!: string;
  @Column({ name: 'entry_id', type: 'char', length: 36 }) entryId!: string;
  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName!: string;
  @Column({ name: 'storage_key', type: 'varchar', length: 512, unique: true })
  storageKey!: string;
  @Column({ name: 'mime_type', type: 'varchar', length: 120 })
  mimeType!: string;
  @Column({ name: 'byte_size', type: 'bigint', unsigned: true })
  byteSize!: string;
  @Column({ type: 'binary', length: 32 }) sha256!: Buffer;
  @Column({ type: 'varchar', length: 24, default: 'reference' })
  purpose!: string;
  @Column({ type: 'text', nullable: true }) caption!: string | null;
  @Column({ type: 'int', unsigned: true, nullable: true }) width!:
    number | null;
  @Column({ type: 'int', unsigned: true, nullable: true }) height!:
    number | null;
  @Column({ name: 'duration_ms', type: 'int', unsigned: true, nullable: true })
  durationMs!: number | null;
  @Column({
    name: 'thumbnail_key',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  thumbnailKey!: string | null;
  @Column({
    name: 'playback_key',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  playbackKey!: string | null;
  @Column({
    name: 'media_state',
    type: 'varchar',
    length: 16,
    default: 'ready',
  })
  mediaState!: string;
  @Column({ name: 'ocr_enabled', type: 'boolean', default: false })
  ocrEnabled!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
  @Column({
    name: 'trashed_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  trashedAt!: Date | null;
}
