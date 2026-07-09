// SPDX-License-Identifier: Hippocratic-3.0
//
// Adversarial (anonymous) browser checks: a non-public case must not leak through
// the SPA, and no content flash before the 404 resolves. seed_dev seeds
// var-draft-secret / var-inreview-secret / var-closed-secret as non-public cases
// whose titles contain "secret".
import { test, expect, type Page } from "@playwright/test";

async function dismissConsent(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("jawafdehi_analytics_consent", "denied"),
  );
}

test.beforeEach(async ({ page }) => {
  await dismissConsent(page);
});

const NONPUBLIC_SLUGS = [
  "var-draft-secret",
  "var-inreview-secret",
  "var-closed-secret",
  "seed-draft",
];

for (const slug of NONPUBLIC_SLUGS) {
  test(`direct-loading non-public case /case/${slug} does not leak content`, async ({
    page,
  }) => {
    // The public case API 404s non-public cases; the SPA must render its
    // not-found state, never the case body. We assert the secret marker text
    // never appears in the DOM.
    await page.goto(`/case/${slug}`);
    await expect(page.getByText(/secret/i)).toHaveCount(0);
    // The page resolves to a not-found affordance OR redirects; either way the
    // banner/title of a real case (with the secret content) must be absent.
    await expect(page.getByRole("heading", { name: /secret/i })).toHaveCount(0);
  });
}

test("searching for a non-public marker returns no leaking results", async ({
  page,
}) => {
  await page.goto("/search?q=secret");
  // The non-public seed titles contain 'secret'; a public search must not surface
  // them. Allow the query UI to render, but no result card may carry the marker.
  await expect(page.locator('a[href*="secret"]')).toHaveCount(0);
});
