// Ad-hoc headless smoke check. Usage: node tests/e2e/smoke.mjs
import { chromium } from 'playwright';
const SHOTS = process.env.E2E_SHOTS_DIR || '/tmp/e2e-shots';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://127.0.0.1:40115/', { waitUntil: 'networkidle' });
await page.screenshot({ path: SHOTS + '/home.png' });
console.log('title:', await page.title());
console.log('recent section:', await page.locator('#recent-cases').count());
console.log('cards imgs:', await page.locator('#recent-cases img').count());
console.log('pageerrors:', errors);
await browser.close();
