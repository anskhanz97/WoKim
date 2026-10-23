import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AttachmentMediaMetadata1792673000000 implements MigrationInterface {
  name = 'AttachmentMediaMetadata1792673000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE attachments ADD width INT UNSIGNED NULL, ADD height INT UNSIGNED NULL, ADD duration_ms INT UNSIGNED NULL, ADD thumbnail_key VARCHAR(512) NULL, ADD playback_key VARCHAR(512) NULL',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE attachments DROP COLUMN playback_key, DROP COLUMN thumbnail_key, DROP COLUMN duration_ms, DROP COLUMN height, DROP COLUMN width',
    );
  }
}
