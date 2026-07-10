// SPDX-License-Identifier: Hippocratic-3.0
//
// Adversarial (anonymous) browser checks. Jawafdehi holds pre-publication
// allegations; a non-public case (DRAFT / IN_REVIEW / CLOSED) must never leak its
// content to an anonymous visitor through the SPA — not on direct load, not in
// search, not via the admin surface.
//
// These run against a REAL backend seeded by `seed_dev`, which creates:
//   seed-published  PUBLISHED  "Published: embezzlement at Board Y"   (public)
//   seed-draft      DRAFT      "Draft: alleged kickbacks at Dept A"   (non-public)
//   seed-in-review  IN_REVIEW  "Review: procurement fraud Ministry X" (non-public)
//   seed-closed     CLOSED     "Closed: dismissed complaint Z"        (non-public)
// so we assert on the REAL titles of the REAL seeded rows — not a marker that was
// never inserted (which would make every "absent" assertion vacuously true).
import { test, expect, type Page } from "@playwright/test";

async function dismissConsent(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("jawafdehi_analytics_consent", "denied"),
  );
}

test.beforeEach(async ({ page }) => {
  await dismissConsent(page);
});

// A distinctive title fragment per non-public case (unique to that row so a hit is
// unambiguous evidence the case leaked), plus the public case as a POSITIVE
// CONTROL that the marker-matching is real and not always-green.
const PUBLIC = { slug: "seed-published", marker: /embezzlement at Board Y/i };
const NONPUBLIC = [
  { slug: "seed-draft", state: "DRAFT", marker: /alleged kickbacks at Dept A/i },
  { slug: "seed-in-review", state: "IN_REVIEW", marker: /procurement fraud Ministry X/i },
  { slug: "seed-closed", state: "CLOSED", marker: /dismissed complaint Z/i },
];

test("POSITIVE CONTROL: the published case IS visible to anon (proves the leak checks have teeth)", async ({
  page,
}) => {
  await page.goto(`/case/${PUBLIC.slug}`);
  // The published title must render — if this fails, the seed changed and the
  // absence assertions below can no longer be trusted.
  await expect(page.getByText(PUBLIC.marker).first()).toBeVisible();
});

for (const c of NONPUBLIC) {
  test(`direct-loading the ${c.state} case /case/${c.slug} does not leak its content to anon`, async ({
    page,
  }) => {
    await page.goto(`/case/${c.slug}`);
    // The public case API 404s non-public cases; the SPA must NEVER render the
    // case body/title. Wait for the network to settle so a delayed content flash
    // would still be caught.
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(c.marker)).toHaveCount(0);
    // Instead of the case, a safe failure/not-found affordance is shown (the SPA
    // surfaces the API 404 as "Failed to load case details" and a Back-to-Cases
    // link) — never the case content.
    await expect(
      page
        .getByText(
          /failed to load case|404|पृष्ठ फेला परेन|not found|back to cases/i,
        )
        .first(),
    ).toBeVisible();
  });
}

test("searching for a non-public-only term surfaces no non-public case", async ({
  page,
}) => {
  // 'kickbacks' appears only in the DRAFT case title; a public search must not
  // surface it. Positive control: 'embezzlement' (the PUBLISHED case) DOES return
  // a linked result, proving search is actually running end-to-end.
  await page.goto("/search?q=embezzlement");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(`a[href="/case/${PUBLIC.slug}"]`).first()).toBeVisible();

  await page.goto("/search?q=kickbacks");
  await page.waitForLoadState("networkidle");
  for (const c of NONPUBLIC) {
    await expect(page.locator(`a[href="/case/${c.slug}"]`)).toHaveCount(0);
  }
});

test("anonymous visitor cannot reach the admin panel (redirected to login)", async ({
  page,
}) => {
  // Negative authz: with no session, /admin must bounce to the login gate — it
  // must never render admin chrome or the moderation queue to an anon browser.
  await page.goto("/admin/");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByText(/login with jawafdehi auth/i)).toBeVisible();

  // The gated moderation queue is likewise unreachable for anon.
  await page.goto("/admin/moderation");
  await expect(page).toHaveURL(/\/admin\/login/);
});
