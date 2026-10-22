export type DatabaseType = 'mysql' | 'mariadb';

const integer = (name: string, fallback: number): number => {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
};

export const environment = () => {
  const configuredDatabaseType = process.env.DB_TYPE ?? 'mysql';
  if (
    configuredDatabaseType !== 'mysql' &&
    configuredDatabaseType !== 'mariadb'
  ) {
    throw new Error('DB_TYPE must be mysql or mariadb');
  }
  const databaseType: DatabaseType = configuredDatabaseType;

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const sessionSecret = process.env.SESSION_SECRET ?? '';
  const csrfSecret = process.env.CSRF_SECRET ?? '';
  if (
    nodeEnv === 'production' &&
    (sessionSecret.length < 32 || csrfSecret.length < 32)
  ) {
    throw new Error(
      'SESSION_SECRET and CSRF_SECRET must be at least 32 characters in production',
    );
  }

  return {
    nodeEnv,
    port: integer('PORT', 3000),
    host: process.env.HOST ?? '127.0.0.1',
    publicOrigin: process.env.PUBLIC_ORIGIN ?? 'http://localhost:4200',
    database: {
      type: databaseType,
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: integer('DB_PORT', 3306),
      name: process.env.DB_NAME ?? 'wokim',
      user: process.env.DB_USER ?? 'wokim',
      password: process.env.DB_PASSWORD ?? '',
      ssl: process.env.DB_SSL === 'true',
    },
    auth: {
      sessionSecret: sessionSecret || 'development-session-secret-change-me',
      csrfSecret: csrfSecret || 'development-csrf-secret-change-me',
      idleDays: integer('SESSION_IDLE_DAYS', 7),
      absoluteDays: integer('SESSION_ABSOLUTE_DAYS', 30),
    },
    storageRoot: process.env.PRIVATE_STORAGE_ROOT ?? './storage/private',
  };
};

export type Environment = ReturnType<typeof environment>;
