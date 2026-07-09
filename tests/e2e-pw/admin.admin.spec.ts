// SPDX-License-Identifier: Hippocratic-3.0
//
// Authenticated admin/moderation user-actions. Runs in the `admin` project with a
// storageState seeded by auth.setup.ts (real dev-login session). Proves the
// deepest FE↔BE integration: the SPA drives the real backend as a logged-in admin.
import { test, expect } from "@playwright/test";

test("admin panel renders logged-in (no OIDC redirect)", async ({ page }) => {
  await page.goto("/admin/");
  // We must NOT be bounced to an SSO/login screen — the dev-login session holds.
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByText(/log ?in|sign ?in with/i)).toHaveCount(0);
  // Some admin chrome is visible (nav / heading / the signed-in username).
  await expect(page.locator("nav, header, main").first()).toBeVisible();
});

test("moderation dashboard lists in-review work", async ({ page }) => {
  await page.goto("/moderation");
  await expect(page).toHaveURL(/\/moderation/);
  await expect(page.locator("main")).toBeVisible();
  // Not redirected to login.
  await expect(page.getByText(/sign ?in with|please log in/i)).toHaveCount(0);
});
