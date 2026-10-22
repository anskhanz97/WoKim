import 'dotenv/config';
import { DataSource } from 'typeorm';
import { environment } from '../config/environment';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from './entities/user.entity';
import { InitialOwnerAndSessions1792638000000 } from './migrations/1792638000000-initial-owner-and-sessions';

const env = environment();

export const AppDataSource = new DataSource({
  type: env.database.type,
  host: env.database.host,
  port: env.database.port,
  username: env.database.user,
  password: env.database.password,
  database: env.database.name,
  ssl: env.database.ssl ? { rejectUnauthorized: true } : undefined,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: ['DATE'],
  synchronize: false,
  migrationsRun: false,
  entities: [UserEntity, SessionEntity],
  migrations: [InitialOwnerAndSessions1792638000000],
});
