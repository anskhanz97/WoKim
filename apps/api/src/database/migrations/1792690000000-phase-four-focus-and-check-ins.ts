import { MigrationInterface, QueryRunner } from 'typeorm';

export class PhaseFourFocusAndCheckIns1792690000000 implements MigrationInterface {
  name = 'PhaseFourFocusAndCheckIns1792690000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE focus_sessions (
      id CHAR(36) COLLATE ascii_bin PRIMARY KEY,
      task_id CHAR(36) COLLATE ascii_bin NOT NULL,
      started_at DATETIME(3) NOT NULL,
      ended_at DATETIME(3) NULL,
      end_reason VARCHAR(16) NULL,
      checkpoint_entry_id CHAR(36) COLLATE ascii_bin NULL,
      open_slot TINYINT GENERATED ALWAYS AS (CASE WHEN ended_at IS NULL THEN 1 ELSE NULL END) STORED,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_focus_open (open_slot),
      KEY idx_focus_task (task_id,started_at,id),
      CONSTRAINT fk_focus_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT,
      CONSTRAINT fk_focus_checkpoint FOREIGN KEY (checkpoint_entry_id) REFERENCES entries(id) ON DELETE RESTRICT,
      CONSTRAINT chk_focus_end CHECK ((ended_at IS NULL AND end_reason IS NULL) OR (ended_at >= started_at AND end_reason IS NOT NULL))
    ) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE users
      ADD active_focus_session_id CHAR(36) COLLATE ascii_bin NULL AFTER timezone,
      ADD focus_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER active_focus_session_id,
      ADD CONSTRAINT fk_user_active_focus FOREIGN KEY (active_focus_session_id) REFERENCES focus_sessions(id) ON DELETE RESTRICT`);
    await queryRunner.query(`CREATE TABLE interruptions (
      id CHAR(36) COLLATE ascii_bin PRIMARY KEY,
      from_focus_session_id CHAR(36) COLLATE ascii_bin NOT NULL,
      to_focus_session_id CHAR(36) COLLATE ascii_bin NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_interruption_from (from_focus_session_id),
      UNIQUE KEY uq_interruption_to (to_focus_session_id),
      CONSTRAINT fk_interruption_from FOREIGN KEY (from_focus_session_id) REFERENCES focus_sessions(id) ON DELETE RESTRICT,
      CONSTRAINT fk_interruption_to FOREIGN KEY (to_focus_session_id) REFERENCES focus_sessions(id) ON DELETE RESTRICT,
      CONSTRAINT chk_interruption_distinct CHECK (from_focus_session_id <> to_focus_session_id)
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE daily_check_ins (
      id CHAR(36) COLLATE ascii_bin PRIMARY KEY,
      local_date DATE NOT NULL,
      timezone VARCHAR(64) NOT NULL,
      intended_outcome TEXT NULL,
      interruption_notes TEXT NULL,
      deadline_notes TEXT NULL,
      waiting_notes TEXT NULL,
      reflection TEXT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      version INT UNSIGNED NOT NULL DEFAULT 1,
      UNIQUE KEY uq_check_in_date (local_date)
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE daily_check_in_items (
      id CHAR(36) COLLATE ascii_bin PRIMARY KEY,
      check_in_id CHAR(36) COLLATE ascii_bin NOT NULL,
      section VARCHAR(16) NOT NULL,
      task_id CHAR(36) COLLATE ascii_bin NULL,
      follow_up_id CHAR(36) COLLATE ascii_bin NULL,
      project_id CHAR(36) COLLATE ascii_bin NULL,
      snapshot JSON NOT NULL,
      sort_order INT UNSIGNED NOT NULL,
      KEY idx_check_in_items (check_in_id,section,sort_order),
      CONSTRAINT fk_check_item_check_in FOREIGN KEY (check_in_id) REFERENCES daily_check_ins(id) ON DELETE CASCADE,
      CONSTRAINT fk_check_item_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT,
      CONSTRAINT fk_check_item_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
      CONSTRAINT chk_check_item_one_ref CHECK ((task_id IS NOT NULL) + (follow_up_id IS NOT NULL) + (project_id IS NOT NULL) = 1)
    ) ENGINE=InnoDB`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE daily_check_in_items');
    await queryRunner.query('DROP TABLE daily_check_ins');
    await queryRunner.query('DROP TABLE interruptions');
    await queryRunner.query(
      'ALTER TABLE users DROP FOREIGN KEY fk_user_active_focus, DROP COLUMN focus_version, DROP COLUMN active_focus_session_id',
    );
    await queryRunner.query('DROP TABLE focus_sessions');
  }
}
