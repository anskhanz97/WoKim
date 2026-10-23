const { chromium } = require('playwright');
const mysql = require('mysql2/promise');
const { config } = require('dotenv');
const { createHash, randomBytes, randomUUID } = require('node:crypto');
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');

config({ path: resolve(__dirname, '..', '..', '..', '.env'), quiet: true });

async function main() {
  const database = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  const sessionId = randomUUID();
  const secret = randomBytes(32).toString('base64url');
  const projectId = randomUUID();
  const personId = randomUUID();
  const taskId = randomUUID();
  const entryId = randomUUID();
  const evidenceSetId = randomUUID();
  const [owners] = await database.query('SELECT id FROM users LIMIT 1');
  await database.execute(
    "INSERT INTO sessions (id,user_id,token_hash,created_at,last_seen_at,expires_at,revoked_at,device_label) VALUES (?,?,?,NOW(3),NOW(3),DATE_ADD(NOW(3),INTERVAL 1 HOUR),NULL,'Responsive smoke')",
    [sessionId, owners[0].id, createHash('sha256').update(secret).digest()],
  );
  await database.execute(
    "INSERT INTO projects (id,name,description,status) VALUES (?,'Responsive fixture','Removed after the browser smoke.','active')",
    [projectId],
  );
  await database.execute(
    "INSERT INTO people (id,display_name,email,handle,notes) VALUES (?,'Ada Fixture','ada.fixture@example.test','@ada-fixture','Browser smoke contact')",
    [personId],
  );
  await database.execute(
    "INSERT INTO project_people (project_id,person_id,role_label) VALUES (?,?,'Reviewer')",
    [projectId, personId],
  );
  await database.execute(
    "INSERT INTO tasks (id,project_id,title,type,status,priority) VALUES (?,?,'Responsive evidence fixture','testing','ready','normal')",
    [taskId, projectId],
  );
  await database.execute(
    "INSERT INTO entries (id,project_id,task_id,title,entry_type,inbox_state,source_kind,content_text,sender_person_id) VALUES (?,?,?,'Responsive source fixture','note','organized','typed','A fictional source note for responsive verification.',?)",
    [entryId, projectId, taskId, personId],
  );
  await database.execute(
    "INSERT INTO evidence_sets (id,task_id,title,notes) VALUES (?,?,'Responsive comparison','Empty images are intentional in this smoke.')",
    [evidenceSetId, taskId],
  );
  const output = resolve(__dirname, '..', '..', '..', 'storage', 'reports');
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  const loadMeasurements = [];
  try {
    for (const target of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'phone', width: 390, height: 844 },
      { name: 'phone-landscape', width: 844, height: 390 },
    ]) {
      const context = await browser.newContext({ viewport: target, permissions: ['microphone'] });
      await context.addCookies([{ name: 'wm_session', value: secret, url: 'http://localhost:4200' }]);
      const page = await context.newPage();
      const errors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.goto('http://localhost:4200/today');
      await page.waitForLoadState('networkidle');
      const overlay = page.locator('vite-error-overlay');
      if (await overlay.count()) {
        const detail = await overlay.evaluate((element) => element.shadowRoot?.textContent || element.textContent || 'Unknown development-server error');
        throw new Error(`Development server overlay: ${detail.trim()}`);
      }
      const navigation = await page.evaluate(() => {
        const entry = performance.getEntriesByType('navigation')[0];
        return entry ? { domContentLoadedMs: entry.domContentLoadedEventEnd, loadMs: entry.loadEventEnd } : null;
      });
      loadMeasurements.push({ viewport: target.name, ...navigation });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) throw new Error(`${target.name} has ${overflow}px horizontal overflow.`);
      await page.locator('[data-capture-trigger]:visible').first().click();
      await page.getByLabel(/^Note/).waitFor();
      const recordVoice = page.getByRole('button', { name: 'Record voice' });
      await recordVoice.waitFor();
      await page.waitForTimeout(300);
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('formcontrolname'));
      if (focused !== 'contentText') throw new Error(`${target.name} capture did not receive focus: ${await page.evaluate(() => document.activeElement?.outerHTML)}.`);
      const transcribeChoice = page.locator('input[type="checkbox"][formcontrolname="transcribeAudio"]');
      if (target.name === 'desktop') {
        await recordVoice.click();
        await page.locator('[role="status"]', { hasText: 'Recording…' }).waitFor();
        await page.waitForTimeout(250);
        await page.getByRole('button', { name: 'Stop recording' }).click();
        await page.locator('audio[controls]').waitFor();
        await page.locator('summary', { hasText: 'Organize now' }).click();
        await transcribeChoice.waitFor();
      }
      await page.screenshot({ path: resolve(output, `capture-${target.name}.png`) });
      if (target.name === 'desktop') {
        await transcribeChoice.scrollIntoViewIfNeeded();
        await page.screenshot({ path: resolve(output, `capture-voice-${target.name}.png`) });
        await page.getByRole('button', { name: 'Discard' }).click();
      }
      await page.keyboard.press('Escape');
      await page.getByRole('heading', { name: /drop it into your memory/i }).waitFor({ state: 'detached' });
      await page.waitForTimeout(100);
      const restored = await page.evaluate(() => ({
        active: document.activeElement?.outerHTML,
        triggers: Array.from(document.querySelectorAll('[data-capture-trigger]')).map((element) => ({ html: element.outerHTML, visible: element.getClientRects().length > 0 })),
      }));
      if (!restored.active?.includes('data-capture-trigger')) throw new Error(`${target.name} focus was not restored: ${JSON.stringify(restored)}`);
      await page.goto('http://localhost:4200/settings/data');
      await page.waitForLoadState('networkidle');
      await page.getByRole('heading', { name: 'Private OCR & transcription' }).waitFor();
      for (const route of [
        '/inbox',
        '/projects',
        '/people',
        '/search?q=Responsive',
        `/projects/${projectId}/overview`,
        `/projects/${projectId}/tasks`,
        `/projects/${projectId}/evidence`,
        `/projects/${projectId}/people`,
        `/tasks/${taskId}`,
        `/entries/${entryId}`,
        `/people/${personId}`,
        '/settings/processing',
        '/check-ins/2026-10-21',
      ]) {
        await page.goto(`http://localhost:4200${route}`);
        await page.waitForLoadState('networkidle');
        const routeOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        if (routeOverflow > 1) {
          const overflowing = await page.evaluate(() =>
            Array.from(document.querySelectorAll('body *'))
              .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
              .slice(0, 8)
              .map((element) => ({
                tag: element.tagName,
                className: element.className,
                text: element.textContent?.trim().slice(0, 60),
                href: element.getAttribute('href'),
                right: Math.round(element.getBoundingClientRect().right),
              })),
          );
          throw new Error(`${target.name} ${route} has ${routeOverflow}px horizontal overflow: ${JSON.stringify(overflowing)}`);
        }
        if (route.endsWith('/evidence') && target.name !== 'phone-landscape')
          await page.screenshot({ path: resolve(output, `project-evidence-${target.name}.png`) });
        if (route === `/tasks/${taskId}` && target.name !== 'phone-landscape')
          await page.screenshot({ path: resolve(output, `task-detail-${target.name}.png`) });
      }
      if (target.name !== 'phone-landscape')
        await page.screenshot({ path: resolve(output, `check-in-history-${target.name}.png`), fullPage: true });
      if (errors.length) throw new Error(`${target.name} console errors: ${errors.join(' | ')}`);
      await context.close();
    }
    console.log(`Responsive browser smoke passed; screenshots are under ${output}.`);
    console.log(JSON.stringify({ loadMeasurements }));
  } finally {
    await browser.close();
    await database.execute('DELETE FROM evidence_sets WHERE id=?', [evidenceSetId]);
    await database.execute('DELETE FROM entries WHERE id=?', [entryId]);
    await database.execute('DELETE FROM tasks WHERE id=?', [taskId]);
    await database.execute('DELETE FROM project_people WHERE project_id=?', [projectId]);
    await database.execute('DELETE FROM people WHERE id=?', [personId]);
    await database.execute('DELETE FROM projects WHERE id=?', [projectId]);
    await database.execute('DELETE FROM sessions WHERE id=?', [sessionId]);
    await database.end();
  }
}

void main();
