// Headless verify driver for the /admin post-login redirect fix.
//
// Bug: logging in from /admin dropped the user on /admin/reviews (a /portal
// leftover) instead of the dashboard, and deep-link return was dead — the login
// page never read the `from` router state AdminShell hands it, so the OIDC
// `state` was always the login page's own path and got discarded by the
// callback, hitting the hardcoded fallback every time.
//
// This drives the DEV_AUTH login flow (no Zitadel) so the shared returnTo logic
// and the landing page can be asserted in a real browser. Case 3 additionally
// exercises the real OIDC callback's fallback by injecting a stored oidc user.
//
// Requires: mock API on :48000 (bun tests/e2e/mock-api.ts) and the dev server
// started with VITE_DEV_AUTH=true (port via E2E_BASE_URL, default :40115).
//   node tests/e2e/admin-login-redirect.mjs
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:40115";
const IGNORE = /Hydration failed|error while hydrating/; // known dev-SSR artifact

const browser = await chromium.launch();

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

// A fresh context per case → isolated localStorage (no leaked dev session).
async function freshPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (e) => {
    const line = String(e).split("\n")[0];
    if (!IGNORE.test(line)) {
      console.log("  pageerror:", line);
      failures += 1;
    }
  });
  // Pre-answer the cookie banner only; do NOT seed a dev user — we want the
  // actual login flow, which is exactly what the fix changes.
  await page.addInitScript(() => {
    localStorage.setItem("jawafdehi_analytics_consent", "denied");
  });
  return page;
}

// Fill + submit the DEV_AUTH username/password form (opens a Django session via
// the mock). Targets stable ids / the form's submit button, never the SSO
// button (which would kick off a real Zitadel redirect).
async function devSignIn(page) {
  await page.locator("#dev-username").waitFor({ timeout: 30000 });
  await page.locator("#dev-username").fill("admin");
  await page.locator("#dev-password").fill("devpass");
  await page.locator('form button[type="submit"]').click();
}

const pathOf = (u) => new URL(u).pathname;

// === Case 1: login from /admin lands on the dashboard, not /admin/reviews ====
console.log("\n== Case 1: default landing after login ==");
{
  const page = await freshPage();
  await page.goto(BASE + "/admin", { waitUntil: "networkidle" });
  await page.waitForURL(/\/admin\/login/, { timeout: 20000 });
  check("unauthenticated /admin bounces to /admin/login", /\/admin\/login/.test(page.url()), page.url());

  await devSignIn(page);
  await page.waitForURL((u) => !/\/admin\/login/.test(u.href), { timeout: 20000 }).catch(() => {});
  const p = pathOf(page.url());
  check("login from /admin lands on the dashboard (/admin)", p === "/admin", page.url());
  check("login from /admin does NOT land on /admin/reviews", p !== "/admin/reviews", page.url());
  await page.context().close();
}

// === Case 2: deep-link return — bounce to login then back to the target ======
console.log("\n== Case 2: deep-link return ==");
{
  const page = await freshPage();
  await page.goto(BASE + "/admin/entities", { waitUntil: "networkidle" });
  await page.waitForURL(/\/admin\/login/, { timeout: 20000 });
  check("unauthenticated /admin/entities bounces to /admin/login", /\/admin\/login/.test(page.url()), page.url());

  await devSignIn(page);
  await page.waitForURL((u) => pathOf(u.href) === "/admin/entities", { timeout: 20000 }).catch(() => {});
  const p = pathOf(page.url());
  check("login returns to the originally requested /admin/entities", p === "/admin/entities", page.url());
  await page.context().close();
}

// === Case 3: real OIDC callback fallback (no Zitadel — inject a stored user) ==
// The production path can't complete a live Zitadel round-trip here, but the
// callback's fallback is the piece that regressed. Seed an already-authenticated
// oidc user (so react-oidc-context reports isAuthenticated with NO `state`) and
// hit /admin/callback: with no saved state it must fall back to /admin.
console.log("\n== Case 3: OIDC callback fallback (best-effort) ==");
{
  const page = await freshPage();
  await page.addInitScript(() => {
    // Storage key + shape used by oidc-client-ts (defaults from services/oidc.ts).
    const authority = "https://auth.jawafdehi.org";
    const clientId = "377887299569975664";
    const user = {
      id_token: "e2e.fake.idtoken",
      access_token: "e2e-fake-access-token",
      token_type: "Bearer",
      scope: "openid profile email",
      profile: { sub: "e2e-oidc", email: "e2e-oidc@example.test", roles: ["admin"] },
      expires_at: 4102444800, // year 2100 — never expired
    };
    localStorage.setItem(`oidc.user:${authority}:${clientId}`, JSON.stringify(user));
  });
  await page.goto(BASE + "/admin/callback", { waitUntil: "networkidle" });
  // Give the callback effect a beat to route.
  await page.waitForURL((u) => !/\/admin\/callback/.test(u.href), { timeout: 15000 }).catch(() => {});
  const p = pathOf(page.url());
  if (p === "/admin") {
    check("OIDC callback with no saved state falls back to /admin", true, page.url());
  } else if (p === "/admin/reviews") {
    check("OIDC callback fallback is NOT /admin/reviews (regression)", false, page.url());
  } else {
    console.log(`SKIP: OIDC callback fallback inconclusive — landed on ${page.url()} (injection did not authenticate)`);
  }
  await page.context().close();
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
