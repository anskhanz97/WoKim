import { strict as assert } from 'node:assert';
import { execFile } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { access, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true,
});
const execFileAsync = promisify(execFile);

interface CaptureResponse {
  data: {
    id: string;
    version: number;
    attachments: Array<{ id: string; originalName: string; purpose: string }>;
  };
}

async function main(): Promise<void> {
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';
  const live = await fetch(`${baseUrl}/health/live`);
  assert.equal(live.status, 200);
  assert.deepEqual(await live.json(), { data: { status: 'live' } });

  const anonymous = await fetch(`${baseUrl}/me`);
  assert.equal(anonymous.status, 401);
  const authError = (await anonymous.json()) as { error: { code: string } };
  assert.equal(authError.error.code, 'AUTH_REQUIRED');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME ?? 'wokim',
    user: process.env.DB_USER ?? 'wokim',
    password: process.env.DB_PASSWORD ?? '',
  });
  const sessionId = randomUUID();
  const sessionSecret = randomBytes(32).toString('base64url');
  const commandKey = randomUUID();
  const transitionKey = randomUUID();
  const conversionKey = randomUUID();
  const keepOnlyCommandKey = randomUUID();
  const requirementKeys = [randomUUID(), randomUUID(), randomUUID()];
  const paginationProjectIds = Array.from({ length: 105 }, () => randomUUID());
  const paginationProjectPrefix = `Cursor cap ${sessionId}`;
  let entryId: string | undefined;
  let keepOnlyEntryId: string | undefined;
  let originalTranscriptionEnabled: number | undefined;
  let personId: string | undefined;
  let teamId: string | undefined;
  let projectId: string | undefined;
  let otherProjectId: string | undefined;
  const taskIds: string[] = [];
  const requirementEntryIds: string[] = [];
  const storageKeys: string[] = [];
  try {
    const [owners] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT id FROM users LIMIT 1',
    );
    assert.equal(
      owners.length,
      1,
      'An owner must be bootstrapped before the e2e smoke test.',
    );
    const [processingSettings] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT transcription_enabled FROM processing_settings WHERE id=1',
    );
    originalTranscriptionEnabled = Number(
      processingSettings[0].transcription_enabled,
    );
    await connection.execute(
      `INSERT INTO sessions
       (id,user_id,token_hash,created_at,last_seen_at,expires_at,revoked_at,device_label)
       VALUES (?,?,?,NOW(3),NOW(3),DATE_ADD(NOW(3), INTERVAL 1 HOUR),NULL,'Phase 2 e2e')`,
      [
        sessionId,
        owners[0].id,
        createHash('sha256').update(sessionSecret).digest(),
      ],
    );

    const csrfResponse = await fetch(`${baseUrl}/auth/csrf`);
    assert.equal(csrfResponse.status, 200);
    const csrf = (await csrfResponse.json()) as { data: { token: string } };
    const csrfCookie = csrfResponse.headers.get('set-cookie')?.split(';', 1)[0];
    assert.ok(csrfCookie);
    const cookies = `wm_session=${sessionSecret}; ${csrfCookie}`;
    const mutationHeaders = {
      Cookie: cookies,
      'X-CSRF-Token': csrf.data.token,
    };

    const postJson = async (path: string, body: object) =>
      fetch(`${baseUrl}/${path}`, {
        method: 'POST',
        headers: { ...mutationHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const personResponse = await postJson('people', {
      displayName: 'Fictional E2E Person',
    });
    assert.equal(personResponse.status, 201);
    const person = (await personResponse.json()) as {
      data: { id: string; version: number };
    };
    personId = person.data.id;
    const teamResponse = await postJson('teams', {
      name: 'Fictional E2E Team',
    });
    assert.equal(teamResponse.status, 201);
    const team = (await teamResponse.json()) as { data: { id: string } };
    teamId = team.data.id;
    const projectResponse = await postJson('projects', {
      name: 'Fictional E2E Project',
    });
    assert.equal(projectResponse.status, 201);
    const project = (await projectResponse.json()) as {
      data: { id: string; version: number };
    };
    projectId = project.data.id;
    for (const [path, expectedId] of [
      ['people?q=E2E%20Person', personId],
      ['teams?q=E2E%20Team', teamId],
      ['projects?status=active&q=E2E%20Project', projectId],
    ] as const) {
      const filtered = await fetch(`${baseUrl}/${path}`, {
        headers: { Cookie: cookies },
      });
      assert.equal(filtered.status, 200);
      const body = (await filtered.json()) as { data: Array<{ id: string }> };
      assert.ok(body.data.some((item) => item.id === expectedId));
    }
    const unknownDirectoryFilter = await fetch(`${baseUrl}/people?bogus=1`, {
      headers: { Cookie: cookies },
    });
    assert.equal(unknownDirectoryFilter.status, 400);

    const personTeam = await fetch(
      `${baseUrl}/people/${personId}/teams/${teamId}`,
      {
        method: 'PUT',
        headers: {
          ...mutationHeaders,
          'Content-Type': 'application/json',
          'If-Match': `"${person.data.version}"`,
        },
        body: JSON.stringify({ roleLabel: 'Reviewer' }),
      },
    );
    assert.equal(personTeam.status, 200);
    const projectPerson = await fetch(
      `${baseUrl}/projects/${projectId}/people/${personId}`,
      {
        method: 'PUT',
        headers: {
          ...mutationHeaders,
          'Content-Type': 'application/json',
          'If-Match': `"${project.data.version}"`,
        },
        body: JSON.stringify({ roleLabel: 'Owner' }),
      },
    );
    assert.equal(projectPerson.status, 200);
    const projectAfterPerson = (await projectPerson.json()) as {
      data: { version: number };
    };
    const projectTeam = await fetch(
      `${baseUrl}/projects/${projectId}/teams/${teamId}`,
      {
        method: 'PUT',
        headers: {
          ...mutationHeaders,
          'Content-Type': 'application/json',
          'If-Match': `"${projectAfterPerson.data.version}"`,
        },
        body: '{}',
      },
    );
    assert.equal(projectTeam.status, 200);
    const staleAssociation = await fetch(
      `${baseUrl}/projects/${projectId}/teams/${teamId}`,
      {
        method: 'DELETE',
        headers: {
          ...mutationHeaders,
          'If-Match': `"${project.data.version}"`,
        },
      },
    );
    assert.equal(staleAssociation.status, 412);
    const associationResponse = await fetch(
      `${baseUrl}/projects/${projectId}/people`,
      { headers: { Cookie: cookies } },
    );
    assert.equal(associationResponse.status, 200);
    const associations = (await associationResponse.json()) as {
      data: { people: Array<{ id: string }>; teams: Array<{ id: string }> };
    };
    assert.deepEqual(
      associations.data.people.map((item) => item.id),
      [personId],
    );
    assert.deepEqual(
      associations.data.teams.map((item) => item.id),
      [teamId],
    );
    const personContextResponse = await fetch(`${baseUrl}/people/${personId}`, {
      headers: { Cookie: cookies },
    });
    assert.equal(personContextResponse.status, 200);
    const personContext = (await personContextResponse.json()) as {
      data: {
        teams: Array<{ id: string }>;
        projects: Array<{ id: string }>;
      };
    };
    assert.deepEqual(
      personContext.data.teams.map((item) => item.id),
      [teamId],
    );
    assert.deepEqual(
      personContext.data.projects.map((item) => item.id),
      [projectId],
    );

    const taskResponse = await postJson('tasks', {
      projectId,
      title: 'Fictional date-only task',
      type: 'testing',
      priority: 'high',
      requestedByPersonId: personId,
      nextAction: 'Verify the Phase 3 contract',
      deadline: { kind: 'hard', date: '2026-10-30' },
    });
    assert.equal(taskResponse.status, 201);
    const createdTask = (await taskResponse.json()) as {
      data: { id: string; version: number; deadline: { date: string } };
    };
    taskIds.push(createdTask.data.id);
    assert.equal(createdTask.data.deadline.date, '2026-10-30');
    const filteredTasks = await fetch(
      `${baseUrl}/tasks?personId=${personId}&dueFrom=2026-10-01&dueTo=2026-10-31`,
      { headers: { Cookie: cookies } },
    );
    assert.equal(filteredTasks.status, 200);
    assert.ok(
      (
        (await filteredTasks.json()) as { data: Array<{ id: string }> }
      ).data.some((item) => item.id === createdTask.data.id),
    );
    const invalidTaskRange = await fetch(
      `${baseUrl}/tasks?dueFrom=2026-11-01&dueTo=2026-10-01`,
      { headers: { Cookie: cookies } },
    );
    assert.equal(invalidTaskRange.status, 400);
    const transitioned = await fetch(
      `${baseUrl}/tasks/${createdTask.data.id}/transitions`,
      {
        method: 'POST',
        headers: {
          ...mutationHeaders,
          'Content-Type': 'application/json',
          'If-Match': `"${createdTask.data.version}"`,
          'Idempotency-Key': transitionKey,
        },
        body: JSON.stringify({ action: 'done' }),
      },
    );
    assert.equal(transitioned.status, 200);
    const transitionedBody = (await transitioned.json()) as {
      data: { id: string; status: string };
    };
    assert.equal(transitionedBody.data.status, 'done');
    const replayedTransition = await fetch(
      `${baseUrl}/tasks/${createdTask.data.id}/transitions`,
      {
        method: 'POST',
        headers: {
          ...mutationHeaders,
          'Content-Type': 'application/json',
          'If-Match': `"${createdTask.data.version}"`,
          'Idempotency-Key': transitionKey,
        },
        body: JSON.stringify({ action: 'done' }),
      },
    );
    assert.equal(replayedTransition.status, 200);
    assert.equal(
      ((await replayedTransition.json()) as { data: { id: string } }).data.id,
      createdTask.data.id,
    );

    const invalid = new FormData();
    invalid.set(
      'metadata',
      JSON.stringify({ contentText: 'Fictional invalid media fixture.' }),
    );
    invalid.append(
      'files',
      new Blob(['<svg/>'], { type: 'image/png' }),
      'invalid.png',
    );
    const invalidResponse = await fetch(`${baseUrl}/entries`, {
      method: 'POST',
      headers: { ...mutationHeaders, 'Idempotency-Key': randomUUID() },
      body: invalid,
    });
    assert.equal(invalidResponse.status, 415);

    const oversizedBytes = new Uint8Array(10 * 1024 * 1024 + 1);
    oversizedBytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    const oversized = new FormData();
    oversized.set(
      'metadata',
      JSON.stringify({ contentText: 'Fictional oversized media fixture.' }),
    );
    oversized.append(
      'files',
      new Blob([oversizedBytes], { type: 'image/png' }),
      'oversized.png',
    );
    const oversizedResponse = await fetch(`${baseUrl}/entries`, {
      method: 'POST',
      headers: { ...mutationHeaders, 'Idempotency-Key': randomUUID() },
      body: oversized,
    });
    assert.equal(oversizedResponse.status, 413);

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const wav = Buffer.from('524946460800000057415645666d7420', 'hex');
    const wavData = Buffer.alloc(800, 128);
    const validWav = Buffer.alloc(44 + wavData.length);
    validWav.write('RIFF', 0);
    validWav.writeUInt32LE(36 + wavData.length, 4);
    validWav.write('WAVEfmt ', 8);
    validWav.writeUInt32LE(16, 16);
    validWav.writeUInt16LE(1, 20);
    validWav.writeUInt16LE(1, 22);
    validWav.writeUInt32LE(8000, 24);
    validWav.writeUInt32LE(8000, 28);
    validWav.writeUInt16LE(1, 32);
    validWav.writeUInt16LE(8, 34);
    validWav.write('data', 36);
    validWav.writeUInt32LE(wavData.length, 40);
    wavData.copy(validWav, 44);
    const duplicate = new FormData();
    duplicate.set(
      'metadata',
      JSON.stringify({
        contentText: 'Fictional duplicate-name and audio fixture.',
        projectId,
        taskId: createdTask.data.id,
        senderPersonId: personId,
        attachmentPurpose: 'instruction',
        transcribeAudio: true,
      }),
    );
    duplicate.append(
      'files',
      new Blob([png], { type: 'image/png' }),
      'duplicate.png',
    );
    duplicate.append(
      'files',
      new Blob([png], { type: 'image/png' }),
      'duplicate.png',
    );
    duplicate.append(
      'files',
      new Blob([validWav], { type: 'audio/wav' }),
      'valid.wav',
    );
    duplicate.append(
      'files',
      new Blob([wav], { type: 'audio/wav' }),
      'range.wav',
    );
    const captureResponse = await fetch(`${baseUrl}/entries`, {
      method: 'POST',
      headers: { ...mutationHeaders, 'Idempotency-Key': commandKey },
      body: duplicate,
    });
    assert.equal(captureResponse.status, 201);
    const captured = (await captureResponse.json()) as CaptureResponse;
    entryId = captured.data.id;
    assert.deepEqual(
      captured.data.attachments.map((file) => file.originalName),
      ['duplicate.png', 'duplicate.png', 'valid.wav', 'range.wav'],
    );
    assert.ok(
      captured.data.attachments.every((file) => file.purpose === 'instruction'),
    );
    const [transcriptionJobs] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT attachment_id FROM processing_jobs WHERE kind='transcribe' AND attachment_id IN (?,?)",
      [captured.data.attachments[2].id, captured.data.attachments[3].id],
    );
    assert.equal(transcriptionJobs.length, 2);
    await connection.execute(
      "UPDATE processing_jobs SET available_at='2100-01-01 00:00:00.000' WHERE kind='transcribe' AND attachment_id IN (?,?)",
      [captured.data.attachments[2].id, captured.data.attachments[3].id],
    );
    await connection.execute(
      'UPDATE processing_settings SET transcription_enabled=1 WHERE id=1',
    );
    const keepOnly = new FormData();
    keepOnly.set(
      'metadata',
      JSON.stringify({
        contentText: 'Fictional audio-only voice note.',
        transcribeAudio: false,
      }),
    );
    keepOnly.append(
      'files',
      new Blob([validWav], { type: 'audio/wav' }),
      'keep-only.wav',
    );
    const keepOnlyResponse = await fetch(`${baseUrl}/entries`, {
      method: 'POST',
      headers: {
        ...mutationHeaders,
        'Idempotency-Key': keepOnlyCommandKey,
      },
      body: keepOnly,
    });
    assert.equal(keepOnlyResponse.status, 201);
    const keepOnlyCaptured = (await keepOnlyResponse.json()) as CaptureResponse;
    keepOnlyEntryId = keepOnlyCaptured.data.id;
    const keepOnlyAttachment = keepOnlyCaptured.data.attachments[0];
    const [automaticKeepOnlyJobs] = await connection.query<
      mysql.RowDataPacket[]
    >(
      "SELECT id FROM processing_jobs WHERE kind='transcribe' AND attachment_id=?",
      [keepOnlyAttachment.id],
    );
    assert.equal(automaticKeepOnlyJobs.length, 0);
    const laterTranscription = await fetch(
      `${baseUrl}/attachments/${keepOnlyAttachment.id}/jobs`,
      {
        method: 'POST',
        headers: { ...mutationHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'transcribe' }),
      },
    );
    assert.equal(laterTranscription.status, 201);
    await connection.execute(
      "UPDATE processing_jobs SET available_at='2100-01-01 00:00:00.000' WHERE kind='transcribe' AND attachment_id=?",
      [keepOnlyAttachment.id],
    );
    const [keepOnlyFiles] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT storage_key FROM attachments WHERE entry_id=?',
      [keepOnlyEntryId],
    );
    storageKeys.push(...keepOnlyFiles.map((file) => String(file.storage_key)));
    await connection.execute(
      'UPDATE processing_settings SET transcription_enabled=? WHERE id=1',
      [originalTranscriptionEnabled],
    );
    const addition = new FormData();
    addition.append(
      'files',
      new Blob([png], { type: 'image/png' }),
      'added-later.png',
    );
    const additionResponse = await fetch(
      `${baseUrl}/entries/${entryId}/attachments`,
      {
        method: 'POST',
        headers: {
          Cookie: cookies,
          'X-CSRF-Token': csrf.data.token,
          'If-Match': `"${captured.data.version}"`,
        },
        body: addition,
      },
    );
    assert.equal(additionResponse.status, 201);
    const added = (await additionResponse.json()) as CaptureResponse;
    captured.data.version = added.data.version;
    captured.data.attachments = added.data.attachments;
    assert.ok(
      captured.data.attachments.some(
        (file) => file.originalName === 'added-later.png',
      ),
    );
    const linkedEntryResponse = await fetch(`${baseUrl}/entries/${entryId}`, {
      method: 'PATCH',
      headers: {
        ...mutationHeaders,
        'Content-Type': 'application/json',
        'If-Match': `"${captured.data.version}"`,
      },
      body: JSON.stringify({
        taskId: createdTask.data.id,
        senderPersonId: personId,
      }),
    });
    assert.equal(linkedEntryResponse.status, 200);
    const linkedEntry = (await linkedEntryResponse.json()) as {
      data: { taskId: string; senderPersonId: string; version: number };
    };
    assert.equal(linkedEntry.data.taskId, createdTask.data.id);
    assert.equal(linkedEntry.data.senderPersonId, personId);
    const unlinkedEntryResponse = await fetch(`${baseUrl}/entries/${entryId}`, {
      method: 'PATCH',
      headers: {
        ...mutationHeaders,
        'Content-Type': 'application/json',
        'If-Match': `"${linkedEntry.data.version}"`,
      },
      body: JSON.stringify({ taskId: null }),
    });
    assert.equal(unlinkedEntryResponse.status, 200);
    captured.data.version = (
      (await unlinkedEntryResponse.json()) as { data: { version: number } }
    ).data.version;
    const filteredEntries = await fetch(
      `${baseUrl}/entries?state=organized&projectId=${projectId}&personId=${personId}&type=note`,
      { headers: { Cookie: cookies } },
    );
    assert.equal(filteredEntries.status, 200);
    assert.ok(
      (
        (await filteredEntries.json()) as { data: Array<{ id: string }> }
      ).data.some((item) => item.id === entryId),
    );
    await connection.execute(
      "UPDATE processing_jobs SET available_at='2000-01-01 00:00:00.000' WHERE kind='inspect_media' AND attachment_id IN (SELECT id FROM attachments WHERE entry_id=?)",
      [entryId],
    );
    for (let index = 0; index < captured.data.attachments.length; index += 1)
      await execFileAsync(
        'cmd.exe',
        ['/d', '/s', '/c', 'npm run worker:once'],
        {
          cwd: fileURLToPath(new URL('..', import.meta.url)),
          windowsHide: true,
        },
      );
    const [inspected] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT original_name,media_state,duration_ms,storage_key,thumbnail_key,playback_key FROM attachments WHERE entry_id=? ORDER BY created_at,id',
      [entryId],
    );
    assert.equal(
      inspected.filter(
        (file) =>
          file.original_name === 'duplicate.png' &&
          file.media_state === 'ready',
      ).length,
      2,
    );
    const validAudio = inspected.find(
      (file) => file.original_name === 'valid.wav',
    );
    assert.equal(validAudio?.media_state, 'ready');
    assert.ok(Number(validAudio?.duration_ms) > 0);
    assert.ok(validAudio?.playback_key, JSON.stringify(validAudio));
    const invalidAudio = inspected.find(
      (file) => file.original_name === 'range.wav',
    );
    assert.equal(invalidAudio?.media_state, 'failed');
    const storageRoot = resolve(
      process.env.PRIVATE_STORAGE_ROOT ?? './storage/private',
    );
    await access(resolve(storageRoot, String(invalidAudio?.storage_key)));

    const playableAudio = captured.data.attachments[2];
    const audio = captured.data.attachments[3];
    const denied = await fetch(`${baseUrl}/attachments/${audio.id}/content`, {
      headers: { Range: 'bytes=0-7' },
    });
    assert.equal(denied.status, 401);
    const ranged = await fetch(`${baseUrl}/attachments/${audio.id}/content`, {
      headers: { Cookie: cookies, Range: 'bytes=0-7' },
    });
    assert.equal(ranged.status, 206);
    assert.equal((await ranged.arrayBuffer()).byteLength, 8);
    const playback = await fetch(
      `${baseUrl}/attachments/${playableAudio.id}/playback`,
      { headers: { Cookie: cookies, Range: 'bytes=0-7' } },
    );
    assert.equal(playback.status, 206);
    assert.equal(playback.headers.get('content-type'), 'audio/mpeg');
    assert.equal((await playback.arrayBuffer()).byteLength, 8);

    const editHeaders = {
      ...mutationHeaders,
      'Content-Type': 'application/json',
      'If-Match': `"${captured.data.version}"`,
    };
    const firstEdit = await fetch(`${baseUrl}/entries/${entryId}`, {
      method: 'PATCH',
      headers: editHeaders,
      body: JSON.stringify({ title: 'Fictional stale-write fixture' }),
    });
    assert.equal(firstEdit.status, 200);
    const editedEntry = (await firstEdit.json()) as {
      data: { id: string; version: number };
    };
    const staleEdit = await fetch(`${baseUrl}/entries/${entryId}`, {
      method: 'PATCH',
      headers: editHeaders,
      body: JSON.stringify({ title: 'Must conflict' }),
    });
    assert.equal(staleEdit.status, 412);
    const conversion = await fetch(
      `${baseUrl}/entries/${entryId}/convert-to-task`,
      {
        method: 'POST',
        headers: {
          ...mutationHeaders,
          'Content-Type': 'application/json',
          'Idempotency-Key': conversionKey,
        },
        body: JSON.stringify({
          projectId,
          title: 'Fictional converted task',
          type: 'change',
          priority: 'normal',
          expectedEntryVersion: editedEntry.data.version,
        }),
      },
    );
    assert.equal(conversion.status, 201);
    const convertedTask = (await conversion.json()) as {
      data: { id: string; sourceEntryId: string };
    };
    taskIds.push(convertedTask.data.id);
    assert.equal(convertedTask.data.sourceEntryId, entryId);
    const conversionReplay = await fetch(
      `${baseUrl}/entries/${entryId}/convert-to-task`,
      {
        method: 'POST',
        headers: {
          ...mutationHeaders,
          'Content-Type': 'application/json',
          'Idempotency-Key': conversionKey,
        },
        body: JSON.stringify({
          projectId,
          title: 'Fictional converted task',
          type: 'change',
          priority: 'normal',
          expectedEntryVersion: editedEntry.data.version,
        }),
      },
    );
    assert.equal(conversionReplay.status, 201);
    assert.equal(
      ((await conversionReplay.json()) as { data: { id: string } }).data.id,
      convertedTask.data.id,
    );

    const captureRequirement = async (
      key: string,
      targetProjectId: string,
      title: string,
      entryType: 'instruction' | 'decision',
    ) => {
      const form = new FormData();
      form.set(
        'metadata',
        JSON.stringify({
          title,
          contentText: title,
          entryType,
          projectId: targetProjectId,
        }),
      );
      const response = await fetch(`${baseUrl}/entries`, {
        method: 'POST',
        headers: { ...mutationHeaders, 'Idempotency-Key': key },
        body: form,
      });
      assert.equal(response.status, 201);
      return (await response.json()) as CaptureResponse;
    };
    const olderRequirement = await captureRequirement(
      requirementKeys[0],
      projectId,
      'Fictional original instruction',
      'instruction',
    );
    const newerRequirement = await captureRequirement(
      requirementKeys[1],
      projectId,
      'Fictional replacement decision',
      'decision',
    );
    requirementEntryIds.push(
      olderRequirement.data.id,
      newerRequirement.data.id,
    );
    const linked = await fetch(
      `${baseUrl}/entries/${newerRequirement.data.id}/supersessions`,
      {
        method: 'POST',
        headers: {
          ...mutationHeaders,
          'Content-Type': 'application/json',
          'If-Match': `"${newerRequirement.data.version}"`,
        },
        body: JSON.stringify({
          olderEntryIds: [olderRequirement.data.id],
          reason: 'Fictional requirement changed',
        }),
      },
    );
    assert.equal(linked.status, 201);
    const linkedBody = (await linked.json()) as {
      data: { version: number; replaces: Array<{ id: string }> };
    };
    assert.equal(linkedBody.data.replaces[0]?.id, olderRequirement.data.id);
    const cycle = await fetch(
      `${baseUrl}/entries/${olderRequirement.data.id}/supersessions`,
      {
        method: 'POST',
        headers: {
          ...mutationHeaders,
          'Content-Type': 'application/json',
          'If-Match': `"${olderRequirement.data.version}"`,
        },
        body: JSON.stringify({ olderEntryIds: [newerRequirement.data.id] }),
      },
    );
    assert.equal(cycle.status, 422);
    const otherProjectResponse = await postJson('projects', {
      name: 'Fictional cross-project fixture',
    });
    assert.equal(otherProjectResponse.status, 201);
    otherProjectId = (
      (await otherProjectResponse.json()) as { data: { id: string } }
    ).data.id;
    await connection.execute(
      `INSERT INTO projects (id,name,status) VALUES ${paginationProjectIds.map(() => "(?,?,'active')").join(',')}`,
      paginationProjectIds.flatMap((id, index) => [
        id,
        `${paginationProjectPrefix} ${String(index).padStart(3, '0')}`,
      ]),
    );
    const seenProjectIds: string[] = [];
    let projectCursor: string | null = null;
    let firstProjectCursor: string | null = null;
    do {
      const params = new URLSearchParams({
        status: 'active',
        q: paginationProjectPrefix,
        limit: '50',
      });
      if (projectCursor) params.set('cursor', projectCursor);
      const projectPage = await fetch(`${baseUrl}/projects?${params}`, {
        headers: { Cookie: cookies },
      });
      assert.equal(projectPage.status, 200);
      const body = (await projectPage.json()) as {
        data: Array<{ id: string }>;
        page: { nextCursor: string | null };
      };
      seenProjectIds.push(...body.data.map((project) => project.id));
      firstProjectCursor ??= body.page.nextCursor;
      projectCursor = body.page.nextCursor;
    } while (projectCursor);
    assert.deepEqual(new Set(seenProjectIds), new Set(paginationProjectIds));
    assert.equal(seenProjectIds.length, paginationProjectIds.length);
    assert.ok(firstProjectCursor);
    const mismatchedProjectCursor = await fetch(
      `${baseUrl}/projects?status=active&q=${encodeURIComponent(`${paginationProjectPrefix} changed`)}&limit=50&cursor=${encodeURIComponent(firstProjectCursor)}`,
      { headers: { Cookie: cookies } },
    );
    assert.equal(mismatchedProjectCursor.status, 400);
    const crossRequirement = await captureRequirement(
      requirementKeys[2],
      otherProjectId,
      'Fictional cross-project instruction',
      'instruction',
    );
    requirementEntryIds.push(crossRequirement.data.id);
    const crossProject = await fetch(
      `${baseUrl}/entries/${newerRequirement.data.id}/supersessions`,
      {
        method: 'POST',
        headers: {
          ...mutationHeaders,
          'Content-Type': 'application/json',
          'If-Match': `"${linkedBody.data.version}"`,
        },
        body: JSON.stringify({ olderEntryIds: [crossRequirement.data.id] }),
      },
    );
    assert.equal(crossProject.status, 422);
    const decisionsResponse = await fetch(
      `${baseUrl}/projects/${projectId}/decisions`,
      {
        headers: { Cookie: cookies },
      },
    );
    assert.equal(decisionsResponse.status, 200);
    const decisions = (await decisionsResponse.json()) as {
      data: Array<{ id: string; replaces: Array<{ id: string }> }>;
    };
    assert.equal(
      decisions.data.find((item) => item.id === newerRequirement.data.id)
        ?.replaces[0]?.id,
      olderRequirement.data.id,
    );
    const historyResponse = await fetch(
      `${baseUrl}/projects/${projectId}/history`,
      {
        headers: { Cookie: cookies },
      },
    );
    assert.equal(historyResponse.status, 200);
    assert.ok(
      (
        (await historyResponse.json()) as { data: Array<{ eventType: string }> }
      ).data.some((event) => event.eventType === 'task.transitioned'),
    );

    const [files] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT storage_key,thumbnail_key,playback_key FROM attachments WHERE entry_id=?',
      [entryId],
    );
    storageKeys.push(
      ...files.flatMap((file) =>
        [file.storage_key, file.thumbnail_key, file.playback_key]
          .filter((key) => key !== null)
          .map((key) => String(key)),
      ),
    );
    console.log(
      'Phase 2/3 API e2e passed: associations, 105-record cursor traversal, capture and later attachment upload, voice keep/transcribe choices, media inspection/playback, private ranges, stale edits, date-only tasks, transitions, source conversion, supersession validation, and project history.',
    );
  } finally {
    await connection.execute(
      'DELETE FROM command_receipts WHERE command_key IN (?,?,?,?,?,?)',
      [commandKey, transitionKey, conversionKey, ...requirementKeys],
    );
    await connection.execute(
      'DELETE FROM command_receipts WHERE command_key=?',
      [keepOnlyCommandKey],
    );
    if (originalTranscriptionEnabled !== undefined)
      await connection.execute(
        'UPDATE processing_settings SET transcription_enabled=? WHERE id=1',
        [originalTranscriptionEnabled],
      );
    if (entryId) {
      await connection.execute('UPDATE entries SET task_id=NULL WHERE id=?', [
        entryId,
      ]);
      for (const taskId of taskIds) {
        await connection.execute(
          'UPDATE tasks SET source_entry_id=NULL WHERE id=?',
          [taskId],
        );
        await connection.execute(
          'DELETE FROM activity_events WHERE task_id=?',
          [taskId],
        );
        await connection.execute('DELETE FROM tasks WHERE id=?', [taskId]);
      }
      await connection.execute('DELETE FROM activity_events WHERE entry_id=?', [
        entryId,
      ]);
      await connection.execute(
        'DELETE FROM processing_jobs WHERE attachment_id IN (SELECT id FROM attachments WHERE entry_id=?)',
        [entryId],
      );
      await connection.execute('DELETE FROM attachments WHERE entry_id=?', [
        entryId,
      ]);
      await connection.execute('DELETE FROM entries WHERE id=?', [entryId]);
    }
    if (keepOnlyEntryId) {
      await connection.execute('DELETE FROM activity_events WHERE entry_id=?', [
        keepOnlyEntryId,
      ]);
      await connection.execute(
        'DELETE FROM processing_jobs WHERE attachment_id IN (SELECT id FROM attachments WHERE entry_id=?)',
        [keepOnlyEntryId],
      );
      await connection.execute('DELETE FROM attachments WHERE entry_id=?', [
        keepOnlyEntryId,
      ]);
      await connection.execute('DELETE FROM entries WHERE id=?', [
        keepOnlyEntryId,
      ]);
    }
    for (const requirementEntryId of requirementEntryIds) {
      await connection.execute(
        'DELETE FROM entry_supersessions WHERE older_entry_id=? OR newer_entry_id=?',
        [requirementEntryId, requirementEntryId],
      );
      await connection.execute('DELETE FROM activity_events WHERE entry_id=?', [
        requirementEntryId,
      ]);
      await connection.execute('DELETE FROM entries WHERE id=?', [
        requirementEntryId,
      ]);
    }
    await connection.execute(
      `DELETE FROM projects WHERE id IN (${paginationProjectIds.map(() => '?').join(',')})`,
      paginationProjectIds,
    );
    const [remainingPaginationProjects] = await connection.query<
      mysql.RowDataPacket[]
    >(
      `SELECT COUNT(*) AS count FROM projects WHERE id IN (${paginationProjectIds.map(() => '?').join(',')})`,
      paginationProjectIds,
    );
    assert.equal(Number(remainingPaginationProjects[0].count), 0);
    if (otherProjectId)
      await connection.execute('DELETE FROM projects WHERE id=?', [
        otherProjectId,
      ]);
    if (projectId)
      await connection.execute('DELETE FROM projects WHERE id=?', [projectId]);
    if (personId)
      await connection.execute('DELETE FROM people WHERE id=?', [personId]);
    if (teamId)
      await connection.execute('DELETE FROM teams WHERE id=?', [teamId]);
    await connection.execute('DELETE FROM sessions WHERE id=?', [sessionId]);
    await connection.end();
    const storageRoot = resolve(
      process.env.PRIVATE_STORAGE_ROOT ?? './storage/private',
    );
    await Promise.all(
      storageKeys.map((key) =>
        unlink(resolve(storageRoot, key)).catch(() => undefined),
      ),
    );
  }
}

void main();
