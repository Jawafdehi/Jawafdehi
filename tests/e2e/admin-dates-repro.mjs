// Headless repro/verify driver for the admin case-editor date+bigo bugs.
// Requires: mock API on :48000 (bun tests/e2e/mock-api.ts) and the dev server
// started with VITE_DEV_AUTH=true (port via E2E_BASE_URL, default :40115).
//   node tests/e2e/admin-dates-repro.mjs
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:40115';
const SHOTS = process.env.E2E_SHOTS_DIR || '/tmp/e2e-shots';
const CASE_EDIT = '/admin/jawafdehi/cases/case-081-cr-0107-patanjali/edit';

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).split('\n')[0]));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

// Dev-auth session snapshot (see src/services/dev-auth-constants.ts).
await page.addInitScript(() => {
  localStorage.setItem(
    'jawafdehi.devAuth.user',
    JSON.stringify({ username: 'e2e-admin', roles: [], is_admin: true }),
  );
  localStorage.setItem('jawafdehi.devAuth.csrf', 'e2e-csrf');
  // Pre-answer the cookie-consent banner: its fixed bottom bar otherwise
  // overlays the form's Save button and intercepts clicks.
  localStorage.setItem('jawafdehi_analytics_consent', 'denied');
});

await page.goto(BASE + CASE_EDIT, { waitUntil: 'networkidle' });
await page.waitForSelector('#bigo', { timeout: 30000 });

const bsInput = (idBase) => page.locator(`#${idBase}-bs input`);
const adButton = (idBase) => page.locator(`button#${idBase}-ad`);
const state = async (idBase) => ({
  ad: (await adButton(idBase).innerText()).trim(),
  bs: await bsInput(idBase).inputValue(),
});

// Devanagari-digit helper for display assertions (the BS box renders Nepali).
const DEV = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const toDev = (s) => s.replace(/\d/g, (d) => DEV[Number(d)]);

// --- Scenario 1: pick an AD date on Case start; BS must follow --------------
console.log('\n== Scenario 1: AD pick on case-start ==');
await adButton('case-start').click();
await page.locator('button[name="day"]:not([disabled])', { hasText: /^15$/ }).first().click();
await page.waitForTimeout(600);
let s = await state('case-start');
console.log(`   AD="${s.ad}" BS="${s.bs}"`);
check('AD shows a 15th', /^\d{4}-\d{2}-15$/.test(s.ad), s.ad);
check('BS box followed (Devanagari date, not empty/corrupt)', /^[०-९]{4}-[०-९]{2}-[०-९]{2}$/.test(s.bs), s.bs);
await page.screenshot({ path: `${SHOTS}/fix-s1-after-ad-pick.png` });

// --- Scenario 2: pick a BS date on Case end; box shows the date, no crash ---
console.log('\n== Scenario 2: BS pick on case-end ==');
await bsInput('case-end').click();
const dayCell = page.locator('#case-end-bs').getByText('१५', { exact: true }).first();
await dayCell.waitFor({ timeout: 10000 });
await dayCell.click();
await page.waitForTimeout(600);
s = await state('case-end');
console.log(`   AD="${s.ad}" BS="${s.bs}"`);
check('BS box shows a full Devanagari date', /^[०-९]{4}-[०-९]{2}-[०-९]{2}$/.test(s.bs), s.bs);
check('paired AD auto-filled', /^\d{4}-\d{2}-\d{2}$/.test(s.ad), s.ad);

// Click the BS input again — the previously-crashing path.
await bsInput('case-end').click();
await page.waitForTimeout(800);
check('no crash screen after re-click', (await page.getByText('Something went wrong').count()) === 0);
check('BS value survives re-click', (await bsInput('case-end').inputValue()) === s.bs);
await page.keyboard.press('Escape');
await page.screenshot({ path: `${SHOTS}/fix-s2-after-bs-pick.png` });

