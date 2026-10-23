import { MigrationInterface, QueryRunner } from 'typeorm';

export class PhaseSixExportsAndDeletionManifest1792710000000 implements MigrationInterface {
  name = 'PhaseSixExportsAndDeletionManifest1792710000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE export_jobs (
      id CHAR(36) COLLATE ascii_bin PRIMARY KEY,
      scope VARCHAR(16) NOT NULL,
      project_id CHAR(36) COLLATE ascii_bin NULL,
      status VARCHAR(16) NOT NULL,
      storage_key VARCHAR(512) NULL,
      error_code VARCHAR(64) NULL,
      expires_at DATETIME(3) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      completed_at DATETIME(3) NULL,
      KEY idx_exports_expiry (status,expires_at),
      CONSTRAINT fk_export_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE deletion_manifest (
      id CHAR(36) COLLATE ascii_bin PRIMARY KEY,
      object_kind VARCHAR(24) NOT NULL,
      object_id CHAR(36) COLLATE ascii_bin NOT NULL,
      purged_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_deletion_object (object_kind,object_id)
    ) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE deletion_manifest');
    await queryRunner.query('DROP TABLE export_jobs');
  }
}
