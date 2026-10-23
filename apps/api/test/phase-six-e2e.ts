import { strict as assert } from 'node:assert';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { access, unlink } from 'node:fs/promises';
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
    secret = randomBytes(32).toString('base64url'),
    captureKey = randomUUID();
  const marker = `FictionalRecall${randomBytes(5).toString('hex')}`;
  let projectId: string | undefined,
    taskId: string | undefined,
    entryId: string | undefined,
    exportId: string | undefined,
    storageKey: string | undefined,
    exportKey: string | undefined;
  try {
    const [owners] = await db.query<mysql.RowDataPacket[]>(
      'SELECT id FROM users LIMIT 1',
    );
    await db.execute(
      `INSERT INTO sessions (id,user_id,token_hash,created_at,last_seen_at,expires_at,revoked_at,device_label) VALUES (?,?,?,NOW(3),NOW(3),DATE_ADD(NOW(3),INTERVAL 1 HOUR),NULL,'Phase 6 e2e')`,
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
    const project = await post('projects', { name: `${marker} project` });
    projectId = ((await project.json()) as { data: { id: string } }).data.id;
    const task = await post('tasks', {
      projectId,
      title: `${marker} task`,
      type: 'testing',
    });
    const taskBody = (await task.json()) as {
      data: { id: string; version: number };
    };
    taskId = taskBody.data.id;
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const form = new FormData();
    form.set(
      'metadata',
      JSON.stringify({
        title: `${marker} source`,
        contentText: `Search ${marker}`,
        projectId,
      }),
    );
    form.append('files', new Blob([png], { type: 'image/png' }), 'purge.png');
    const captured = await fetch(`${baseUrl}/entries`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'X-CSRF-Token': csrf.data.token,
        'Idempotency-Key': captureKey,
      },
      body: form,
    });
    const entry = (await captured.json()) as {
      data: { id: string; version: number };
    };
    entryId = entry.data.id;
    const [files] = await db.query<mysql.RowDataPacket[]>(
      'SELECT storage_key FROM attachments WHERE entry_id=?',
      [entryId],
    );
    storageKey = String(files[0].storage_key);
    const search = await fetch(`${baseUrl}/search?q=${marker}`, {
      headers: { Cookie: cookie },
    });
    assert.equal(search.status, 200);
    const rejectedSearchFilter = await fetch(
      `${baseUrl}/search?q=${marker}&bogus=1`,
      { headers: { Cookie: cookie } },
    );
    assert.equal(rejectedSearchFilter.status, 400);
    const hits = (await search.json()) as { data: Array<{ id: string }> };
    assert.ok(hits.data.some((hit) => hit.id === entryId));
    assert.ok(hits.data.some((hit) => hit.id === taskId));
    const firstSearchPage = await fetch(
      `${baseUrl}/search?q=${marker}&limit=1&page=1`,
      {
        headers: { Cookie: cookie },
      },
    );
    const firstPageBody = (await firstSearchPage.json()) as {
      data: Array<{ id: string }>;
      page: { number: number; limit: number; hasMore: boolean };
    };
    assert.deepEqual(firstPageBody.page, {
      number: 1,
      limit: 1,
      hasMore: true,
    });
    const secondSearchPage = await fetch(
      `${baseUrl}/search?q=${marker}&limit=1&page=2`,
      {
        headers: { Cookie: cookie },
      },
    );
    const secondPageBody = (await secondSearchPage.json()) as {
      data: Array<{ id: string }>;
      page: { number: number; limit: number; hasMore: boolean };
    };
    assert.notEqual(firstPageBody.data[0].id, secondPageBody.data[0].id);
    const invalidSearchPage = await fetch(
      `${baseUrl}/search?q=${marker}&page=51`,
      {
        headers: { Cookie: cookie },
      },
    );
    assert.equal(invalidSearchPage.status, 400);
    const literalFragment = marker.slice(-8);
    const literalSearch = await fetch(
      `${baseUrl}/search?q=${literalFragment}`,
      { headers: { Cookie: cookie } },
    );
    assert.equal(literalSearch.status, 200);
    const literalHits = (await literalSearch.json()) as {
      data: Array<{ id: string }>;
    };
    assert.ok(literalHits.data.some((hit) => hit.id === entryId));
    assert.ok(literalHits.data.some((hit) => hit.id === taskId));
    const overview = await fetch(`${baseUrl}/projects/${projectId}/overview`, {
      headers: { Cookie: cookie },
    });
    assert.equal(overview.status, 200);
    const overviewBody = (await overview.json()) as {
      data: {
        currentTasks: Array<{ id: string }>;
        openFollowUps: unknown[];
        lastCheckpoint: object | null;
      };
    };
    assert.ok(
      overviewBody.data.currentTasks.some((item) => item.id === taskId),
    );
    assert.ok(Array.isArray(overviewBody.data.openFollowUps));
    assert.equal(overviewBody.data.lastCheckpoint, null);
    const exported = await post('exports', { scope: 'project', projectId });
    assert.equal(exported.status, 202);
    const exportBody = (await exported.json()) as {
      data: { id: string; storageKey: string };
    };
    exportId = exportBody.data.id;
    exportKey = exportBody.data.storageKey;
    const denied = await fetch(`${baseUrl}/exports/${exportId}/content`);
    assert.equal(denied.status, 401);
    const download = await fetch(`${baseUrl}/exports/${exportId}/content`, {
      headers: { Cookie: cookie },
    });
    assert.equal(download.status, 200);
    const zip = Buffer.from(await download.arrayBuffer());
    assert.equal(zip.subarray(0, 2).toString(), 'PK');
    assert.ok(zip.length > 200);
    const trashed = await fetch(`${baseUrl}/entries/${entryId}`, {
      method: 'DELETE',
      headers: { ...headers, 'If-Match': `"${entry.data.version}"` },
    });
    assert.equal(trashed.status, 204);
    const trash = await fetch(`${baseUrl}/trash`, {
      headers: { Cookie: cookie },
    });
    const bins = (await trash.json()) as {
      data: { entries: Array<{ id: string; version: number }> };
    };
    const trashEntry = bins.data.entries.find((item) => item.id === entryId);
    assert.ok(trashEntry);
    const restored = await post(`trash/entry/${entryId}/restore`, {
      expectedVersion: trashEntry.version,
    });
    assert.equal(restored.status, 201);
    const current = await fetch(`${baseUrl}/entries/${entryId}`, {
      headers: { Cookie: cookie },
    });
    const currentBody = (await current.json()) as { data: { version: number } };
    await fetch(`${baseUrl}/entries/${entryId}`, {
      method: 'DELETE',
      headers: { ...headers, 'If-Match': `"${currentBody.data.version}"` },
    });
    const trashAgain = await fetch(`${baseUrl}/trash`, {
      headers: { Cookie: cookie },
    });
    const secondBins = (await trashAgain.json()) as {
      data: { entries: Array<{ id: string; version: number }> };
    };
    const purgeVersion = secondBins.data.entries.find(
      (item) => item.id === entryId,
    )!.version;
    const wrongPurge = await fetch(`${baseUrl}/trash/entry/${entryId}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ expectedVersion: purgeVersion, confirm: 'no' }),
    });
    assert.equal(wrongPurge.status, 400);
    const purged = await fetch(`${baseUrl}/trash/entry/${entryId}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ expectedVersion: purgeVersion, confirm: 'PURGE' }),
    });
    assert.equal(purged.status, 200);
    await assert.rejects(
      access(resolve(process.env.PRIVATE_STORAGE_ROOT!, storageKey)),
    );
    entryId = undefined;
    storageKey = undefined;
    const taskTrash = await fetch(`${baseUrl}/tasks/${taskId}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ expectedVersion: taskBody.data.version }),
    });
    assert.equal(taskTrash.status, 200);
    const binsAfterTask = (await (
      await fetch(`${baseUrl}/trash`, { headers: { Cookie: cookie } })
    ).json()) as { data: { tasks: Array<{ id: string; version: number }> } };
    const trashedTask = binsAfterTask.data.tasks.find(
      (item) => item.id === taskId,
    )!;
    const taskRestore = await post(`trash/task/${taskId}/restore`, {
      expectedVersion: trashedTask.version,
    });
    assert.equal(taskRestore.status, 201);
    const reconciliation = await post('maintenance/reconcile', {});
    assert.equal(reconciliation.status, 201);
    const summary = await fetch(`${baseUrl}/data/summary`, {
      headers: { Cookie: cookie },
    });
    assert.equal(summary.status, 200);
    await db.execute(
      'UPDATE export_jobs SET expires_at=DATE_SUB(NOW(3),INTERVAL 1 SECOND) WHERE id=?',
      [exportId],
    );
    const retention = await post('maintenance/retention', {});
    assert.equal(retention.status, 201);
    const retentionBody = (await retention.json()) as {
      data: { expiredExportsDeleted: number; failures: unknown[] };
    };
    assert.equal(retentionBody.data.expiredExportsDeleted, 1);
    assert.deepEqual(retentionBody.data.failures, []);
    await assert.rejects(
      access(resolve(process.env.PRIVATE_STORAGE_ROOT!, exportKey)),
    );
    exportId = undefined;
    exportKey = undefined;
    console.log(
      'Phase 6 e2e passed: FULLTEXT/literal search, overview, protected ZIP export, trash restore, explicit purge, task restore, reconciliation, and retention.',
    );
  } finally {
    await db.execute('DELETE FROM command_receipts WHERE command_key=?', [
      captureKey,
    ]);
    if (entryId) {
      await db.execute(
        'DELETE FROM processing_jobs WHERE attachment_id IN (SELECT id FROM attachments WHERE entry_id=?)',
        [entryId],
      );
      await db.execute('DELETE FROM attachments WHERE entry_id=?', [entryId]);
      await db.execute('DELETE FROM activity_events WHERE entry_id=?', [
        entryId,
      ]);
      await db.execute('DELETE FROM entries WHERE id=?', [entryId]);
    }
    if (taskId) {
      await db.execute('DELETE FROM activity_events WHERE task_id=?', [taskId]);
      await db.execute('DELETE FROM tasks WHERE id=?', [taskId]);
    }
    if (exportId)
      await db.execute('DELETE FROM export_jobs WHERE id=?', [exportId]);
    if (projectId)
      await db.execute('DELETE FROM projects WHERE id=?', [projectId]);
    await db.execute('DELETE FROM sessions WHERE id=?', [sessionId]);
    await db.end();
    const root = resolve(
      process.env.PRIVATE_STORAGE_ROOT ?? './storage/private',
    );
    if (storageKey)
      await unlink(resolve(root, storageKey)).catch(() => undefined);
    if (exportKey)
      await unlink(resolve(root, exportKey)).catch(() => undefined);
  }
}
void main();
