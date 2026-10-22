import { strict as assert } from 'node:assert';

async function main(): Promise<void> {
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';
  const live = await fetch(`${baseUrl}/health/live`);
  assert.equal(live.status, 200);
  assert.deepEqual(await live.json(), { data: { status: 'live' } });

  const anonymous = await fetch(`${baseUrl}/me`);
  assert.equal(anonymous.status, 401);
  const error = (await anonymous.json()) as { error: { code: string } };
  assert.equal(error.error.code, 'AUTH_REQUIRED');
  console.log('Phase 1 API e2e smoke passed against the running stack.');
}

void main();
