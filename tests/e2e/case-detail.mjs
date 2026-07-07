// Case-detail driver: drives the redesigned /case page against the mock
// API and asserts its data plumbing (IRI court refs, material-based
// evidence, entity links, document preview dialog).
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:40115';
const SHOTS = process.env.E2E_SHOTS_DIR || '/tmp/e2e-shots';
const SLUG = 'case-081-cr-0107-patanjali';

const KNOWN_BASELINE = /Hydration failed|error while hydrating/;

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// ── Case detail page ──
await page.goto(`${BASE}/case/${SLUG}`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${SHOTS}/case-detail-top.png` });

const h1 = await page.locator('h1').first().textContent();
check('banner h1 renders case title', Boolean(h1 && h1.trim().length > 10), (h1 || '').trim().slice(0, 60));

const breadcrumb = await page.locator('nav[aria-label="breadcrumb"]').textContent();
check('breadcrumb shows uppercased court-case number', Boolean(breadcrumb?.includes('081-CR-0107')), breadcrumb?.trim());

// IRIs carry the case number lowercased, so in-app hrefs do too.
const bannerCourtLink = page.locator('a[href="/courtcase/special/081-cr-0107"]').first();
check('banner court-case ref links to in-app /courtcase page', (await bannerCourtLink.count()) > 0);

check('jump nav renders', (await page.locator('aside a[href^="#"]').count()) >= 4, `${await page.locator('aside a[href^="#"]').count()} sections`);

// Court updates section: card header must parse the colon-form ref.
const courtSection = page.locator('#court-case');
check('court-cases section present', (await courtSection.count()) === 1);
const cardHeader = await page.locator('section#court-case a[href^="/courtcase/"]').first().textContent().catch(() => null);
check('court card header shows "081-CR-0107 (Special Court)"', Boolean(cardHeader?.includes('081-CR-0107') && cardHeader?.includes('Special Court')), cardHeader?.trim());

// Evidence: 7 material cards, title links to /material/*, badge + preview buttons.
const evidenceCards = await page.locator('#evidence article').count();
check('evidence section renders 7 material cards', evidenceCards === 7, `${evidenceCards} cards`);

const materialLinks = await page.locator('#evidence a[href^="/material/"]').count();
check('evidence titles link to /material/<tail>', materialLinks >= 7, `${materialLinks} links`);

const previewButtons = page.locator('#evidence button', { hasText: /preview/i });
const previewCount = await previewButtons.count();
check('PDF/markdown preview buttons present', previewCount > 0, `${previewCount} buttons`);

// Timeline renders.
const timelineText = await page.locator('#timeline').textContent().catch(() => '');
check('timeline section renders entries', Boolean(timelineText && timelineText.trim().length > 50), `${(timelineText || '').trim().length} chars`);

await page.locator('#evidence').scrollIntoViewIfNeeded();
await page.screenshot({ path: `${SHOTS}/case-detail-evidence.png` });

// Preview dialog opens on click (content load hits the /document-preview proxy).
if (previewCount > 0) {
  await previewButtons.first().click();
  const dialog = page.locator('[role="dialog"][data-state="open"]');
  await dialog.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  check('document preview dialog opens', (await dialog.count()) > 0 && (await dialog.first().isVisible()));
  await page.screenshot({ path: `${SHOTS}/case-detail-preview-dialog.png` });
  await page.keyboard.press('Escape');
}

// ── Court-case detail page (main's page, reached via the new links) ──
await page.goto(`${BASE}/courtcase/special/081-cr-0107`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const ccBody = (await page.locator('#root').textContent()) || '';
check(
  '/courtcase page renders the court case',
  ccBody.toLowerCase().includes('081-cr-0107') && ccBody.includes('नेपाल सरकार'),
);
await page.screenshot({ path: `${SHOTS}/courtcase-page.png` });

// ── Legacy court-ref URL resolves to the canonical slug ──
await page.goto(`${BASE}/case/081-CR-0107`, { waitUntil: 'networkidle' });
await page.waitForURL(`**/case/${SLUG}`, { timeout: 10000 }).catch(() => {});
check('/case/<court-ref> redirects to canonical slug', page.url().endsWith(`/case/${SLUG}`), page.url());

// ── Guest chat is gone ──
await page.goto(`${BASE}/ask`, { waitUntil: 'networkidle' });
const askBody = await page.locator('#root').textContent();
check('/ask now 404s (guest chat removed)', Boolean(askBody && /404|not found/i.test(askBody)));

const unexpected = errors.filter((e) => !KNOWN_BASELINE.test(e));
check('no unexpected page errors (hydration baseline excluded)', unexpected.length === 0, unexpected.slice(0, 3).join(' | '));

await browser.close();
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
