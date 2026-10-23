import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PhaseTwoCaptureAndOrganization1792669000000 implements MigrationInterface {
  name = 'PhaseTwoCaptureAndOrganization1792669000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE people (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, display_name VARCHAR(120) NOT NULL,
      email VARCHAR(254) NULL, handle VARCHAR(120) NULL, notes TEXT NULL, archived_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      version INT UNSIGNED NOT NULL DEFAULT 1, PRIMARY KEY (id), INDEX idx_people_archived (archived_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE teams (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, name VARCHAR(120) NOT NULL, notes TEXT NULL, archived_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      version INT UNSIGNED NOT NULL DEFAULT 1, PRIMARY KEY (id), INDEX idx_teams_archived (archived_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE projects (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, name VARCHAR(180) NOT NULL, description TEXT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'active', target_date DATE NULL, repository_url VARCHAR(2048) NULL, archived_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      version INT UNSIGNED NOT NULL DEFAULT 1, PRIMARY KEY (id), INDEX idx_projects_status (status, updated_at, id),
      CONSTRAINT chk_project_status CHECK (status IN ('active','completed','archived'))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE person_teams (
      person_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, team_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      role_label VARCHAR(120) NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (person_id, team_id), INDEX idx_person_teams_team (team_id, person_id),
      CONSTRAINT fk_person_teams_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
      CONSTRAINT fk_person_teams_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE project_people (
      project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, person_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      role_label VARCHAR(120) NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (project_id, person_id), INDEX idx_project_people_person (person_id, project_id),
      CONSTRAINT fk_project_people_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_project_people_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE project_teams (
      project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, team_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (project_id, team_id), INDEX idx_project_teams_team (team_id, project_id),
      CONSTRAINT fk_project_teams_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_project_teams_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE entries (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
      title VARCHAR(240) NULL, entry_type VARCHAR(24) NOT NULL DEFAULT 'note', inbox_state VARCHAR(16) NOT NULL DEFAULT 'unprocessed', source_kind VARCHAR(24) NOT NULL,
      original_text MEDIUMTEXT NULL, content_text MEDIUMTEXT NULL, source_url VARCHAR(2048) NULL, source_label VARCHAR(240) NULL,
      sender_person_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL, occurred_at DATETIME(3) NULL, occurred_timezone VARCHAR(64) NULL, trashed_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), version INT UNSIGNED NOT NULL DEFAULT 1,
      PRIMARY KEY (id), INDEX idx_entries_inbox (inbox_state, created_at, id), INDEX idx_entries_project (project_id, occurred_at, created_at, id), INDEX idx_entries_sender (sender_person_id, created_at), INDEX idx_entries_trash (trashed_at),
      FULLTEXT INDEX ft_entries_text (title, content_text, original_text),
      CONSTRAINT fk_entries_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
      CONSTRAINT fk_entries_sender FOREIGN KEY (sender_person_id) REFERENCES people(id) ON DELETE RESTRICT,
      CONSTRAINT chk_entry_type CHECK (entry_type IN ('note','instruction','decision','question','work_update','checkpoint','reference')),
      CONSTRAINT chk_inbox_state CHECK (inbox_state IN ('unprocessed','organized','dismissed')),
      CONSTRAINT chk_source_kind CHECK (source_kind IN ('typed','pasted','upload','recording'))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE entry_revisions (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, entry_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      revision_no INT UNSIGNED NOT NULL, title VARCHAR(240) NULL, content_text MEDIUMTEXT NULL, change_reason VARCHAR(240) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (id), UNIQUE KEY uq_entry_revision (entry_id, revision_no),
      CONSTRAINT fk_entry_revisions_entry FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE attachments (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, entry_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      original_name VARCHAR(255) NOT NULL, storage_key VARCHAR(512) NOT NULL, mime_type VARCHAR(120) NOT NULL, byte_size BIGINT UNSIGNED NOT NULL,
      sha256 BINARY(32) NOT NULL, purpose VARCHAR(24) NOT NULL DEFAULT 'reference', caption TEXT NULL, media_state VARCHAR(16) NOT NULL DEFAULT 'ready',
      ocr_enabled BOOLEAN NOT NULL DEFAULT false, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), trashed_at DATETIME(3) NULL,
      PRIMARY KEY (id), UNIQUE KEY uq_attachments_storage_key (storage_key), INDEX idx_attachments_entry (entry_id, created_at, id), INDEX idx_attachments_trash (trashed_at),
      CONSTRAINT fk_attachments_entry FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE activity_events (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, event_type VARCHAR(64) NOT NULL,
      project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL, entry_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
      payload JSON NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (id),
      INDEX idx_activity_project (project_id, created_at, id), INDEX idx_activity_entry (entry_id, created_at, id),
      CONSTRAINT fk_activity_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
      CONSTRAINT fk_activity_entry FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE processing_jobs (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, kind VARCHAR(24) NOT NULL, attachment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'queued', input JSON NOT NULL, result JSON NULL, attempts INT UNSIGNED NOT NULL DEFAULT 0, max_attempts INT UNSIGNED NOT NULL DEFAULT 3,
      available_at DATETIME(3) NOT NULL, lease_token CHAR(36) NULL, lease_expires_at DATETIME(3) NULL, last_error_code VARCHAR(64) NULL, last_error_message VARCHAR(500) NULL,
      dedupe_key VARCHAR(191) NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), version INT UNSIGNED NOT NULL DEFAULT 1,
      PRIMARY KEY (id), INDEX idx_jobs_claim (status, available_at, id), INDEX idx_jobs_lease (lease_expires_at),
      CONSTRAINT fk_jobs_attachment FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE command_receipts (
      command_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, operation VARCHAR(80) NOT NULL, request_hash BINARY(32) NOT NULL,
      result_status SMALLINT UNSIGNED NOT NULL, result JSON NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), expires_at DATETIME(3) NOT NULL,
      PRIMARY KEY (command_key), INDEX idx_receipts_expiry (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'command_receipts',
      'processing_jobs',
      'activity_events',
      'attachments',
      'entry_revisions',
      'entries',
      'project_teams',
      'project_people',
      'person_teams',
      'projects',
      'teams',
      'people',
    ]) {
      await queryRunner.query(`DROP TABLE ${table}`);
    }
  }
}
