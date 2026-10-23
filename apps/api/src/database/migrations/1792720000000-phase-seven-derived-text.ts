import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PhaseSevenDerivedText1792720000000 implements MigrationInterface {
  name = 'PhaseSevenDerivedText1792720000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS processing_settings (
      id TINYINT UNSIGNED NOT NULL,
      transcription_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      ocr_languages VARCHAR(120) NOT NULL DEFAULT 'eng',
      transcription_language VARCHAR(32) NULL,
      model_id VARCHAR(191) NOT NULL DEFAULT 'onnx-community/whisper-tiny',
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      version INT UNSIGNED NOT NULL DEFAULT 1,
      PRIMARY KEY (id), CHECK (id=1)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(
      'INSERT IGNORE INTO processing_settings (id) VALUES (1)',
    );
    await queryRunner.query(`CREATE TABLE derived_texts (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      attachment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      kind VARCHAR(16) NOT NULL,
      revision_no INT UNSIGNED NOT NULL,
      machine_text LONGTEXT NOT NULL,
      reviewed_text LONGTEXT NULL,
      search_text LONGTEXT NOT NULL,
      language VARCHAR(32) NULL,
      model_id VARCHAR(191) NULL,
      segments JSON NULL,
      is_current BOOLEAN NOT NULL DEFAULT TRUE,
      current_slot VARCHAR(16) AS (IF(is_current,kind,NULL)) STORED,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      version INT UNSIGNED NOT NULL DEFAULT 1,
      PRIMARY KEY (id),
      UNIQUE KEY uq_derived_revision (attachment_id,kind,revision_no),
      UNIQUE KEY uq_derived_current (attachment_id,current_slot),
      KEY idx_derived_current (attachment_id,kind,is_current),
      FULLTEXT KEY ft_derived_search (search_text),
      CONSTRAINT fk_derived_attachment FOREIGN KEY (attachment_id) REFERENCES attachments(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE derived_texts');
    await queryRunner.query('DROP TABLE processing_settings');
  }
}
