/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { strict as assert } from 'node:assert';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

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
    secret = randomBytes(32).toString('base64url');
  const captureKey = randomUUID(),
    conversionKey = randomUUID();
  let projectId: string | undefined,
    personId: string | undefined,
    entryId: string | undefined,
    taskId: string | undefined,
    followUpId: string | undefined,
    setId: string | undefined;
  const storageKeys: string[] = [];
  try {
    const [owners] = await db.query<mysql.RowDataPacket[]>(
      'SELECT id FROM users LIMIT 1',
    );
    await db.execute(
      `INSERT INTO sessions (id,user_id,token_hash,created_at,last_seen_at,expires_at,revoked_at,device_label) VALUES (?,?,?,NOW(3),NOW(3),DATE_ADD(NOW(3),INTERVAL 1 HOUR),NULL,'Phase 5 e2e')`,
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
    const post = (path: string, body: object) =>
      fetch(`${baseUrl}/${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    const project = await post('projects', {
      name: 'Fictional evidence project',
    });
    projectId = ((await project.json()) as { data: { id: string } }).data.id;
    const person = await post('people', { displayName: 'Fictional responder' });
    personId = ((await person.json()) as { data: { id: string } }).data.id;
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const form = new FormData();
    form.set(
      'metadata',
      JSON.stringify({
        title: 'Evidence source',
        contentText: 'Two fictional screenshots',
        projectId,
      }),
    );
    form.append('files', new Blob([png], { type: 'image/png' }), 'before.png');
    form.append('files', new Blob([png], { type: 'image/png' }), 'after.png');
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
    const captureBody = (await captured.json()) as {
      data: { id: string; version: number; attachments: Array<{ id: string }> };
    };
    entryId = captureBody.data.id;
    const converted = await fetch(
      `${baseUrl}/entries/${entryId}/convert-to-task`,
      {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': conversionKey },
        body: JSON.stringify({
          projectId,
          title: 'Evidence task',
          type: 'testing',
          expectedEntryVersion: captureBody.data.version,
        }),
      },
    );
    assert.equal(converted.status, 201);
    taskId = ((await converted.json()) as { data: { id: string } }).data.id;
    const follow = await post('follow-ups', {
      projectId,
      taskId,
      personId,
      sourceEntryId: entryId,
      question: 'Did the fictional UI improve?',
      followUpOn: '2026-10-30',
    });
    assert.equal(follow.status, 201);
    const followBody = (await follow.json()) as {
      data: { id: string; version: number };
    };
    followUpId = followBody.data.id;
    const resolved = await fetch(`${baseUrl}/follow-ups/${followUpId}`, {
      method: 'PATCH',
      headers: { ...headers, 'If-Match': `"${followBody.data.version}"` },
      body: JSON.stringify({ status: 'answered', resolution: 'Yes' }),
    });
    assert.equal(resolved.status, 200);
    const taskAfterResolution = await fetch(`${baseUrl}/tasks/${taskId}`, {
      headers: { Cookie: cookie },
    });
    assert.equal(
      ((await taskAfterResolution.json()) as { data: { status: string } }).data
        .status,
      'ready',
    );
    const set = await post('evidence-sets', {
      taskId,
      title: 'Fictional before and after',
    });
    assert.equal(set.status, 201);
    let setBody = (await set.json()) as {
      data: { id: string; version: number; items: unknown[] };
    };
    setId = setBody.data.id;
    for (const [index, side] of ['before', 'after'].entries()) {
      const added = await fetch(`${baseUrl}/evidence-sets/${setId}/items`, {
        method: 'POST',
        headers: { ...headers, 'If-Match': `"${setBody.data.version}"` },
        body: JSON.stringify({
          attachmentId: captureBody.data.attachments[index].id,
          side,
          caption: `Fictional ${side}`,
        }),
      });
      assert.equal(added.status, 201);
      setBody = (await added.json()) as typeof setBody;
    }
    assert.equal(setBody.data.items.length, 2);
    const [files] = await db.query<mysql.RowDataPacket[]>(
      'SELECT storage_key FROM attachments WHERE entry_id=?',
      [entryId],
    );
    storageKeys.push(...files.map((file) => String(file.storage_key)));
    assert.equal(files.length, 2);
    await fetch(`${baseUrl}/evidence-sets/${setId}`, {
      method: 'DELETE',
      headers: { ...headers, 'If-Match': `"${setBody.data.version}"` },
    });
    const [filesAfterSetDelete] = await db.query<mysql.RowDataPacket[]>(
      'SELECT id FROM attachments WHERE entry_id=?',
      [entryId],
    );
    assert.equal(
      filesAfterSetDelete.length,
      2,
      'Deleting an evidence set must retain source attachments.',
    );
    setId = undefined;
    console.log(
      'Phase 5 e2e passed: linked follow-up resolution leaves task ready, evidence compares two task images, and set deletion retains originals.',
    );
  } finally {
    if (setId) {
      await db.execute('DELETE FROM evidence_items WHERE evidence_set_id=?', [
        setId,
      ]);
      await db.execute('DELETE FROM evidence_sets WHERE id=?', [setId]);
    }
    if (followUpId)
      await db.execute('DELETE FROM follow_ups WHERE id=?', [followUpId]);
    await db.execute(
      'DELETE FROM command_receipts WHERE command_key IN (?,?)',
      [captureKey, conversionKey],
    );
    if (entryId) {
      await db.execute('UPDATE entries SET task_id=NULL WHERE id=?', [entryId]);
      if (taskId)
        await db.execute('UPDATE tasks SET source_entry_id=NULL WHERE id=?', [
          taskId,
        ]);
      await db.execute(
        'DELETE FROM activity_events WHERE entry_id=? OR task_id=?',
        [entryId, taskId],
      );
      if (taskId) await db.execute('DELETE FROM tasks WHERE id=?', [taskId]);
      await db.execute(
        'DELETE FROM processing_jobs WHERE attachment_id IN (SELECT id FROM attachments WHERE entry_id=?)',
        [entryId],
      );
      await db.execute('DELETE FROM attachments WHERE entry_id=?', [entryId]);
      await db.execute('DELETE FROM entries WHERE id=?', [entryId]);
    }
    if (personId) await db.execute('DELETE FROM people WHERE id=?', [personId]);
    if (projectId)
      await db.execute('DELETE FROM projects WHERE id=?', [projectId]);
    await db.execute('DELETE FROM sessions WHERE id=?', [sessionId]);
    await db.end();
    const root = resolve(
      process.env.PRIVATE_STORAGE_ROOT ?? './storage/private',
    );
    await Promise.all(
      storageKeys.map((key) =>
        unlink(resolve(root, key)).catch(() => undefined),
      ),
    );
  }
}
void main();
