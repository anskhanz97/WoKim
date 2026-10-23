const { chromium } = require('playwright');
const mysql = require('mysql2/promise');
const { config } = require('dotenv');
const { createHash, randomBytes, randomUUID } = require('node:crypto');
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');

config({ path: resolve(__dirname, '..', '..', '..', '.env'), quiet: true });

async function main() {
  const database = await mysql.createConnection({
    host: '127.0.0.1', port: 3308, database: 'wokim_showcase',
    user: 'root', password: process.env.DB_PASSWORD,
  });
  const sessionId = randomUUID();
  const secret = randomBytes(32).toString('base64url');
  const [[owner], [project], [entry]] = await Promise.all([
    database.query('SELECT id FROM users LIMIT 1').then(([rows]) => rows),
    database.query("SELECT id FROM projects WHERE name='XEPOS Loyalty Sync' LIMIT 1").then(([rows]) => rows),
    database.query("SELECT id FROM entries WHERE title='Customer list sync anomaly' LIMIT 1").then(([rows]) => rows),
  ]);
  await database.execute(
    "INSERT INTO sessions (id,user_id,token_hash,created_at,last_seen_at,expires_at,device_label) VALUES (?,?,?,NOW(3),NOW(3),DATE_ADD(NOW(3),INTERVAL 1 HOUR),'Showcase smoke')",
    [sessionId, owner.id, createHash('sha256').update(secret).digest()],
  );
  const output = resolve(__dirname, '..', '..', '..', 'storage', 'reports', 'showcase');
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  try {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'phone', width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      await context.addCookies([{ name: 'wm_session', value: secret, url: 'http://localhost:4300' }]);
      const page = await context.newPage();
      const errors = [];
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      for (const route of [
        { path: '/today', name: 'today' },
        { path: '/projects', name: 'projects' },
        { path: `/projects/${project.id}/evidence`, name: 'evidence' },
        { path: `/entries/${entry.id}`, name: 'entry' },
      ]) {
        await page.goto(`http://localhost:4300${route.path}`);
        await page.waitForLoadState('networkidle');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 1) {
          const overflowing = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 8).map((element) => ({ tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 80), right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width) })));
          throw new Error(`${viewport.name} ${route.path}: ${overflow}px overflow ${JSON.stringify(overflowing)}`);
        }
        if (route.name === 'evidence') {
          await page.getByText('Loyalty state reconciliation').waitFor();
          const evidenceImages = await page.locator('img').evaluateAll((images) => images.map((image) => ({ width: image.naturalWidth, complete: image.complete })));
          if (!evidenceImages.length || evidenceImages.some((item) => !item.complete || item.width === 0)) throw new Error('Showcase evidence image did not load.');
        }
        await page.screenshot({ path: resolve(output, `${route.name}-${viewport.name}.png`), fullPage: route.name !== 'entry' });
      }
      if (errors.length) throw new Error(errors.join(' | '));
      await context.close();
    }
    console.log(`Showcase browser smoke passed; screenshots are under ${output}.`);
  } finally {
    await browser.close();
    await database.execute('DELETE FROM sessions WHERE id=?', [sessionId]);
    await database.end();
  }
}

void main();
