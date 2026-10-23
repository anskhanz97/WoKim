const { config } = require('dotenv');
const mysql = require('mysql2/promise');
const { spawnSync } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const { copyFile, mkdir, readFile, rm, stat, writeFile } = require('node:fs/promises');
const { extname, resolve } = require('node:path');
const sharp = require('sharp');

config({ path: resolve(__dirname, '..', '..', '..', '.env'), quiet: true });

const SOURCE_DATABASE = process.env.DB_NAME || 'wokim';
const TARGET_DATABASE = 'wokim_showcase';
const ROOT = resolve(__dirname, '..', '..', '..');
const STORAGE_ROOT = resolve(ROOT, 'storage', 'showcase', 'private');
const DATABASE_ROOT = resolve(ROOT, 'storage', 'showcase-mariadb');
const DATABASE_TEMP = resolve(ROOT, 'storage', 'tmp', 'showcase-mariadb');
const SHOWCASE_PORT = 3308;
const DOWNLOADS = 'C:\\Users\\Dell\\Downloads';

const id = () => randomUUID();
const date = (offset) => {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
};

const wait = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function canConnect(options) {
  try {
    const connection = await mysql.createConnection(options);
    await connection.end();
    return true;
  } catch {
    return false;
  }
}

async function ensureShowcaseServer(password) {
  const options = { host: '127.0.0.1', port: SHOWCASE_PORT, user: 'root', password };
  if (await canConnect(options)) return options;
  const server = 'C:\\xampp\\mysql\\bin\\mysqld.exe';
  const installer = 'C:\\xampp\\mysql\\bin\\mysql_install_db.exe';
  await mkdir(DATABASE_ROOT, { recursive: true });
  await mkdir(DATABASE_TEMP, { recursive: true });
  try {
    await stat(resolve(DATABASE_ROOT, 'mysql'));
  } catch {
    const initialized = spawnSync(installer, [
      `--datadir=${DATABASE_ROOT}`,
      `--password=${password}`,
      `--port=${SHOWCASE_PORT}`,
      '--allow-remote-root-access',
    ], { cwd: ROOT, stdio: 'inherit' });
    if (initialized.status !== 0) throw new Error('Could not initialize the D-drive showcase database.');
  }
  const configuration = resolve(DATABASE_ROOT, 'my.ini');
  await writeFile(configuration, `[mysqld]\ndatadir=${DATABASE_ROOT.replaceAll('\\', '/')}\ntmpdir=${DATABASE_TEMP.replaceAll('\\', '/')}\nport=${SHOWCASE_PORT}\nbind-address=127.0.0.1\n[client]\nport=${SHOWCASE_PORT}\n`, 'utf8');
  const processHandle = require('node:child_process').spawn(server, [
    `--defaults-file=${configuration}`,
    `--datadir=${DATABASE_ROOT}`,
    `--tmpdir=${DATABASE_TEMP}`,
    `--port=${SHOWCASE_PORT}`,
    '--bind-address=127.0.0.1',
    `--log-error=${resolve(ROOT, 'storage', 'showcase-mariadb.err')}`,
  ], { cwd: ROOT, detached: true, windowsHide: true, stdio: 'ignore' });
  processHandle.unref();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await wait(500);
    if (await canConnect(options)) return options;
  }
  throw new Error('Showcase MariaDB did not become ready on port 3308.');
}

async function insert(connection, table, row) {
  await connection.query(`INSERT INTO \`${table}\` SET ?`, row);
}

