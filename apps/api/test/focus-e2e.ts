import { strict as assert } from 'node:assert';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true,
});

async function main(): Promise<void> {
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME ?? 'wokim',
    user: process.env.DB_USER ?? 'wokim',
    password: process.env.DB_PASSWORD ?? '',
  });
  const sessionId = randomUUID();
  const sessionSecret = randomBytes(32).toString('base64url');
  const keys = Array.from({ length: 7 }, () => randomUUID());
  let projectId: string | undefined;
  const taskIds: string[] = [];
  let originalFocusVersion = 0;
  try {
    const [owners] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT id,active_focus_session_id,focus_version FROM users LIMIT 1',
    );
    assert.equal(owners.length, 1);
    assert.equal(
      owners[0].active_focus_session_id,
      null,
      'Focus e2e requires no real active focus.',
    );
    originalFocusVersion = Number(owners[0].focus_version);
    await connection.execute(
      `INSERT INTO sessions (id,user_id,token_hash,created_at,last_seen_at,expires_at,revoked_at,device_label)
       VALUES (?,?,?,NOW(3),NOW(3),DATE_ADD(NOW(3), INTERVAL 1 HOUR),NULL,'Phase 4 e2e')`,
      [
        sessionId,
        owners[0].id,
        createHash('sha256').update(sessionSecret).digest(),
      ],
    );
    const csrfResponse = await fetch(`${baseUrl}/auth/csrf`);
    const csrf = (await csrfResponse.json()) as { data: { token: string } };
    const csrfCookie = csrfResponse.headers.get('set-cookie')?.split(';', 1)[0];
    assert.ok(csrfCookie);
    const cookies = `wm_session=${sessionSecret}; ${csrfCookie}`;
    const headers = {
      Cookie: cookies,
      'X-CSRF-Token': csrf.data.token,
      'Content-Type': 'application/json',
    };
    const post = (path: string, body: object, key?: string) =>
      fetch(`${baseUrl}/${path}`, {
        method: 'POST',
        headers: { ...headers, ...(key ? { 'Idempotency-Key': key } : {}) },
        body: JSON.stringify(body),
      });
    const projectResponse = await post('projects', {
      name: 'Fictional focus e2e project',
    });
    assert.equal(projectResponse.status, 201);
    projectId = ((await projectResponse.json()) as { data: { id: string } })
      .data.id;
    for (const title of ['Focus A', 'Focus B', 'Focus C']) {
      const response = await post('tasks', {
        projectId,
        title,
        type: 'testing',
      });
      assert.equal(response.status, 201);
      taskIds.push(
        ((await response.json()) as { data: { id: string } }).data.id,
      );
    }
    const initial = await fetch(`${baseUrl}/focus`, {
      headers: { Cookie: cookies },
    });
    const initialBody = (await initial.json()) as {
      data: { focusVersion: number; task: null };
    };
    assert.equal(initialBody.data.task, null);
    const start = await post(
      'focus/start',
      { taskId: taskIds[0], expectedFocusVersion: originalFocusVersion },
      keys[0],
    );
    assert.equal(start.status, 200);
    const started = (await start.json()) as {
      data: {
        focusVersion: number;
        session: { id: string };
        task: { id: string };
      };
    };
    assert.equal(started.data.task.id, taskIds[0]);
    const replay = await post(
      'focus/start',
      { taskId: taskIds[0], expectedFocusVersion: originalFocusVersion },
      keys[0],
    );
    assert.equal(replay.status, 200);
    assert.equal(
      ((await replay.json()) as typeof started).data.session.id,
      started.data.session.id,
    );
    const stale = await post(
      'focus/switch',
      { targetTaskId: taskIds[1], expectedFocusVersion: originalFocusVersion },
      keys[1],
    );
    assert.equal(stale.status, 409);
    const missing = await post(
      'focus/switch',
      {
        targetTaskId: randomUUID(),
        expectedFocusVersion: started.data.focusVersion,
      },
      keys[2],
    );
    assert.equal(missing.status, 404);
    const afterMissing = await fetch(`${baseUrl}/focus`, {
      headers: { Cookie: cookies },
    });
    assert.equal(
      ((await afterMissing.json()) as typeof started).data.task.id,
      taskIds[0],
    );
    const switchB = await post(
      'focus/switch',
      {
        targetTaskId: taskIds[1],
        expectedFocusVersion: started.data.focusVersion,
        checkpoint: 'A checkpoint',
      },
      keys[3],
    );
    assert.equal(switchB.status, 200);
    const focusedB = (await switchB.json()) as typeof started;
    const switchC = await post(
      'focus/switch',
      {
        targetTaskId: taskIds[2],
        expectedFocusVersion: focusedB.data.focusVersion,
        checkpoint: 'B checkpoint',
      },
      keys[4],
    );
    assert.equal(switchC.status, 200);
    const focusedC = (await switchC.json()) as typeof started;
    const paused = await post(
      'focus/pause',
      { reason: 'pause', expectedFocusVersion: focusedC.data.focusVersion },
      keys[5],
    );
    assert.equal(paused.status, 200);
    const pausedBody = (await paused.json()) as {
      data: { focusVersion: number; task: null };
    };
    const resumeA = await post(
      'focus/start',
      {
        taskId: taskIds[0],
        expectedFocusVersion: pausedBody.data.focusVersion,
      },
      keys[6],
    );
    assert.equal(resumeA.status, 200);
    const resumed = (await resumeA.json()) as typeof started;
    const finishKey = randomUUID();
    keys.push(finishKey);
    const finished = await post(
      'focus/finish',
      { action: 'done', expectedFocusVersion: resumed.data.focusVersion },
      finishKey,
    );
    assert.equal(finished.status, 200);
    assert.equal(
      ((await finished.json()) as { data: { task: null } }).data.task,
      null,
    );
    const [edges] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT i.id FROM interruptions i
       JOIN focus_sessions f ON f.id=i.from_focus_session_id
       WHERE f.task_id IN (?,?,?)`,
      taskIds,
    );
    assert.equal(edges.length, 2);
    const today = await fetch(`${baseUrl}/today`, {
      headers: { Cookie: cookies },
    });
    assert.equal(today.status, 200);
    const todayBody = (await today.json()) as {
      data: { localDate: string; timezone: string };
    };
    const checkIn = await fetch(
      `${baseUrl}/check-ins/${todayBody.data.localDate}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          expectedVersion: null,
          timezone: todayBody.data.timezone,
          intendedOutcome: 'Verify focus invariants',
          items: [{ section: 'paused', taskId: taskIds[1] }],
        }),
      },
    );
    assert.equal(checkIn.status, 200);
    const saved = (await checkIn.json()) as {
      data: { version: number; intendedOutcome: string };
    };
    assert.equal(saved.data.intendedOutcome, 'Verify focus invariants');
    const staleCheckIn = await fetch(
      `${baseUrl}/check-ins/${todayBody.data.localDate}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          expectedVersion: null,
          timezone: todayBody.data.timezone,
          items: [],
        }),
      },
    );
    assert.equal(staleCheckIn.status, 409);
    console.log(
      'Phase 4 focus e2e passed: replay, stale conflict, rollback, A→B→C→A history, singleton focus, and versioned check-in.',
    );
  } finally {
    await connection.execute(
      'UPDATE users SET active_focus_session_id=NULL,focus_version=? WHERE id=1',
      [originalFocusVersion],
    );
    if (taskIds.length) {
      const slots = taskIds.map(() => '?').join(',');
      await connection.execute(
        `DELETE FROM daily_check_in_items WHERE task_id IN (${slots})`,
        taskIds,
      );
      await connection.execute(
        "DELETE FROM daily_check_ins WHERE intended_outcome='Verify focus invariants'",
      );
      await connection.execute(
        `DELETE i FROM interruptions i JOIN focus_sessions f ON f.id=i.from_focus_session_id WHERE f.task_id IN (${slots})`,
        taskIds,
      );
      await connection.execute(
        `DELETE FROM entry_supersessions WHERE older_entry_id IN (SELECT id FROM entries WHERE task_id IN (${slots})) OR newer_entry_id IN (SELECT id FROM entries WHERE task_id IN (${slots}))`,
        [...taskIds, ...taskIds],
      );
      await connection.execute(
        `UPDATE focus_sessions SET checkpoint_entry_id=NULL WHERE task_id IN (${slots})`,
        taskIds,
      );
      await connection.execute(
        `DELETE FROM entries WHERE task_id IN (${slots})`,
        taskIds,
      );
      await connection.execute(
        `DELETE FROM focus_sessions WHERE task_id IN (${slots})`,
        taskIds,
      );
      await connection.execute(
        `DELETE FROM tasks WHERE id IN (${slots})`,
        taskIds,
      );
    }
    if (projectId)
      await connection.execute('DELETE FROM projects WHERE id=?', [projectId]);
    for (const key of keys)
      await connection.execute(
        'DELETE FROM command_receipts WHERE command_key=?',
        [key],
      );
    await connection.execute('DELETE FROM sessions WHERE id=?', [sessionId]);
    await connection.end();
  }
}

void main();
