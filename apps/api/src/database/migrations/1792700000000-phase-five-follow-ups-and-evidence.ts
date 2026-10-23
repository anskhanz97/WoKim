import { MigrationInterface, QueryRunner } from 'typeorm';

export class PhaseFiveFollowUpsAndEvidence1792700000000 implements MigrationInterface {
  name = 'PhaseFiveFollowUpsAndEvidence1792700000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE follow_ups (
      id CHAR(36) COLLATE ascii_bin PRIMARY KEY,
      project_id CHAR(36) COLLATE ascii_bin NULL,
      task_id CHAR(36) COLLATE ascii_bin NULL,
      person_id CHAR(36) COLLATE ascii_bin NULL,
      source_entry_id CHAR(36) COLLATE ascii_bin NULL,
      question TEXT NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'waiting',
      follow_up_on DATE NULL,
      resolution TEXT NULL,
      resolved_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      version INT UNSIGNED NOT NULL DEFAULT 1,
      KEY idx_follow_status (status,follow_up_on,id),
      KEY idx_follow_person (person_id,status),
      KEY idx_follow_project (project_id,status),
      KEY idx_follow_task (task_id,status),
      CONSTRAINT fk_follow_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
      CONSTRAINT fk_follow_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT,
      CONSTRAINT fk_follow_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT,
      CONSTRAINT fk_follow_source FOREIGN KEY (source_entry_id) REFERENCES entries(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB`);
    await queryRunner.query(
      'ALTER TABLE daily_check_in_items ADD CONSTRAINT fk_check_item_follow_up FOREIGN KEY (follow_up_id) REFERENCES follow_ups(id) ON DELETE RESTRICT',
    );
    await queryRunner.query(`CREATE TABLE evidence_sets (
      id CHAR(36) COLLATE ascii_bin PRIMARY KEY,
      task_id CHAR(36) COLLATE ascii_bin NOT NULL,
      title VARCHAR(240) NOT NULL,
      notes TEXT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      version INT UNSIGNED NOT NULL DEFAULT 1,
      KEY idx_evidence_task (task_id,created_at,id),
      CONSTRAINT fk_evidence_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE evidence_items (
      id CHAR(36) COLLATE ascii_bin PRIMARY KEY,
      evidence_set_id CHAR(36) COLLATE ascii_bin NOT NULL,
      attachment_id CHAR(36) COLLATE ascii_bin NOT NULL,
      side VARCHAR(16) NOT NULL,
      caption TEXT NULL,
      viewport_label VARCHAR(120) NULL,
      captured_at DATETIME(3) NULL,
      sort_order INT UNSIGNED NOT NULL DEFAULT 0,
      UNIQUE KEY uq_evidence_attachment (evidence_set_id,attachment_id),
      KEY idx_evidence_side (evidence_set_id,side,sort_order),
      CONSTRAINT fk_evidence_item_set FOREIGN KEY (evidence_set_id) REFERENCES evidence_sets(id) ON DELETE CASCADE,
      CONSTRAINT fk_evidence_item_attachment FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE evidence_items');
    await queryRunner.query('DROP TABLE evidence_sets');
    await queryRunner.query(
      'ALTER TABLE daily_check_in_items DROP FOREIGN KEY fk_check_item_follow_up',
    );
    await queryRunner.query('DROP TABLE follow_ups');
  }
}
