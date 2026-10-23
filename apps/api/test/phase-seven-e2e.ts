import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';
import sharp from 'sharp';

config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true,
});

async function main(): Promise<void> {
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
  const reviewMarker = `ReviewedOCR${randomBytes(4).toString('hex')}`;
  let entryId: string | undefined,
    attachmentId: string | undefined,
    storageKey: string | undefined,
    thumbnailKey: string | undefined,
    expiredJobId: string | undefined,
    failedJobId: string | undefined;
  try {
    const [owners] = await db.query<mysql.RowDataPacket[]>(
      'SELECT id FROM users LIMIT 1',
    );
    await db.execute(
      `INSERT INTO sessions (id,user_id,token_hash,created_at,last_seen_at,expires_at,revoked_at,device_label) VALUES (?,?,?,NOW(3),NOW(3),DATE_ADD(NOW(3),INTERVAL 1 HOUR),NULL,'Phase 7 e2e')`,
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
    const png = await sharp({
      create: { width: 1200, height: 320, channels: 3, background: 'white' },
    })
      .composite([
        {
          input: Buffer.from(
            '<svg width="1200" height="320"><text x="45" y="190" font-family="Arial" font-size="110" fill="black">WOKIM PRIVATE MEMORY</text></svg>',
          ),
        },
      ])
      .png()
      .toBuffer();
    const form = new FormData();
    form.set('metadata', JSON.stringify({ title: 'OCR test image' }));
    form.append(
      'files',
      new Blob([png], { type: 'image/png' }),
      'ocr-sample.png',
    );
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
      data: { id: string; version: number; attachments: Array<{ id: string }> };
    };
    entryId = capture.data.id;
    attachmentId = capture.data.attachments[0].id;
    const [files] = await db.query<mysql.RowDataPacket[]>(
      'SELECT storage_key FROM attachments WHERE id=?',
      [attachmentId],
    );
    storageKey = String(files[0].storage_key);
    runWorker();
    await delay(1_000);
    const requested = await fetch(
      `${baseUrl}/attachments/${attachmentId}/jobs`,
      { method: 'POST', headers, body: JSON.stringify({ kind: 'ocr' }) },
    );
    assert.equal(requested.status, 201);
    const job = (await requested.json()) as { data: { id: string } };
    const duplicate = await fetch(
      `${baseUrl}/attachments/${attachmentId}/jobs`,
      { method: 'POST', headers, body: JSON.stringify({ kind: 'ocr' }) },
    );
    assert.equal(
      ((await duplicate.json()) as { data: { id: string } }).data.id,
      job.data.id,
    );
    runWorker();
    await delay(1_000);
    const jobView = await fetch(`${baseUrl}/jobs/${job.data.id}`, {
      headers: { Cookie: cookie },
    });
    assert.equal(
      ((await jobView.json()) as { data: { status: string } }).data.status,
      'succeeded',
    );
    const textsResponse = await fetch(
      `${baseUrl}/attachments/${attachmentId}/derived-texts`,
      { headers: { Cookie: cookie } },
    );
    const texts = (await textsResponse.json()) as {
      data: Array<{ id: string; machineText: string; version: number }>;
    };
    assert.match(texts.data[0].machineText, /WOKIM/i);
    const reviewed = await fetch(
      `${baseUrl}/derived-texts/${texts.data[0].id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          expectedVersion: texts.data[0].version,
          text: reviewMarker,
        }),
      },
    );
    assert.equal(reviewed.status, 200);
    const search = await fetch(`${baseUrl}/search?q=${reviewMarker}`, {
      headers: { Cookie: cookie },
    });
    const hits = (await search.json()) as {
      data: Array<{ id: string; kind: string }>;
    };
    assert.ok(
      hits.data.some((hit) => hit.id === entryId && hit.kind === 'derived'),
    );
    const wrongKind = await fetch(
      `${baseUrl}/attachments/${attachmentId}/jobs`,
      { method: 'POST', headers, body: JSON.stringify({ kind: 'transcribe' }) },
    );
    assert.equal(wrongKind.status, 400);
    failedJobId = randomUUID();
    await db.execute(
      "INSERT INTO processing_jobs (id,kind,attachment_id,status,input,result,attempts,max_attempts,available_at,lease_token,lease_expires_at,last_error_code,last_error_message,dedupe_key) VALUES (?,'ocr',?,'failed','{}',NULL,3,3,NOW(3),NULL,NULL,'OCR_FAILED','fixture failure',?)",
      [failedJobId, attachmentId, `retry:${failedJobId}`],
    );
    const retried = await fetch(`${baseUrl}/jobs/${failedJobId}/retry`, {
      method: 'POST',
      headers,
    });
    assert.equal(retried.status, 202);
    const retryJob = (await retried.json()) as {
      data: { id: string; status: string };
    };
    assert.notEqual(retryJob.data.id, failedJobId);
    assert.equal(retryJob.data.status, 'queued');
    const queued = await fetch(`${baseUrl}/attachments/${attachmentId}/jobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ kind: 'ocr' }),
    });
    const queuedId = ((await queued.json()) as { data: { id: string } }).data
      .id;
    const trashed = await fetch(`${baseUrl}/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: { ...headers, 'If-Match': `"${capture.data.version}"` },
    });
    assert.equal(trashed.status, 200);
    const [cancelled] = await db.query<mysql.RowDataPacket[]>(
      'SELECT status FROM processing_jobs WHERE id=?',
      [queuedId],
    );
    assert.equal(cancelled[0].status, 'cancelled');
    expiredJobId = randomUUID();
    await db.execute(
      "INSERT INTO processing_jobs (id,kind,attachment_id,status,input,result,attempts,max_attempts,available_at,lease_token,lease_expires_at,last_error_code,last_error_message,dedupe_key) VALUES (?,'ocr',NULL,'running','{}',NULL,3,3,NOW(3),?,DATE_SUB(NOW(3),INTERVAL 1 SECOND),NULL,NULL,?)",
      [expiredJobId, randomUUID(), `expired:${expiredJobId}`],
    );
    runWorker();
    const [expired] = await db.query<mysql.RowDataPacket[]>(
      'SELECT status,last_error_code FROM processing_jobs WHERE id=?',
      [expiredJobId],
    );
    assert.equal(expired[0].status, 'failed');
    assert.equal(expired[0].last_error_code, 'LEASE_EXPIRED');
    console.log(
      'Phase 7 OCR e2e passed: local extraction, active-job dedupe, failed-job retry, review, derived search, type validation, expired lease handling, and purge-during-processing cancellation.',
    );
  } finally {
    if (attachmentId) {
      const [files] = await db.query<mysql.RowDataPacket[]>(
        'SELECT storage_key,thumbnail_key FROM attachments WHERE id=?',
        [attachmentId],
      );
      if (files[0]) {
        storageKey ||= String(files[0].storage_key);
        thumbnailKey = files[0].thumbnail_key
          ? String(files[0].thumbnail_key)
          : undefined;
      }
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
    if (expiredJobId)
      await db.execute('DELETE FROM processing_jobs WHERE id=?', [
        expiredJobId,
      ]);
    if (failedJobId)
      await db.execute('DELETE FROM processing_jobs WHERE id=?', [failedJobId]);
    await db.execute('DELETE FROM command_receipts WHERE command_key=?', [
      captureKey,
    ]);
    await db.execute('DELETE FROM sessions WHERE id=?', [sessionId]);
    await db.end();
    const root = resolve(process.env.PRIVATE_STORAGE_ROOT!);
    if (storageKey)
      await unlink(resolve(root, storageKey)).catch(() => undefined);
    if (thumbnailKey)
      await unlink(resolve(root, thumbnailKey)).catch(() => undefined);
  }
}
function runWorker() {
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
    timeout: 180_000,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}
const delay = (milliseconds: number) =>
  new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
void main();