async function addAttachment(connection, entryId, filename, purpose, caption, ocrText) {
  const attachmentId = id();
  const source = resolve(DOWNLOADS, filename);
  const extension = extname(filename).toLowerCase();
  const storageKey = `originals/${attachmentId}${extension}`;
  const thumbnailKey = `thumbnails/${attachmentId}.webp`;
  const target = resolve(STORAGE_ROOT, storageKey);
  await mkdir(resolve(STORAGE_ROOT, 'originals'), { recursive: true });
  await mkdir(resolve(STORAGE_ROOT, 'thumbnails'), { recursive: true });
  await copyFile(source, target);
  await sharp(source).rotate().resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 82 }).toFile(resolve(STORAGE_ROOT, thumbnailKey));
  const [metadata, file] = await Promise.all([sharp(source).metadata(), stat(source)]);
  const bytes = await readFile(source);
  await insert(connection, 'attachments', {
    id: attachmentId,
    entry_id: entryId,
    original_name: filename,
    storage_key: storageKey,
    mime_type: extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png',
    byte_size: file.size,
    sha256: createHash('sha256').update(bytes).digest(),
    purpose,
    caption,
    media_state: 'ready',
    ocr_enabled: 1,
    width: metadata.width,
    height: metadata.height,
    thumbnail_key: thumbnailKey,
  });
  await insert(connection, 'derived_texts', {
    id: id(),
    attachment_id: attachmentId,
    kind: 'ocr',
    revision_no: 1,
    machine_text: ocrText,
    reviewed_text: ocrText,
    search_text: ocrText,
    language: 'eng',
    model_id: 'showcase-reviewed-fixture',
    segments: JSON.stringify([]),
    is_current: 1,
  });
  return attachmentId;
}

