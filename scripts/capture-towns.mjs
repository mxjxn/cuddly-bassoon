import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('screenshots', { recursive: true });
mkdirSync('/opt/cursor/artifacts', { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SEED = 'land2';
const types = ['commons', 'company-town', 'freeport', 'guild-city', 'failed-charter'];

const browser = await chromium.launch({ headless: true });

async function capture(url, outPath, waitTown) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  console.log('→', url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });

  // Wait for playing UI
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
      console.error('FAILED to enter town view for', url);
      await page.screenshot({ path: outPath.replace('.png', '-FAILED.png') });
      await page.close();
      return false;
    }
    await sleep(1500); // let a few animation frames paint
  }

  await page.screenshot({ path: outPath });
  console.log('saved', outPath);
  await page.close();
  return true;
}

// World map (no site zoom)
await capture(
  `http://127.0.0.1:5173/?seed=${SEED}`,
  'screenshots/01-world-map.png',
  false
);

for (const type of types) {
  const file = `screenshots/02-${type}.png`;
  await capture(
    `http://127.0.0.1:5173/?seed=${SEED}&site=${type}`,
    file,
    true
  );
}

// Copy to artifacts
import { copyFileSync } from 'fs';
for (const type of ['world-map', ...types.map(t => t)]) {
  const src = type === 'world-map' ? 'screenshots/01-world-map.png' : `screenshots/02-${type}.png`;
  const dst = `/opt/cursor/artifacts/${type === 'world-map' ? '01-world-map' : '02-' + type}.png`;
  try {
    copyFileSync(src, dst);
    console.log('artifact', dst);
  } catch (e) {
    console.warn('copy failed', src, e.message);
  }
}

await browser.close();
console.log('done');
