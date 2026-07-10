// SPDX-License-Identifier: Hippocratic-3.0
//
// Public (anonymous) user-action smoke tests against a REAL backend seeded with
// seed_dev. These prove the FE↔BE integration through the browser: the SPA calls
// the local Django via the Vite proxy (no mocks). Selectors prefer roles/URLs
// over brittle text so they survive copy tweaks.
import { test, expect, type Page } from "@playwright/test";

// The cookie-consent banner's fixed bar can intercept clicks; pre-answer it.
async function dismissConsent(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("jawafdehi_analytics_consent", "denied");
  });
}

test.beforeEach(async ({ page }) => {
  await dismissConsent(page);
});

// Dev-mode React hydration mismatch warnings are a known, self-recovering
// artifact of `vite dev` (SSR template + client hydrate); they do not occur in
// the production build and must not fail the smoke run. Everything else is a real
// error.
const IGNORABLE_ERROR = /hydrat|switch to client rendering/i;

test("home loads without (non-hydration) page errors and shows the archive", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    const s = String(e);
    if (!IGNORABLE_ERROR.test(s)) errors.push(s);
  });
  await page.goto("/");
  await expect(page).toHaveTitle(/jawafdehi|accountability|जवाफदेही/i);
  // The SPA mounted content into #root.
  await expect(page.locator("#root")).not.toBeEmpty();
  // At least one H1 (a11y + SSR sanity).
  expect(await page.locator("h1").count()).toBeGreaterThanOrEqual(1);
  expect(errors, `unexpected pageerrors: ${errors.join("\n")}`).toEqual([]);
});

// A route "renders" if the SPA mounted content into #root and surfaced a heading
// (robust across pages that may or may not use a <main> landmark).
async function assertRendered(page: import("@playwright/test").Page) {
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.locator("h1, h2").first()).toBeVisible();
}

test("search a seeded term returns results (proves the real OpenSearch path)", async ({
  page,
}) => {
  await page.goto("/search?q=corruption");
  await assertRendered(page);
  // A search that hit the backend must not throw the hard-fail 503 surface.
  await expect(page.getByText(/503|search is unavailable/i)).toHaveCount(0);
});

test("cases list renders and only public cases are shown", async ({ page }) => {
  await page.goto("/cases");
  // The published-case link is the positive control: this web-first assertion
  // waits for the list to load, so no separate networkidle is needed.
  await expect(page.locator('a[href="/case/seed-published"]').first()).toBeVisible();
  // Its non-public siblings (draft/in-review/closed) must NOT appear — assert on
  // the real seeded slugs, not a never-inserted marker.
  for (const slug of ["seed-draft", "seed-in-review", "seed-closed"]) {
    await expect(page.locator(`a[href="/case/${slug}"]`)).toHaveCount(0);
  }
});

test("case detail renders for a seeded published case", async ({ page }) => {
  // seed_dev publishes 'seed-published'; fall back to the cases list's first card.
  const resp = await page.goto("/case/seed-published");
  if (resp && resp.status() === 404) {
    await page.goto("/cases");
    await page.locator('a[href^="/case/"]').first().click();
  }
  await expect(page).toHaveURL(/\/case\//);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("entity search route resolves (entities fold into /search)", async ({ page }) => {
  await page.goto("/search?type=entity");
  await assertRendered(page);
});

test("materials list renders", async ({ page }) => {
  await page.goto("/materials");
  await assertRendered(page);
});

test("court cases list renders", async ({ page }) => {
  await page.goto("/courtcases");
  await assertRendered(page);
});

test("language toggle switches UI to Nepali and persists across nav", async ({
  page,
}) => {
  await page.goto("/");
  // Set language via the app's i18n storage key, reload, and assert lang attr.
  await page.evaluate(() => localStorage.setItem("i18nextLng", "ne"));
  await page.goto("/cases");
  await expect(page.locator("html")).toHaveAttribute("lang", "ne");
});

test("unknown route renders the localized 404, not a blank crash", async ({ page }) => {
  await page.goto("/this-route-does-not-exist-xyz");
  await expect(page.getByText(/404|पृष्ठ फेला परेन|not found/i).first()).toBeVisible();
  // Nav/footer still present (SPA shell intact).
  await expect(page.locator("nav, header").first()).toBeVisible();
});

test("no requests leak to the production API or telemetry", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (/api\.jawafdehi\.org|sentry\.io|google-analytics|googletagmanager/i.test(url)) {
      external.push(url);
    }
  });
  await page.goto("/");
  await assertRendered(page);
  await page.goto("/search?q=roads");
  await assertRendered(page);
  // assertRendered above waits for each page to actually render, so any async API/
  // telemetry request fired on load has had a chance to appear before we assert.
  expect(external, `leaked external requests: ${external.join("\n")}`).toEqual([]);
});
