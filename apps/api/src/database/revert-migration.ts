import { AppDataSource } from './data-source';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  try {
    await AppDataSource.undoLastMigration({ transaction: 'all' });
    console.log('Reverted the latest migration.');
  } finally {
    await AppDataSource.destroy();
  }
}

void main();
