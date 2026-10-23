import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PhaseThreeTasksAndRequirements1792681000000 implements MigrationInterface {
  name = 'PhaseThreeTasksAndRequirements1792681000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE tasks (
      id CHAR(36) COLLATE ascii_bin NOT NULL, project_id CHAR(36) COLLATE ascii_bin NOT NULL, title VARCHAR(240) NOT NULL,
      description MEDIUMTEXT NULL, type VARCHAR(24) NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'ready',
      priority VARCHAR(8) NOT NULL DEFAULT 'normal', requested_by_person_id CHAR(36) COLLATE ascii_bin NULL,
      source_entry_id CHAR(36) COLLATE ascii_bin NULL, next_action TEXT NULL, branch_name VARCHAR(240) NULL, links JSON NULL,
      deadline_kind VARCHAR(8) NULL, due_date DATE NULL, due_at DATETIME(3) NULL, due_timezone VARCHAR(64) NULL,
      completed_at DATETIME(3) NULL, trashed_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      version INT UNSIGNED NOT NULL DEFAULT 1,
      PRIMARY KEY (id), UNIQUE KEY uq_tasks_source_entry (source_entry_id),
      INDEX idx_tasks_project_status (project_id,status,updated_at,id),
      INDEX idx_tasks_due_date (status,due_date,id), INDEX idx_tasks_due_at (status,due_at,id),
      INDEX idx_tasks_requester (requested_by_person_id,status), INDEX idx_tasks_trash (trashed_at),
      FULLTEXT KEY ft_tasks_text (title,description,next_action),
      CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
      CONSTRAINT fk_tasks_requester FOREIGN KEY (requested_by_person_id) REFERENCES people(id) ON DELETE RESTRICT,
      CONSTRAINT fk_tasks_source_entry FOREIGN KEY (source_entry_id) REFERENCES entries(id) ON DELETE RESTRICT,
      CONSTRAINT ck_tasks_deadline CHECK (
        NOT (due_date IS NOT NULL AND due_at IS NOT NULL) AND
        (due_at IS NULL OR due_timezone IS NOT NULL) AND
        (deadline_kind IS NOT NULL OR (due_date IS NULL AND due_at IS NULL AND due_timezone IS NULL))
      )
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(
      'ALTER TABLE entries ADD task_id CHAR(36) COLLATE ascii_bin NULL AFTER project_id, ADD INDEX idx_entries_task (task_id,created_at,id), ADD CONSTRAINT fk_entries_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT',
    );
    await queryRunner.query(`CREATE TABLE entry_supersessions (
      older_entry_id CHAR(36) COLLATE ascii_bin NOT NULL, newer_entry_id CHAR(36) COLLATE ascii_bin NOT NULL, reason TEXT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (older_entry_id), INDEX idx_supersessions_newer (newer_entry_id),
      CONSTRAINT fk_supersessions_older FOREIGN KEY (older_entry_id) REFERENCES entries(id) ON DELETE RESTRICT,
      CONSTRAINT fk_supersessions_newer FOREIGN KEY (newer_entry_id) REFERENCES entries(id) ON DELETE RESTRICT,
      CONSTRAINT ck_supersessions_distinct CHECK (older_entry_id <> newer_entry_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(
      'ALTER TABLE activity_events ADD task_id CHAR(36) COLLATE ascii_bin NULL AFTER project_id, ADD INDEX idx_activity_task (task_id,created_at,id), ADD CONSTRAINT fk_activity_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE activity_events DROP FOREIGN KEY fk_activity_task, DROP INDEX idx_activity_task, DROP COLUMN task_id',
    );
    await queryRunner.dropTable('entry_supersessions');
    await queryRunner.query(
      'ALTER TABLE entries DROP FOREIGN KEY fk_entries_task, DROP INDEX idx_entries_task, DROP COLUMN task_id',
    );
    await queryRunner.dropTable('tasks');
  }
}
