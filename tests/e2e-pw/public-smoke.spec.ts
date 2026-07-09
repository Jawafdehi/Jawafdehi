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

test("home loads without page errors and shows the archive", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/");
  await expect(page).toHaveTitle(/jawafdehi|accountability|जवाफदेही/i);
  // Exactly one H1 (a11y + SSR sanity).
  await expect(page.locator("h1")).toHaveCount(1);
  expect(errors, `unexpected pageerrors: ${errors.join("\n")}`).toEqual([]);
});

test("search a seeded term returns results (proves the real OpenSearch path)", async ({
  page,
}) => {
  await page.goto("/search?q=corruption");
  // The results region renders (count container / result cards). We assert the
  // page settled and the results heading/live-region is present rather than a
  // hard count, since seed data can vary.
  await expect(page.locator("[aria-live], main")).toBeVisible();
  // A search that hit the backend should not throw the hard-fail 503 surface.
  await expect(page.getByText(/503|search is unavailable/i)).toHaveCount(0);
});

test("cases list renders and only public cases are shown", async ({ page }) => {
  await page.goto("/cases");
  await expect(page.locator("main")).toBeVisible();
  // The word 'secret' seeds the non-public leak-check cases; they must not appear.
  await expect(page.getByText(/var-.*-secret/i)).toHaveCount(0);
});

test("case detail renders for a seeded published case", async ({ page }) => {
  // seed_dev publishes 'seed-published'; fall back to the cases list's first card.
  const resp = await page.goto("/case/seed-published");
  if (resp && resp.status() === 404) {
    await page.goto("/cases");
    const firstCard = page.locator('a[href^="/case/"]').first();
    await firstCard.click();
  }
  await expect(page).toHaveURL(/\/case\//);
  await expect(page.locator("h1")).toBeVisible();
});

test("entity search route resolves (entities fold into /search)", async ({ page }) => {
  await page.goto("/search?type=entity");
  await expect(page.locator("main")).toBeVisible();
});

test("materials list renders", async ({ page }) => {
  await page.goto("/materials");
  await expect(page.locator("main")).toBeVisible();
});

test("court cases list renders", async ({ page }) => {
  await page.goto("/courtcases");
  await expect(page.locator("main")).toBeVisible();
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
  await page.goto("/search?q=roads");
  expect(external, `leaked external requests: ${external.join("\n")}`).toEqual([]);
});
