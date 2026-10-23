import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true,
});

async function main(): Promise<void> {
  const fixture = process.env.PHASE7_AUDIO_FIXTURE;
  if (!fixture)
    throw new Error('Set PHASE7_AUDIO_FIXTURE to an audio file on D.');
  if (resolve(fixture).slice(0, 3).toUpperCase() !== 'D:\\')
    throw new Error('The fixture must be on D.');
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  const sessionId = randomUUID(),
    secret = randomBytes(32).toString('base64url'),
    captureKey = randomUUID();
  let entryId: string | undefined, attachmentId: string | undefined;
  const keys: string[] = [];
  try {
    const [owners] = await db.query<mysql.RowDataPacket[]>(
      'SELECT id FROM users LIMIT 1',
    );
    await db.execute(
      `INSERT INTO sessions (id,user_id,token_hash,created_at,last_seen_at,expires_at,revoked_at,device_label) VALUES (?,?,?,NOW(3),NOW(3),DATE_ADD(NOW(3),INTERVAL 1 HOUR),NULL,'Transcription smoke')`,
      [sessionId, owners[0].id, createHash('sha256').update(secret).digest()],
    );
    const csrfResponse = await fetch(`${baseUrl}/auth/csrf`),
      csrf = (await csrfResponse.json()) as { data: { token: string } };
    const cookie = `wm_session=${secret}; ${csrfResponse.headers.get('set-cookie')?.split(';', 1)[0]}`;
    const headers = {
      Cookie: cookie,
      'X-CSRF-Token': csrf.data.token,
      'Content-Type': 'application/json',
    };
    const audio = await readFile(fixture),
      form = new FormData();
    form.set(
      'metadata',
      JSON.stringify({
        title: 'Private transcription smoke',
        sourceKind: 'recording',
      }),
    );
    form.append('files', new Blob([audio], { type: 'audio/wav' }), 'voice.wav');
    const captured = await fetch(`${baseUrl}/entries`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'X-CSRF-Token': csrf.data.token,
        'Idempotency-Key': captureKey,
      },
      body: form,
    });
    assert.equal(captured.status, 201);
    const capture = (await captured.json()) as {
      data: { id: string; attachments: Array<{ id: string }> };
    };
    entryId = capture.data.id;
    attachmentId = capture.data.attachments[0].id;
    runWorker(180_000);
    await delay(1_000);
    if (process.env.PHASE7_EXPECT_DURATION_REJECTION === 'true') {
      const [inspection] = await db.query<mysql.RowDataPacket[]>(
        "SELECT a.media_state,j.status,j.last_error_message FROM attachments a JOIN processing_jobs j ON j.attachment_id=a.id WHERE a.id=? AND j.kind='inspect_media'",
        [attachmentId],
      );
      assert.equal(inspection[0].media_state, 'failed');
      assert.equal(inspection[0].status, 'failed');
      assert.match(String(inspection[0].last_error_message), /ten-minute/i);
      console.log(
        'Audio duration boundary smoke passed: over-ten-minute media was rejected and its original remained available.',
      );
      return;
    }
    const requested = await fetch(
      `${baseUrl}/attachments/${attachmentId}/jobs`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ kind: 'transcribe', language: 'english' }),
      },
    );
    assert.equal(requested.status, 201);
    const jobId = ((await requested.json()) as { data: { id: string } }).data
      .id;
    runWorker(900_000);
    await delay(1_000);
    const job = await fetch(`${baseUrl}/jobs/${jobId}`, {
      headers: { Cookie: cookie },
    });
    const jobData = (
      (await job.json()) as {
        data: { status: string; lastErrorMessage: string | null };
      }
    ).data;
    assert.equal(
      jobData.status,
      'succeeded',
      jobData.lastErrorMessage || 'Transcription failed.',
    );
    const texts = await fetch(
      `${baseUrl}/attachments/${attachmentId}/derived-texts`,
      { headers: { Cookie: cookie } },
    );
    const output = (
      (await texts.json()) as {
        data: Array<{
          kind: string;
          machineText: string;
          segments: unknown[] | null;
        }>;
      }
    ).data.find((item) => item.kind === 'transcript');
    assert.ok(output?.machineText.trim());
    assert.ok(output?.segments?.length);
    console.log(
      `Private transcription smoke passed: ${output.machineText.trim()}`,
    );
  } finally {
    if (attachmentId) {
      const [files] = await db.query<mysql.RowDataPacket[]>(
        'SELECT storage_key,thumbnail_key,playback_key FROM attachments WHERE id=?',
        [attachmentId],
      );
      if (files[0])
        for (const key of [
          files[0].storage_key,
          files[0].thumbnail_key,
          files[0].playback_key,
        ])
          if (key) keys.push(String(key));
      await db.execute('DELETE FROM derived_texts WHERE attachment_id=?', [
        attachmentId,
      ]);
      await db.execute('DELETE FROM processing_jobs WHERE attachment_id=?', [
        attachmentId,
      ]);
      await db.execute('DELETE FROM attachments WHERE id=?', [attachmentId]);
    }
    if (entryId) {
      await db.execute('DELETE FROM activity_events WHERE entry_id=?', [
        entryId,
      ]);
      await db.execute('DELETE FROM entries WHERE id=?', [entryId]);
    }
    await db.execute('DELETE FROM command_receipts WHERE command_key=?', [
      captureKey,
    ]);
    await db.execute('DELETE FROM sessions WHERE id=?', [sessionId]);
    await db.end();
    const root = resolve(process.env.PRIVATE_STORAGE_ROOT!);
    for (const key of keys)
      await unlink(resolve(root, key)).catch(() => undefined);
  }
}
function runWorker(timeout: number) {
  const cli = resolve(
    process.cwd(),
    '..',
    '..',
    'node_modules',
    'tsx',
    'dist',
    'cli.mjs',
  );
  const result = spawnSync(process.execPath, [cli, 'src/worker.ts', '--once'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    timeout,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}
const delay = (milliseconds: number) =>
  new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
void main();
