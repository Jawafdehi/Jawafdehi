// Headless verify driver: material edit form (admin), evidence-title links and
// case-card thumbnail fallback (public site). Same prerequisites as
// admin-dates-repro.mjs.
//   node tests/e2e/site-and-materials.mjs
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:40115';
const SHOTS = process.env.E2E_SHOTS_DIR || '/tmp/e2e-shots';
const MATERIAL_TAIL = 'jawafdehi/20260504.522ddb7d';

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).split('\n')[0]));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

await page.addInitScript(() => {
  localStorage.setItem(
    'jawafdehi.devAuth.user',
    JSON.stringify({ username: 'e2e-admin', roles: ['Admin'], is_admin: true }),
  );
  localStorage.setItem('jawafdehi.devAuth.csrf', 'e2e-csrf');
  localStorage.setItem('jawafdehi_analytics_consent', 'denied');
});

// --- Scenario 1: material edit form ------------------------------------------
console.log('== Scenario 1: field-based material edit form ==');
await page.goto(`${BASE}/admin/datalake/materials/edit/${MATERIAL_TAIL}`, { waitUntil: 'networkidle' });
await page.waitForSelector('#name-ne', { timeout: 30000 });
check('name (ne) prefilled from doc', (await page.locator('#name-ne').inputValue()).includes('Himal Khabar'));
check('@id shown and locked', await page.locator('#material-iri').isDisabled());
check('raw JSON hidden behind Advanced', !(await page.locator('#jsonld').isVisible()));
await page.screenshot({ path: `${SHOTS}/material-form.png`, fullPage: true });

// Edit fields: English name + a link row; then save and inspect the PUT body.
await page.locator('#name-en').fill('Himal Khabar: CIAA files case against 10 individuals');
await page.getByRole('button', { name: 'Add link' }).click();
await page.getByLabel('Link 1 URL').fill('https://www.himalkhabar.com/news/143210');
await page.getByLabel('Link 1 role').click();
await page.getByRole('option', { name: 'SOURCE_PAGE' }).click();
const [putReq] = await Promise.all([
  page.waitForRequest((r) => r.method() === 'PUT' && r.url().includes('/api/materials/'), { timeout: 10000 }),
  page.getByRole('button', { name: 'Save material' }).click(),
]);
const body = putReq.postDataJSON();
check('PUT keeps @id', body['@id'] === `https://jawafdehi.org/material/${MATERIAL_TAIL}`, body['@id']);
check('PUT keeps unknown keys (@context)', Array.isArray(body['@context']));
check('PUT keeps sourceType', body['jawafdehi:sourceType'] === 'MISC', String(body['jawafdehi:sourceType']));
check('PUT carries edited English name', body.name?.en?.includes('CIAA files case'), JSON.stringify(body.name));
check('PUT keeps Nepali name', Boolean(body.name?.ne), JSON.stringify(body.name?.ne)?.slice(0, 60));
const media = body.associatedMedia ?? [];
check(
  'PUT carries the added link',
  media.some((m) => m.contentUrl === 'https://www.himalkhabar.com/news/143210' && m['jawafdehi:linkRole'] === 'SOURCE_PAGE'),
  JSON.stringify(media).slice(0, 200),
);

// --- Scenario 2: evidence titles link to /material/* -------------------------
console.log('\n== Scenario 2: case-detail evidence links ==');
await page.goto(`${BASE}/case/case-081-cr-0107-patanjali`, { waitUntil: 'networkidle' });
const evidenceLinks = page.locator('article h3 a[href^="/material/"]');
await evidenceLinks.first().waitFor({ timeout: 30000 });
const linkCount = await evidenceLinks.count();
check('evidence titles are links to /material/*', linkCount > 0, `${linkCount} links`);
const firstHref = await evidenceLinks.first().getAttribute('href');
console.log('   first link:', firstHref);
await evidenceLinks.first().click();
await page.waitForURL('**/material/**', { timeout: 15000 });
await page.waitForTimeout(1500);
check('material page renders (no crash)', (await page.getByText('Something went wrong').count()) === 0);
await page.screenshot({ path: `${SHOTS}/material-profile.png` });

// --- Scenario 3: home-page card thumbnails -----------------------------------
console.log('\n== Scenario 3: Recently Documented Cases thumbnails ==');
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.locator('#recent-cases').scrollIntoViewIfNeeded();
// Give the thumbnail→banner error-fallback a moment to settle.
await page.waitForTimeout(4000);
const imgs = page.locator('#recent-cases img');
const imgCount = await imgs.count();
const srcs = await imgs.evaluateAll((els) => els.map((el) => el.getAttribute('src')));
console.log('   card images:', srcs);
check('at least one recent-case card shows an image', imgCount > 0, `${imgCount} imgs`);
await page.locator('#recent-cases').screenshot({ path: `${SHOTS}/recent-cases.png` });

console.log('\npageErrors:', pageErrors.length ? pageErrors : 'none');
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