async function main() {
  if (SOURCE_DATABASE === TARGET_DATABASE) throw new Error('Refusing to replace the live database.');
  const sourceBase = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  };
  const showcaseBase = await ensureShowcaseServer(process.env.DB_PASSWORD);
  const admin = await mysql.createConnection(showcaseBase);
  await admin.query(`DROP DATABASE IF EXISTS \`${TARGET_DATABASE}\``);
  await admin.query(`CREATE DATABASE \`${TARGET_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();

  await rm(resolve(ROOT, 'storage', 'showcase'), { recursive: true, force: true });
  await mkdir(STORAGE_ROOT, { recursive: true });

  const migration = spawnSync(
    process.execPath,
    [resolve(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'), resolve(ROOT, 'apps', 'api', 'src', 'database', 'run-migrations.ts')],
    {
      cwd: resolve(ROOT, 'apps', 'api'),
      env: { ...process.env, DB_HOST: '127.0.0.1', DB_PORT: String(SHOWCASE_PORT), DB_USER: 'root', DB_NAME: TARGET_DATABASE, PRIVATE_STORAGE_ROOT: STORAGE_ROOT },
      stdio: 'inherit',
    },
  );
  if (migration.status !== 0) throw new Error(`Showcase migrations failed: ${migration.error?.message || `exit ${migration.status}`}`);

  const source = await mysql.createConnection({ ...sourceBase, database: SOURCE_DATABASE });
  const target = await mysql.createConnection({ ...showcaseBase, database: TARGET_DATABASE });
  const [users] = await source.query('SELECT * FROM users ORDER BY id LIMIT 1');
  if (!users.length) throw new Error('Bootstrap the live owner before creating the showcase.');
  const owner = { ...users[0], active_focus_session_id: null, focus_version: 0 };
  await target.query('INSERT INTO users SET ?', owner);
  const [sessions] = await source.query('SELECT * FROM sessions WHERE revoked_at IS NULL AND expires_at > NOW(3)');
  for (const session of sessions) await target.query('INSERT INTO sessions SET ?', session);

  const people = [
    { id: id(), display_name: 'Maya Chen', email: 'maya.chen@example.test', handle: '@maya', notes: 'Product designer; sharp on workflows and accessibility.' },
    { id: id(), display_name: 'Ibrahim Khan', email: 'ibrahim.khan@example.test', handle: '@ibrahim', notes: 'Backend engineer; owns sync and data integrity.' },
    { id: id(), display_name: 'Zoya Ahmed', email: 'zoya.ahmed@example.test', handle: '@zoya', notes: 'QA lead; translates edge cases into reproducible scenarios.' },
    { id: id(), display_name: 'Marcus Reed', email: 'marcus.reed@example.test', handle: '@marcus', notes: 'Client operations lead for the retail rollout.' },
    { id: id(), display_name: 'Anaya Silva', email: 'anaya.silva@example.test', handle: '@anaya', notes: 'Mobile engineer supporting the loyalty experience.' },
  ];
  for (const person of people) await insert(target, 'people', person);

  const teams = [
    { id: id(), name: 'Product Studio', notes: 'Design, frontend, and product decisions.' },
    { id: id(), name: 'Platform Crew', notes: 'APIs, sync, data processing, and quality.' },
    { id: id(), name: 'Retail Launch', notes: 'Client-facing rollout team.' },
  ];
  for (const team of teams) await insert(target, 'teams', team);
  for (const link of [
    [people[0].id, teams[0].id, 'Product designer'], [people[4].id, teams[0].id, 'Mobile engineer'],
    [people[1].id, teams[1].id, 'Backend engineer'], [people[2].id, teams[1].id, 'QA lead'],
    [people[2].id, teams[2].id, 'Quality owner'], [people[3].id, teams[2].id, 'Client lead'], [people[4].id, teams[2].id, 'App owner'],
  ]) await insert(target, 'person_teams', { person_id: link[0], team_id: link[1], role_label: link[2] });

  const projects = [
    { id: id(), name: 'WoKim Product Evolution', description: 'Turn the private work-memory prototype into a daily workspace people genuinely want to open.', status: 'active', target_date: date(21), repository_url: 'https://example.test/wokim' },
    { id: id(), name: 'XEPOS Loyalty Sync', description: 'Resolve customer loyalty registration and till synchronization across the retail estate.', status: 'active', target_date: date(7), repository_url: 'https://example.test/xepos-loyalty' },
    { id: id(), name: 'Retail Insights Dashboard', description: 'A decision-ready performance view for multi-location operators.', status: 'active', target_date: date(35), repository_url: 'https://example.test/retail-insights' },
    { id: id(), name: 'Learning Atlas', description: 'Curated technical learning paths with source quality and progress notes.', status: 'active', target_date: date(60), repository_url: null },
  ];
  for (const project of projects) await insert(target, 'projects', project);
  const projectPeople = [
    [0,0,'Product design'],[0,1,'Architecture'],[0,2,'Quality'],[0,4,'Mobile review'],
    [1,1,'Sync API'],[1,2,'QA lead'],[1,3,'Client owner'],[1,4,'Mobile integration'],
    [2,0,'Experience design'],[2,1,'Data services'],[2,3,'Stakeholder'],
    [3,0,'Learning experience'],
  ];
  for (const [projectIndex, personIndex, role] of projectPeople) await insert(target, 'project_people', { project_id: projects[projectIndex].id, person_id: people[personIndex].id, role_label: role });
  for (const [projectIndex, teamIndex] of [[0,0],[0,1],[1,1],[1,2],[2,0],[2,1],[3,0]]) await insert(target, 'project_teams', { project_id: projects[projectIndex].id, team_id: teams[teamIndex].id });

  const tasks = [
    { id:id(), project_id:projects[0].id, title:'Ship the Work Constellation interface', description:'Apply the new dimensional visual language without losing speed or accessibility.', type:'feature', status:'in_progress', priority:'urgent', requested_by_person_id:people[0].id, next_action:'Review the populated Today screen and tune any weak empty states.', branch_name:'codex/work-constellation', links:JSON.stringify([{kind:'design',label:'Visual direction',url:'https://example.test/design/work-constellation'}]), deadline_kind:'hard', due_date:date(2) },
    { id:id(), project_id:projects[0].id, title:'Validate mobile capture ergonomics', description:'Test thumb reach, recording, attachment review, and focus restoration.', type:'testing', status:'ready', priority:'high', requested_by_person_id:people[2].id, next_action:'Run the capture flow on the 390px viewport and record friction.', deadline_kind:'target', due_date:date(4) },
    { id:id(), project_id:projects[1].id, title:'Fix loyalty registration state mismatch', description:'A customer can exist at till level while cloud loyalty registration remains incomplete.', type:'bug', status:'paused', priority:'urgent', requested_by_person_id:people[3].id, next_action:'Confirm whether till-created customers must be backfilled or explicitly re-registered.', branch_name:'fix/loyalty-reconciliation', deadline_kind:'hard', due_date:date(1) },
    { id:id(), project_id:projects[1].id, title:'Write the three-scenario sync regression pack', description:'Cover unsynced till customer, late loyalty sync, and loyalty-first registration.', type:'testing', status:'waiting', priority:'high', requested_by_person_id:people[2].id, next_action:'Wait for Marcus to confirm expected behavior for scenario one.', deadline_kind:'hard', due_date:date(3) },
    { id:id(), project_id:projects[2].id, title:'Prototype owner performance overview', description:'Turn sales, margin, and location health into a calm daily briefing.', type:'feature', status:'ready', priority:'normal', requested_by_person_id:people[3].id, next_action:'Sketch the first information hierarchy with Maya.', deadline_kind:'target', due_date:date(12) },
    { id:id(), project_id:projects[2].id, title:'Normalize location identifiers', description:'Remove duplicate location keys before joining reporting feeds.', type:'integration', status:'done', priority:'high', requested_by_person_id:people[1].id, next_action:'Monitor the next nightly import.', completed_at:new Date(Date.now()-86400000*2) },
    { id:id(), project_id:projects[3].id, title:'Build a trusted programming curriculum', description:'Convert the source infographic into a short sequence of high-signal courses.', type:'investigation', status:'ready', priority:'low', requested_by_person_id:people[0].id, next_action:'Review the programming and engineering sources, then select the first five.', deadline_kind:'target', due_date:date(25) },
  ];
  for (const task of tasks) await insert(target, 'tasks', task);

  const entries = [
    { id:id(), project_id:projects[0].id, task_id:tasks[0].id, title:'Visual direction: Work Constellation', entry_type:'decision', inbox_state:'organized', source_kind:'typed', content_text:'Use a deep-indigo spatial workspace. Projects are luminous connected systems; evidence and voice notes are visible artifacts. Keep controls familiar, but make the work feel alive.', sender_person_id:people[0].id, occurred_at:new Date(Date.now()-86400000*2), occurred_timezone:'Asia/Karachi' },
    { id:id(), project_id:projects[1].id, task_id:tasks[2].id, title:'Customer list sync anomaly', entry_type:'work_update', inbox_state:'organized', source_kind:'upload', content_text:'The customer list shows repeated till customer ID 10 while loyalty remains blank. Preserve this screenshot as before-state evidence.', sender_person_id:people[3].id, occurred_at:new Date(Date.now()-86400000), occurred_timezone:'Europe/London' },
    { id:id(), project_id:projects[1].id, task_id:tasks[3].id, title:'Loyalty sync scenarios from client', entry_type:'instruction', inbox_state:'organized', source_kind:'upload', content_text:'Cover three registration orderings: till-first without sync, till-first then loyalty sync, and loyalty-first followed by till entry.', sender_person_id:people[3].id, occurred_at:new Date(Date.now()-3600000*10), occurred_timezone:'Europe/London' },
    { id:id(), project_id:projects[3].id, task_id:tasks[6].id, title:'High-signal learning sources', entry_type:'reference', inbox_state:'organized', source_kind:'upload', content_text:'Reference map of science, engineering, programming, design, and personal-development channels.', sender_person_id:people[0].id, occurred_at:new Date(Date.now()-86400000*4), occurred_timezone:'Asia/Karachi' },
    { id:id(), project_id:null, task_id:null, title:'Idea: weekly evidence digest', entry_type:'note', inbox_state:'unprocessed', source_kind:'typed', content_text:'What if Friday review automatically grouped before/after evidence, resolved questions, and decisions made this week?', sender_person_id:null, occurred_at:new Date(), occurred_timezone:'Asia/Karachi' },
    { id:id(), project_id:projects[2].id, task_id:tasks[4].id, title:'Dashboard briefing should answer “where do I look?”', entry_type:'question', inbox_state:'organized', source_kind:'typed', content_text:'Can the opening view explain what changed, what needs attention, and why—without forcing the owner to scan a table?', sender_person_id:people[0].id, occurred_at:new Date(Date.now()-86400000*3), occurred_timezone:'Asia/Karachi' },
  ];
  for (const entry of entries) await insert(target, 'entries', entry);
  await target.query('UPDATE tasks SET source_entry_id=? WHERE id=?', [entries[1].id, tasks[2].id]);
  await target.query('UPDATE tasks SET source_entry_id=? WHERE id=?', [entries[2].id, tasks[3].id]);
  await target.query('UPDATE tasks SET source_entry_id=? WHERE id=?', [entries[3].id, tasks[6].id]);

  const customerList = await addAttachment(target, entries[1].id, 'image.png', 'evidence_before', 'Before: customer list shows loyalty missing after till sync.', 'CUSTOMERS CUSTOMER LIST. SYNC. CUSTOMER ID 10. LOYALTY values are blank for multiple customers including ASSTA, Bridge, Defibshop, E.L.A., EMR, Entec, GAR007, Innovations, Jasper\'s, and KwikFlow.');
  const clientMessage = await addAttachment(target, entries[2].id, 'image (1).png', 'instruction', 'Client message defining the three loyalty registration scenarios.', 'Cover these scenarios: 1 customer is registered at the till but loyalty has not synced; 2 customer exists at till, then loyalty is registered and synced; 3 loyalty is registered first, then the customer enters at till—the opposite of case 1.');
  await addAttachment(target, entries[3].id, '8434.jpg', 'reference', 'Reference map for a trusted learning curriculum.', 'Top 100 YouTube channels grouped by science, technology, engineering, programming, design, mathematics, and personal development.');

  const evidenceSet = { id:id(), task_id:tasks[2].id, title:'Loyalty state reconciliation', notes:'Compare the current broken state with the expected registration behavior from the client brief.' };
  await insert(target, 'evidence_sets', evidenceSet);
  await insert(target, 'evidence_items', { id:id(), evidence_set_id:evidenceSet.id, attachment_id:customerList, side:'before', caption:'Till records are present while loyalty is blank.', viewport_label:'Desktop · customer list', captured_at:new Date(Date.now()-86400000), sort_order:0 });
  await insert(target, 'evidence_items', { id:id(), evidence_set_id:evidenceSet.id, attachment_id:clientMessage, side:'reference', caption:'Expected registration scenarios from the client.', viewport_label:'Mobile message', captured_at:new Date(Date.now()-3600000*10), sort_order:1 });

  const followUps = [
    { id:id(), project_id:projects[1].id, task_id:tasks[3].id, person_id:people[3].id, source_entry_id:entries[2].id, question:'For scenario one, should the system backfill loyalty automatically or prompt staff to re-register?', status:'waiting', follow_up_on:date(1) },
    { id:id(), project_id:projects[2].id, task_id:tasks[4].id, person_id:people[0].id, source_entry_id:entries[5].id, question:'Which three metrics deserve the highest visual weight on opening?', status:'waiting', follow_up_on:date(5) },
    { id:id(), project_id:projects[0].id, task_id:tasks[0].id, person_id:people[2].id, source_entry_id:entries[0].id, question:'Did the mobile capture dialog retain keyboard focus after closing?', status:'answered', follow_up_on:date(-1), resolution:'Yes—verified at desktop, phone, and landscape widths.', resolved_at:new Date(Date.now()-86400000) },
  ];
  for (const followUp of followUps) await insert(target, 'follow_ups', followUp);

  const checkpoint = { id:id(), project_id:projects[0].id, task_id:tasks[0].id, title:'Resume after responsive QA', entry_type:'checkpoint', inbox_state:'organized', source_kind:'typed', content_text:'Production build is clean and responsive smoke passes. Resume by reviewing populated project cards, then tune the evidence comparison.', occurred_at:new Date(Date.now()-3600000), occurred_timezone:'Asia/Karachi' };
  await insert(target, 'entries', checkpoint);
  const endedFocus = { id:id(), task_id:tasks[0].id, started_at:new Date(Date.now()-3600000*4), ended_at:new Date(Date.now()-3600000), end_reason:'interrupted', checkpoint_entry_id:checkpoint.id };
  await insert(target, 'focus_sessions', endedFocus);
  const activeFocus = { id:id(), task_id:tasks[0].id, started_at:new Date(Date.now()-1800000), ended_at:null, end_reason:null, checkpoint_entry_id:null };
  await insert(target, 'focus_sessions', activeFocus);
  await target.query('UPDATE users SET active_focus_session_id=?, focus_version=1 WHERE id=?', [activeFocus.id, owner.id]);

  const checkIn = { id:id(), local_date:date(0), timezone:'Asia/Karachi', intended_outcome:'Finish the visual redesign and prove it against a realistic working day.', interruption_notes:'Pause only with a checkpoint that explains the exact resume point.', deadline_notes:'Loyalty state mismatch needs a decision tomorrow.', waiting_notes:'Marcus owes the expected behavior for scenario one.', reflection:'The app feels useful when the context—not just the record—is visually obvious.' };
  await insert(target, 'daily_check_ins', checkIn);
  const checkItems = [
    ['current',tasks[0].id,null,null,{title:tasks[0].title,status:'in_progress',project:projects[0].name}],
    ['paused',tasks[2].id,null,null,{title:tasks[2].title,status:'paused',project:projects[1].name}],
    ['due',tasks[3].id,null,null,{title:tasks[3].title,status:'waiting',dueDate:tasks[3].due_date,project:projects[1].name}],
    ['waiting',null,followUps[0].id,null,{question:followUps[0].question,person:'Marcus Reed',project:projects[1].name}],
  ];
  for (const [index,item] of checkItems.entries()) await insert(target, 'daily_check_in_items', { id:id(), check_in_id:checkIn.id, section:item[0], task_id:item[1], follow_up_id:item[2], project_id:item[3], snapshot:JSON.stringify(item[4]), sort_order:index });

  const activities = [
    ['task.started',projects[0].id,tasks[0].id,null,{title:tasks[0].title}],
    ['entry.captured',projects[1].id,tasks[2].id,entries[1].id,{title:entries[1].title}],
    ['task.paused',projects[1].id,tasks[2].id,checkpoint.id,{reason:'Awaiting expected behavior'}],
    ['evidence.created',projects[1].id,tasks[2].id,entries[1].id,{title:evidenceSet.title}],
    ['task.completed',projects[2].id,tasks[5].id,null,{title:tasks[5].title}],
  ];
  for (const [index,event] of activities.entries()) await insert(target, 'activity_events', { id:id(), event_type:event[0], project_id:event[1], task_id:event[2], entry_id:event[3], payload:JSON.stringify(event[4]), created_at:new Date(Date.now()-index*3600000*5) });

  await source.end();
  await target.end();
  console.log(`Showcase ready: ${TARGET_DATABASE}`);
  console.log(`Private files: ${STORAGE_ROOT}`);
  console.log(`Seeded ${projects.length} projects, ${tasks.length} tasks, ${people.length} people, ${entries.length + 1} entries, and 3 OCR-ready images.`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
