// SPDX-License-Identifier: Hippocratic-3.0
//
// Authenticated admin/moderation user-actions. Runs in the `admin` project with a
// storageState seeded by auth.setup.ts (real dev-login session). Proves the
// deepest FE↔BE integration: the SPA drives the real backend as a logged-in admin.
import { test, expect } from "@playwright/test";

test("admin panel renders logged-in (not bounced to the login gate)", async ({ page }) => {
  await page.goto("/admin/");
  // POSITIVE, web-first first: admin chrome must render (this waits out the auth
  // check + any late redirect). The guard sends unauthenticated users to
  // /admin/login and renders the "Login with Jawafdehi Auth" CTA, so seeing admin
  // chrome AND no login CTA proves the dev-login session held.
  await expect(page.locator("nav, header, main").first()).toBeVisible();
  await expect(page.getByText(/login with jawafdehi auth/i)).toHaveCount(0);
  // And strictly: we are NOT on the login route (checked after the positive wait,
  // so it can't pass vacuously before a redirect fires).
  await expect(page).not.toHaveURL(/\/admin\/login/);
});

test("gated moderation queue lists the seeded in-review case", async ({ page }) => {
  // Target the AUTH-GATED admin route (/admin/moderation), not the public
  // /moderation redirect. The queue must surface the seeded IN_REVIEW case —
  // proving the moderation list is wired to the backend, not just a mounted shell.
  await page.goto("/admin/moderation");
  // POSITIVE, web-first first: the seeded IN_REVIEW case appears (waits out the
  // load + API). If auth had bounced us to /admin/login this never renders.
  await expect(
    page.getByText(/procurement fraud Ministry X|seed-in-review/i).first(),
  ).toBeVisible();
  // Then strictly assert the route (not vacuous — the positive wait already ran).
  await expect(page).toHaveURL(/\/admin\/moderation/);
  await expect(page).not.toHaveURL(/\/admin\/login/);
});
