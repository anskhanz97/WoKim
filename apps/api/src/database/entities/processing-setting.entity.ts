import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'processing_settings' })
export class ProcessingSettingEntity {
  @PrimaryColumn({ type: 'tinyint', unsigned: true }) id!: number;
  @Column({ name: 'transcription_enabled', type: 'boolean', default: false })
  transcriptionEnabled!: boolean;
  @Column({
    name: 'ocr_languages',
    type: 'varchar',
    length: 120,
    default: 'eng',
  })
  ocrLanguages!: string;
  @Column({
    name: 'transcription_language',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  transcriptionLanguage!: string | null;
  @Column({ name: 'model_id', type: 'varchar', length: 191 }) modelId!: string;
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt!: Date;
  @VersionColumn({ type: 'int', unsigned: true, default: 1 }) version!: number;
}
