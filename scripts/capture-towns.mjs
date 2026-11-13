import { chromium } from 'playwright';
import { mkdirSync, copyFileSync } from 'fs';

mkdirSync('screenshots', { recursive: true });
mkdirSync('/opt/cursor/artifacts', { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SEED = 'land2';

// Requested: commons, failed-charter, freeport, company-town, plus mountain/hill site
const shots = [
  { key: 'world-map', url: `http://127.0.0.1:5173/?seed=${SEED}`, waitTown: false, file: 'screenshots/01-world-map.png' },
  { key: 'commons', url: `http://127.0.0.1:5173/?seed=${SEED}&site=commons`, waitTown: true, file: 'screenshots/02-commons.png' },
  { key: 'failed-charter', url: `http://127.0.0.1:5173/?seed=${SEED}&site=failed-charter`, waitTown: true, file: 'screenshots/02-failed-charter.png' },
  { key: 'freeport', url: `http://127.0.0.1:5173/?seed=${SEED}&site=freeport`, waitTown: true, file: 'screenshots/02-freeport.png' },
  { key: 'company-town', url: `http://127.0.0.1:5173/?seed=${SEED}&site=company-town`, waitTown: true, file: 'screenshots/02-company-town.png' },
  // Explicit mountain site (Factorytown)
  { key: 'mountains', url: `http://127.0.0.1:5173/?seed=${SEED}&site=site-0`, waitTown: true, file: 'screenshots/02-mountains-company.png' },
];

const browser = await chromium.launch({ headless: true });

async function capture({ url, waitTown, file }) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  console.log('→', url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('.game-container', { timeout: 120000 });
  await sleep(waitTown ? 14000 : 12000);

  if (waitTown) {
    let ok = false;
    for (let i = 0; i < 50; i++) {
      ok = await page.evaluate(() => document.querySelector('.hud')?.textContent?.includes('Town:') ?? false);
      if (ok) break;
      await sleep(400);
    }
    if (!ok) {
      console.error('FAILED town view', url);
      await page.screenshot({ path: file.replace('.png', '-FAILED.png') });
      await page.close();
      return false;
    }
    await sleep(1800);
  }

  await page.screenshot({ path: file });
  console.log('saved', file);
  await page.close();
  return true;
}

for (const shot of shots) {
  await capture(shot);
  const base = shot.file.split('/').pop();
  try {
    copyFileSync(shot.file, `/opt/cursor/artifacts/${base}`);
    console.log('artifact', base);
  } catch (e) {
    console.warn('artifact copy failed', e.message);
  }
}

await browser.close();
console.log('done');
