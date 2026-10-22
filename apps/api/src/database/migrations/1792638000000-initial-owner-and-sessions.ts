import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialOwnerAndSessions1792638000000 implements MigrationInterface {
  name = 'InitialOwnerAndSessions1792638000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id TINYINT UNSIGNED NOT NULL,
        email VARCHAR(254) NOT NULL,
        display_name VARCHAR(120) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
        password_changed_at DATETIME(3) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        version INT UNSIGNED NOT NULL DEFAULT 1,
        CONSTRAINT pk_users PRIMARY KEY (id),
        CONSTRAINT uq_users_email UNIQUE (email),
        CONSTRAINT chk_single_owner CHECK (id = 1)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE sessions (
        id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        user_id TINYINT UNSIGNED NOT NULL,
        token_hash BINARY(32) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        last_seen_at DATETIME(3) NOT NULL,
        expires_at DATETIME(3) NOT NULL,
        revoked_at DATETIME(3) NULL,
        device_label VARCHAR(180) NULL,
        CONSTRAINT pk_sessions PRIMARY KEY (id),
        CONSTRAINT uq_sessions_token_hash UNIQUE (token_hash),
        CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_sessions_user (user_id),
        INDEX idx_sessions_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE sessions');
    await queryRunner.query('DROP TABLE users');
  }
}
