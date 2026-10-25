import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RememberedSessions1792730000000 implements MigrationInterface {
  name = 'RememberedSessions1792730000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE sessions ADD remember_me BOOLEAN NOT NULL DEFAULT FALSE AFTER device_label',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE sessions DROP COLUMN remember_me');
  }
}
