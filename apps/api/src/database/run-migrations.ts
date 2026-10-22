import { AppDataSource } from './data-source';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const completed = await AppDataSource.runMigrations({ transaction: 'all' });
    console.log(
      completed.length
        ? `Applied ${completed.length} migration(s).`
        : 'Database is current.',
    );
  } finally {
    await AppDataSource.destroy();
  }
}

void main();