// --- Scenario 3: timeline event date pair stays in sync ---------------------
console.log('\n== Scenario 3: timeline event 1 AD pick ==');
await page.locator('#tl-0-ad').scrollIntoViewIfNeeded();
await adButton('tl-0').click();
await page.locator('button[name="day"]:not([disabled])', { hasText: /^20$/ }).first().click();
await page.waitForTimeout(600);
s = await state('tl-0');
console.log(`   AD="${s.ad}" BS="${s.bs}"`);
check('timeline AD shows a 20th', /^\d{4}-\d{2}-20$/.test(s.ad), s.ad);
check('timeline BS followed', /^[०-९]{4}-[०-९]{2}-[०-९]{2}$/.test(s.bs), s.bs);

// --- Scenario 4: bigo shows commas, saves a plain number --------------------
console.log('\n== Scenario 4: bigo input ==');
const bigo = page.locator('#bigo');
await bigo.fill('185850001');
const shown = await bigo.inputValue();
console.log(`   displayed="${shown}"`);
check('bigo displays Indian grouping', shown === '18,58,50,001', shown);

// --- Scenario 5: timeline inline inserts ------------------------------------
console.log('\n== Scenario 5: timeline inline "+" inserts ==');
check('header "Add event" button is gone', (await page.getByRole('button', { name: 'Add event', exact: true }).count()) === 0);
const before = await page.locator('[id^="tl-"][id$="-ad"]').count();
await page.getByRole('button', { name: 'Insert event after event 1', exact: true }).click();
await page.waitForTimeout(300);
const after = await page.locator('[id^="tl-"][id$="-ad"]').count();
check('insert-after-1 adds a row', after === before + 1, `${before} -> ${after}`);
// The new row is event 2 and must be blank; event 1 keeps its data.
const ev2Title = await page.locator('#tl-1-ad').locator('xpath=ancestor::div[contains(@class,"rounded")][1]//input[@placeholder="What happened"]').inputValue().catch(() => '<err>');
check('inserted row is blank', ev2Title === '', JSON.stringify(ev2Title));
await page.screenshot({ path: `${SHOTS}/fix-s5-timeline-insert.png`, fullPage: true });

// --- Scenario 6: save round-trip --------------------------------------------
console.log('\n== Scenario 6: save round-trip ==');
// Remove the blank row inserted in scenario 5 (timeline rows carry an
// "Insert event after event N" sibling, so scope to the second event card).
await page
  .locator('#tl-1-ad')
  .locator('xpath=ancestor::div[contains(@class,"rounded")][1]')
  .getByRole('button', { name: 'Remove' })
  .click()
  .catch((e) => console.log('   remove failed:', String(e).split('\n')[0]));
await page.waitForTimeout(200);
const saveBtn = page.getByRole('button', { name: 'Save changes' });
console.log('   save disabled:', await saveBtn.isDisabled());
const fieldErrors = await page.locator('form p.text-red-600, form [class*="text-destructive"]').allInnerTexts().catch(() => []);
if (fieldErrors.length) console.log('   field errors:', fieldErrors);
const [patchReq] = await Promise.all([
  page.waitForRequest((r) => r.method() === 'PATCH' && r.url().includes('/api/cases/'), { timeout: 10000 }),
  saveBtn.click(),
]);
const ops = patchReq.postDataJSON();
const byPath = Object.fromEntries(ops.map((o) => [o.path, o.value]));
console.log('   PATCH ops:', JSON.stringify(byPath).slice(0, 400));
check('bigo saved as number', byPath['/bigo'] === 185850001, String(byPath['/bigo']));
check('case_start_date_bs saved as ASCII YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(byPath['/case_start_date_bs'] ?? ''), String(byPath['/case_start_date_bs']));
check('case_end_date_bs saved as ASCII YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(byPath['/case_end_date_bs'] ?? ''), String(byPath['/case_end_date_bs']));
check('case_end_date (AD) saved', /^\d{4}-\d{2}-\d{2}$/.test(byPath['/case_end_date'] ?? ''), String(byPath['/case_end_date']));

console.log('\npageErrors:', pageErrors.length ? pageErrors : 'none');
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
