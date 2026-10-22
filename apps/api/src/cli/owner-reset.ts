import 'dotenv/config';
import { argon2id, hash } from 'argon2';
import { AppDataSource } from '../database/data-source';
import { SessionEntity } from '../database/entities/session.entity';
import { UserEntity } from '../database/entities/user.entity';
import { readPassword } from './prompt';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const password = await readPassword('New password (12+ characters)');
    if (password.length < 12 || password.length > 200)
      throw new Error('Password must be 12–200 characters.');
    await AppDataSource.transaction(async (manager) => {
      const owner = await manager
        .getRepository(UserEntity)
        .findOneByOrFail({ id: 1 });
      owner.passwordHash = await hash(password, { type: argon2id });
      owner.passwordChangedAt = new Date();
      await manager.getRepository(UserEntity).save(owner);
      await manager
        .getRepository(SessionEntity)
        .update({ userId: 1 }, { revokedAt: new Date() });
    });
    console.log('Owner password reset and all sessions revoked.');
  } finally {
    await AppDataSource.destroy();
  }
}

void main();
