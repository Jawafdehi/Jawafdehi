// SPDX-License-Identifier: Hippocratic-3.0
//
// Adversarial (anonymous) browser checks. Jawafdehi holds pre-publication
// allegations. Visibility model:
//   - DRAFT / CLOSED are fully hidden: content never leaks to anon (direct load
//     404s) and they never appear in search or the admin surface (to anon).
//   - IN_REVIEW is "unlisted": reachable by anon on DIRECT load (exact slug),
//     rendered behind an "under review" banner and marked noindex — but NOT
//     discoverable (absent from search + listings). Knowing a slug is allowed;
//     enumerating slugs is not.
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

// The UI defaults to Nepali (i18n is the single source of truth — see
// src/i18n/config.ts, which reads `i18nextLng` from localStorage on boot).
// This spec asserts on the ENGLISH UI copy (not-found affordance, admin login,
// "no records"), so pin the language to `en` via that same source of truth —
// otherwise those strings render in Nepali and the English matchers miss.
// (public-smoke.spec.ts pins `ne` the same way.)
async function pinLanguageEnglish(page: Page) {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "en"));
}

test.beforeEach(async ({ page }) => {
  await dismissConsent(page);
  await pinLanguageEnglish(page);
});

// A distinctive title fragment per non-public case (unique to that row so a hit is
// unambiguous evidence the case leaked), plus the public case as a POSITIVE
// CONTROL that the marker-matching is real and not always-green.
const PUBLIC = { slug: "seed-published", marker: /embezzlement at Board Y/i };
// Fully hidden: direct load 404s, no content leak, absent from search.
const HIDDEN = [
  { slug: "seed-draft", state: "DRAFT", marker: /alleged kickbacks at Dept A/i },
  { slug: "seed-closed", state: "CLOSED", marker: /dismissed complaint Z/i },
];
// Unlisted: renders on direct load (by exact slug), but not discoverable.
const UNLISTED = {
  slug: "seed-in-review",
  state: "IN_REVIEW",
  marker: /procurement fraud Ministry X/i,
};
// Everything that must stay OUT of search (unlisted + hidden alike).
const ABSENT_FROM_SEARCH = [...HIDDEN, UNLISTED];

test("POSITIVE CONTROL: the published case IS visible to anon (proves the leak checks have teeth)", async ({
  page,
}) => {
  await page.goto(`/case/${PUBLIC.slug}`);
  // The published title must render — if this fails, the seed changed and the
  // absence assertions below can no longer be trusted.
  await expect(page.getByText(PUBLIC.marker).first()).toBeVisible();
});

for (const c of HIDDEN) {
  test(`direct-loading the ${c.state} case /case/${c.slug} does not leak its content to anon`, async ({
    page,
  }) => {
    await page.goto(`/case/${c.slug}`);
    // Web-first, POSITIVE assertion first: wait until the SPA has resolved the
    // API 404 into its safe failure/not-found affordance ("Failed to load case
    // details" + a Back-to-Cases link). This implicitly waits out any content
    // flash, so the negative check below can't pass vacuously mid-load.
    await expect(
      page
        .getByText(
          /failed to load case|404|पृष्ठ फेला परेन|not found|back to cases/i,
        )
        .first(),
    ).toBeVisible();
    // Only now assert the case body/title NEVER rendered.
    await expect(page.getByText(c.marker)).toHaveCount(0);
  });
}

test(`direct-loading the IN_REVIEW case /case/${UNLISTED.slug} is unlisted-but-accessible (renders + noindex)`, async ({
  page,
}) => {
  await page.goto(`/case/${UNLISTED.slug}`);
  // Unlisted, NOT hidden: an anon visitor with the exact slug sees the case
  // content render (the API serves IN_REVIEW by direct slug).
  await expect(page.getByText(UNLISTED.marker).first()).toBeVisible();
  // It renders behind an "under review" provisional banner (EN or NE copy).
  await expect(
    page.getByText(/under review|समीक्षा गरिरहेको/i).first(),
  ).toBeVisible();
  // ...and is kept out of search engines via a robots noindex directive.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/i,
  );
});

test("searching for a non-public-only term surfaces no non-public case", async ({
  page,
}) => {
  // 'kickbacks' appears only in the DRAFT case title; a public search must not
  // surface it. Positive control: 'embezzlement' (the PUBLISHED case) DOES return
  // a linked result — this web-first assertion waits out the query, proving search
  // runs end-to-end.
  await page.goto("/search?q=embezzlement");
  await expect(page.locator(`a[href="/case/${PUBLIC.slug}"]`).first()).toBeVisible();

  // For the negative query, anchor on the results surface having SETTLED (the
  // "no records found" state) before asserting absence, so the check can't pass
  // vacuously while the query is still in flight. 'kickbacks' is DRAFT-only;
  // 'procurement' is IN_REVIEW-only — the latter proves that an unlisted case,
  // though reachable by direct slug, is still NOT discoverable via search.
  for (const term of ["kickbacks", "procurement"]) {
    await page.goto(`/search?q=${term}`);
    await expect(
      page.getByText(/no archive records found/i).first(),
    ).toBeVisible();
    for (const c of ABSENT_FROM_SEARCH) {
      await expect(page.locator(`a[href="/case/${c.slug}"]`)).toHaveCount(0);
    }
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
