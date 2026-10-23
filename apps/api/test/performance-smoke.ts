import { strict as assert } from 'node:assert';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true,
});

async function main(): Promise<void> {
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';
  const database = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  const sessionId = randomUUID(),
    secret = randomBytes(32).toString('base64url'),
    projectId = randomUUID();
  const marker = `PerfNeedle${randomBytes(6).toString('hex')}`;
  const captureKeys: string[] = [],
    entryIds: string[] = [];
  try {
    const [owners] = await database.query<mysql.RowDataPacket[]>(
      'SELECT id FROM users LIMIT 1',
    );
    await database.execute(
      `INSERT INTO sessions (id,user_id,token_hash,created_at,last_seen_at,expires_at,revoked_at,device_label) VALUES (?,?,?,NOW(3),NOW(3),DATE_ADD(NOW(3),INTERVAL 1 HOUR),NULL,'Performance smoke')`,
      [sessionId, owners[0].id, createHash('sha256').update(secret).digest()],
    );
    await database.execute(
      "INSERT INTO projects (id,name,description,status) VALUES (?,?,'Synthetic performance fixture','active')",
      [projectId, `Performance ${marker}`],
    );
    const csrfResponse = await fetch(`${baseUrl}/auth/csrf`),
      csrf = (await csrfResponse.json()) as { data: { token: string } };
    const cookie = `wm_session=${secret}; ${csrfResponse.headers.get('set-cookie')?.split(';', 1)[0]}`;
    const readHeaders = { Cookie: cookie };
    const captureTimes = await sample(
      20,
      async () => {
        const key = randomUUID();
        captureKeys.push(key);
        const form = new FormData();
        form.set(
          'metadata',
          JSON.stringify({
            contentText: `Synthetic capture ${key}`,
            projectId,
          }),
        );
        const started = performance.now();
        const response = await fetch(`${baseUrl}/entries`, {
          method: 'POST',
          headers: {
            Cookie: cookie,
            'X-CSRF-Token': csrf.data.token,
            'Idempotency-Key': key,
          },
          body: form,
        });
        const elapsed = performance.now() - started;
        assert.equal(response.status, 201);
        entryIds.push(
          ((await response.json()) as { data: { id: string } }).data.id,
        );
        return elapsed;
      },
      true,
    );
    await database.beginTransaction();
    for (let offset = 0; offset < 20_000; offset += 500) {
      const values: unknown[] = [];
      const rows: string[] = [];
      for (let index = offset; index < offset + 500; index += 1) {
        rows.push('(?,?,?,?,?,?,?)');
        values.push(
          randomUUID(),
          projectId,
          index === 12_345 ? marker : `Synthetic task ${index}`,
          `Bounded fictional description ${index}`,
          'testing',
          index % 7 === 0 ? 'waiting' : 'ready',
          'normal',
        );
      }
      await database.query(
        `INSERT INTO tasks (id,project_id,title,description,type,status,priority) VALUES ${rows.join(',')}`,
        values,
      );
    }
    await database.commit();
    const todayTimes = await sample(30, async () => {
      const response = await fetch(`${baseUrl}/today`, {
        headers: readHeaders,
      });
      assert.equal(response.status, 200);
      await response.arrayBuffer();
    });
    const searchTimes = await sample(30, async () => {
      const response = await fetch(
        `${baseUrl}/search?q=${marker}&projectId=${projectId}`,
        { headers: readHeaders },
      );
      assert.equal(response.status, 200);
      const body = (await response.json()) as {
        data: Array<{ title: string }>;
      };
      assert.ok(body.data.some((item) => item.title === marker));
    });
    const metrics = {
      todayP95Ms: p95(todayTimes),
      searchP95Ms: p95(searchTimes),
      textCaptureP95Ms: p95(captureTimes),
    };
    assert.ok(metrics.todayP95Ms <= 500, JSON.stringify(metrics));
    assert.ok(metrics.searchP95Ms <= 1_000, JSON.stringify(metrics));
    assert.ok(metrics.textCaptureP95Ms <= 1_000, JSON.stringify(metrics));
    console.log(
      `Performance smoke passed on 20,000 synthetic tasks: ${JSON.stringify(metrics)}.`,
    );
  } finally {
    if (entryIds.length) {
      await database.query(
        `DELETE FROM activity_events WHERE entry_id IN (${entryIds.map(() => '?').join(',')})`,
        entryIds,
      );
      await database.query(
        `DELETE FROM entries WHERE id IN (${entryIds.map(() => '?').join(',')})`,
        entryIds,
      );
    }
    if (captureKeys.length)
      await database.query(
        `DELETE FROM command_receipts WHERE command_key IN (${captureKeys.map(() => '?').join(',')})`,
        captureKeys,
      );
    await database.execute('DELETE FROM tasks WHERE project_id=?', [projectId]);
    await database.execute('DELETE FROM projects WHERE id=?', [projectId]);
    await database.execute('DELETE FROM sessions WHERE id=?', [sessionId]);
    await database.end();
  }
}

async function sample(
  count: number,
  operation: () => Promise<void | number>,
  alreadyMeasured = false,
) {
  const times: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const started = performance.now(),
      measured = await operation();
    times.push(
      alreadyMeasured && typeof measured === 'number'
        ? measured
        : performance.now() - started,
    );
  }
  return times;
}
function p95(values: number[]) {
  return (
    Math.round(
      [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1] *
        10,
    ) / 10
  );
}
void main();
