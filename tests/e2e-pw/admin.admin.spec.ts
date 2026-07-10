// SPDX-License-Identifier: Hippocratic-3.0
//
// Authenticated admin/moderation user-actions. Runs in the `admin` project with a
// storageState seeded by auth.setup.ts (real dev-login session). Proves the
// deepest FE↔BE integration: the SPA drives the real backend as a logged-in admin.
import { test, expect } from "@playwright/test";

test("admin panel renders logged-in (not bounced to the login gate)", async ({ page }) => {
  await page.goto("/admin/");
  await page.waitForLoadState("networkidle");
  // The auth guard redirects unauthenticated users to /admin/login (which still
  // matches /admin), so assert the NEGATIVE: our dev-login session must keep us
  // OFF the login route, and the login CTA must be absent.
  await expect(page).not.toHaveURL(/\/admin\/login/);
  await expect(page.getByText(/login with jawafdehi auth/i)).toHaveCount(0);
  // Admin chrome is visible (nav / heading / the signed-in username).
  await expect(page.locator("nav, header, main").first()).toBeVisible();
});

test("gated moderation queue lists the seeded in-review case", async ({ page }) => {
  // Target the AUTH-GATED admin route (/admin/moderation), not the public
  // /moderation redirect. As a logged-in admin we must NOT be bounced to login,
  // and the queue must actually surface the seeded IN_REVIEW case — proving the
  // moderation list is wired to the backend, not just that a shell mounted.
  await page.goto("/admin/moderation");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/admin\/moderation/);
  await expect(page).not.toHaveURL(/\/admin\/login/);
  // seed_dev's IN_REVIEW case ("Review: procurement fraud Ministry X").
  await expect(
    page.getByText(/procurement fraud Ministry X|seed-in-review/i).first(),
  ).toBeVisible();
});
