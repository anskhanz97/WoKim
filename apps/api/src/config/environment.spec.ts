import { environment } from './environment';

describe('environment', () => {
  const original = process.env;
  afterEach(() => {
    process.env = original;
  });

  it('rejects an unsupported database type', () => {
    process.env = { ...original, DB_TYPE: 'sqlite' };
    expect(() => environment()).toThrow('DB_TYPE must be mysql or mariadb');
  });

  it('requires production auth secrets', () => {
    process.env = {
      ...original,
      NODE_ENV: 'production',
      SESSION_SECRET: 'short',
      CSRF_SECRET: 'short',
    };
    expect(() => environment()).toThrow('must be at least 32 characters');
  });
});
