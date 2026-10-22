import { argon2id, hash } from 'argon2';
import { UserEntity } from '../database/entities/user.entity';
import { AppDataSource } from '../database/data-source';
import { readAnswer, readPassword } from './prompt';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const users = AppDataSource.getRepository(UserEntity);
    if (await users.exists({ where: { id: 1 } }))
      throw new Error(
        'The WoKim owner already exists. Use owner:reset to recover access.',
      );

    const email = (await readAnswer('Owner email')).toLowerCase();
    const displayName = await readAnswer('Display name');
    const timezone = await readAnswer('Timezone', 'UTC');
    const password = await readPassword('Password (12+ characters)');
    if (!/^\S+@\S+\.\S+$/.test(email))
      throw new Error('Enter a valid email address.');
    if (!displayName || displayName.length > 120)
      throw new Error(
        'Display name is required and must be 120 characters or fewer.',
      );
    if (password.length < 12 || password.length > 200)
      throw new Error('Password must be 12–200 characters.');
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format();

    await users.insert({
      id: 1,
      email,
      displayName,
      timezone,
      passwordHash: await hash(password, { type: argon2id }),
      passwordChangedAt: new Date(),
    });
    console.log('WoKim owner created.');
  } finally {
    await AppDataSource.destroy();
  }
}

void main();
