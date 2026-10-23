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
  const [[owner], [project], [entry], [activityDay]] = await Promise.all([
    database.query('SELECT id FROM users LIMIT 1').then(([rows]) => rows),
    database.query("SELECT id FROM projects WHERE name='XEPOS Loyalty Sync' LIMIT 1").then(([rows]) => rows),
    database.query("SELECT id FROM entries WHERE title='Customer list sync anomaly' LIMIT 1").then(([rows]) => rows),
    database.query("SELECT DATE_FORMAT(MAX(created_at),'%Y-%m-%d') AS localDate FROM activity_events").then(([rows]) => rows),
  ]);
  await database.execute(
    "INSERT INTO sessions (id,user_id,token_hash,created_at,last_seen_at,expires_at,device_label) VALUES (?,?,?,NOW(3),NOW(3),DATE_ADD(NOW(3),INTERVAL 1 HOUR),'Showcase smoke')",
    [sessionId, owner.id, createHash('sha256').update(secret).digest()],
  );
  const output = resolve(__dirname, '..', '..', '..', 'storage', 'reports', 'showcase');
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  try {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 820, height: 1080 }, { name: 'phone', width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      await context.addCookies([{ name: 'wm_session', value: secret, url: 'http://localhost:4300' }]);
      const page = await context.newPage();
      const errors = [];
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      for (const route of [
        { path: '/today', name: 'today' },
        { path: '/projects', name: 'projects' },
        { path: '/all-projects', name: 'all-projects' },
        { path: `/projects/${project.id}/people`, name: 'people' },
        { path: `/projects/${project.id}/history`, name: 'history' },
        { path: `/projects/${project.id}/evidence`, name: 'evidence' },
        { path: `/entries/${entry.id}`, name: 'entry' },
        { path: `/check-ins/${activityDay.localDate}`, name: 'historic-day' },
      ].filter((route) => viewport.name !== 'tablet' || route.name === 'all-projects')) {
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
        if (route.name === 'projects') {
          const projectCard = page.locator('.project-card').first();
          await projectCard.locator('summary', { hasText: 'More actions' }).click();
          const menu = projectCard.locator('.action-menu');
          await menu.waitFor();
          const menuIsTopmost = await menu.evaluate((element) => {
            const box = element.getBoundingClientRect();
            const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            return Boolean(hit && element.contains(hit));
          });
          if (!menuIsTopmost) throw new Error(`${viewport.name}: project action menu is covered by another card.`);
          await page.screenshot({ path: resolve(output, `projects-menu-${viewport.name}.png`) });
          await menu.getByRole('link', { name: 'Manage people & teams' }).click();
          await page.waitForURL(/\/projects\/[^/]+\/people$/);
        }
        if (route.name === 'all-projects') {
          if (!page.url().endsWith('/all-projects')) throw new Error(`${viewport.name}: /all-projects did not remain addressable.`);
          await page.locator('.project-bubble').first().waitFor();
          await page.waitForFunction(() => [...document.querySelectorAll('.project-bubble')].every((element) => parseFloat(element.style.getPropertyValue('--bubble-size')) > 20));
          await page.mouse.move(0, 0);
          await page.waitForTimeout(1200);
          const bubbleCount = await page.locator('.project-bubble').count();
          if (bubbleCount < 2) throw new Error(`${viewport.name}: expected seeded projects in bubble view.`);
          const bubbles = await page.locator('.project-bubble').evaluateAll((elements) => elements.map((element) => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return { x, y, width, height, size: element.style.getPropertyValue('--bubble-size'), box: getComputedStyle(element).boxSizing };
          }));
          const fieldBounds = await page.locator('.bubble-field').boundingBox();
          if (bubbles.some((bubble) => bubble.x < fieldBounds.x - 1 || bubble.y < fieldBounds.y - 1 || bubble.x + bubble.width > fieldBounds.x + fieldBounds.width + 1 || bubble.y + bubble.height > fieldBounds.y + fieldBounds.height + 1)) {
            throw new Error(`${viewport.name}: bubble exceeds field: ${JSON.stringify({ fieldBounds, bubbles })}`);
          }
          for (let left = 0; left < bubbles.length; left += 1) {
            for (let right = left + 1; right < bubbles.length; right += 1) {
              const a = bubbles[left], b = bubbles[right];
              const distance = Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2);
              if (distance + 1 < (a.width + b.width) / 2) throw new Error(`${viewport.name}: project bubbles overlap: ${JSON.stringify({ left, right, distance, required: (a.width + b.width) / 2, a, b })}`);
            }
          }
          await page.screenshot({ path: resolve(output, `all-projects-bubbles-${viewport.name}.png`) });
          if (viewport.name === 'desktop') {
            if (await page.locator('.shell.is-collapsed, .shell.is-hidden').count()) throw new Error('Sidebar did not default to expanded.');
            await page.getByRole('button', { name: 'Collapse sidebar' }).click();
            await page.locator('.shell.is-collapsed').waitFor();
            await page.waitForTimeout(400);
            if ((await page.locator('.rail').boundingBox()).width > 90 || await page.locator('.rail .nav-label').first().isVisible()) throw new Error('Collapsed sidebar did not become an icon rail.');
            await page.screenshot({ path: resolve(output, 'all-projects-collapsed-desktop.png') });
            await page.getByRole('button', { name: 'Expand sidebar' }).click();
            await page.waitForFunction(() => !document.querySelector('.shell')?.classList.contains('is-collapsed'));
            await page.getByRole('button', { name: 'Hide sidebar' }).click();
            await page.locator('.shell.is-hidden').waitFor();
            await page.waitForTimeout(400);
            if (await page.locator('.rail').isVisible()) throw new Error('Atlas sidebar was not fully hidden.');
            if ((await page.locator('.bubble-field').boundingBox()).width < viewport.width - 2) throw new Error('Bubble field did not fill the freed sidebar space.');
            await page.screenshot({ path: resolve(output, 'all-projects-hidden-desktop.png') });
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => !document.querySelector('.shell')?.classList.contains('is-hidden'));
            await page.getByRole('button', { name: 'Hide sidebar' }).click();
            await page.getByRole('button', { name: 'Show sidebar' }).click();
            await page.getByRole('button', { name: 'Activity', exact: true }).click();
            await page.getByText('sized by activity').waitFor();
            await page.getByRole('button', { name: 'Tasks', exact: true }).click();
            await page.getByRole('textbox', { name: 'Search projects' }).fill('Learning Atlas');
            await page.waitForFunction(() => document.querySelectorAll('.project-bubble').length === 1);
            await page.getByRole('textbox', { name: 'Search projects' }).fill('');
            await page.locator('.filter-menu summary').click();
            await page.locator('.filter-menu button', { hasText: 'completed' }).click();
            await page.getByRole('heading', { name: 'No projects match' }).waitFor();
            await page.locator('.filter-menu button', { hasText: 'all' }).click();
          }
          await page.getByRole('button', { name: 'List view' }).click();
          await page.locator('.project-list tbody tr').first().waitFor();
          if (await page.locator('.project-list tbody tr').count() !== bubbleCount) throw new Error(`${viewport.name}: list and bubble views disagree.`);
          await page.screenshot({ path: resolve(output, `all-projects-list-${viewport.name}.png`) });
          await page.getByRole('button', { name: 'Bubble view' }).click();
          if (viewport.name === 'desktop') await page.getByRole('button', { name: 'Hide sidebar' }).click();
          await page.locator('.project-bubble').first().click();
          await page.waitForURL(/\/projects\/[^/]+\/overview$/);
          if (viewport.name === 'desktop') await page.waitForFunction(() => !document.querySelector('.shell')?.classList.contains('is-hidden'));
          await page.goBack();
          await page.locator('.project-bubble').first().waitFor();
        }
        if (route.name === 'people') {
          const radii = await page.locator('.association-controls input, .association-controls select').evaluateAll((elements) => elements.map((element) => Number.parseFloat(getComputedStyle(element).borderRadius)));
          if (!radii.length || radii.some((radius) => radius < 10)) throw new Error(`${viewport.name}: people controls are not using the rounded theme.`);
        }
        if (route.name === 'history') {
          await page.getByText('Entry Captured', { exact: true }).waitFor();
          await page.locator('.timeline').waitFor();
        }
        if (route.name === 'entry') {
          await page.locator('.file-drop').waitFor();
          const nativePickerVisible = await page.locator('.file-drop input[type=file]').evaluate((element) => getComputedStyle(element).clipPath !== 'inset(50%)');
          if (nativePickerVisible) throw new Error(`${viewport.name}: native file input is still visually exposed.`);
        }
        if (route.name === 'historic-day') {
          await page.getByRole('heading', { name: 'The work trail for this day' }).waitFor();
          await page.locator('.day-event').first().waitFor();
          const taskButton = page.getByRole('button', { name: 'View task details' }).first();
          if (await taskButton.count()) {
            await taskButton.click();
            await page.locator('dialog[open]').waitFor();
            await page.getByRole('button', { name: 'Close task details' }).click();
          }
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
