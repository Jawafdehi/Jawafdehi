// SPDX-License-Identifier: Hippocratic-3.0
//
// One-time auth setup: open a REAL Django dev-login session against the backend
// and persist it (cookies + localStorage) so the admin project reuses it.
//
// Production is OIDC/Zitadel only. With VITE_DEV_AUTH=true (frontend) and DEV_AUTH
// on (backend), POST /api/casework/auth/dev-login/ opens a Django session for the
// seeded `admin` user (seed_dev sets password == username). We drive it through
// the Vite proxy so the sessionid cookie is set on the E2E origin, and mirror the
// SPA's dev-auth snapshot into localStorage so the admin UI renders logged-in on
// first paint (matches the legacy tests/e2e/*.mjs drivers).
import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "tests/e2e-pw/.auth/admin.json";

setup("authenticate as admin via dev-login", async ({ page }) => {
  const res = await page.request.post("/api/casework/auth/dev-login/", {
    data: { username: "admin", password: "admin" },
  });
  expect(
    res.ok(),
    `dev-login failed (${res.status()}). Is the backend up with DEV_AUTH on and seed_dev run?`,
  ).toBeTruthy();
  const body = await res.json();
  const csrf: string = body.csrftoken ?? "e2e-csrf";

  // Use the REAL role snapshot the backend returned — do not fabricate it. If a
  // regression stopped dev-login granting admin, this fails HERE (loudly) instead
  // of the admin specs silently passing on a faked localStorage snapshot.
  // v3 authz model: admin is a Django superuser with NO group, so `roles` is
  // empty and admin-ness is carried by the `is_admin` bool.
  expect(
    body.is_admin === true,
    `dev-login did not return an admin (is_admin) snapshot: ${JSON.stringify(body)}`,
  ).toBeTruthy();

  const devUser = {
    username: body.username,
    roles: body.roles,
    is_admin: body.is_admin,
  };

  await page.addInitScript(
    ({ user, csrfToken }) => {
      localStorage.setItem("jawafdehi.devAuth.user", JSON.stringify(user));
      localStorage.setItem("jawafdehi.devAuth.csrf", csrfToken as string);
      // Pre-answer the cookie-consent banner so its fixed bar doesn't intercept clicks.
      localStorage.setItem("jawafdehi_analytics_consent", "denied");
    },
    { user: devUser, csrfToken: csrf },
  );

  // Land on the SPA so localStorage is written to the right origin, then persist.
  await page.goto("/admin/");
  await page.context().storageState({ path: AUTH_FILE });
});
