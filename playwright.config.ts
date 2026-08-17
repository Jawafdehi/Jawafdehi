// SPDX-License-Identifier: Hippocratic-3.0
//
// Playwright E2E config — browser-driven user-action tests against a REAL backend.
//
// Two run modes:
//   * Local: this config's `webServer` boots `vite dev` on E2E_PORT (default 40124,
//     off the 40114 dev port so it won't collide) proxied to VITE_API_PROXY_TARGET
//     (the compose backend). Run: `bunx playwright test`.
//   * CI/compose: the compose stack already serves the SPA (frontend service), so
//     set E2E_NO_WEBSERVER=1 and E2E_BASE_URL to that host — Playwright then just
//     drives the already-running server.
//
// Auth: production is OIDC-only, but with VITE_DEV_AUTH=true the SPA accepts a
// Django dev-login session. auth.setup.ts performs a REAL POST
// /api/casework/auth/dev-login/ against the backend and saves storageState, so the
// admin specs exercise a genuine authenticated session (not a faked localStorage
// shortcut). NB: the backend must run with DEV_AUTH on (TESTING/DEBUG) and be
// seeded (seed_dev creates admin/moderator/caseworker) — see docker-compose.e2e.yml.
import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = process.env.E2E_PORT || "40124";
const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${E2E_PORT}`;
const START_WEBSERVER = process.env.E2E_NO_WEBSERVER !== "1";

export default defineConfig({
  testDir: "./tests/e2e-pw",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["junit", { outputFile: "playwright-report/junit.xml" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // One-time: dev-login against the REAL backend, persist the session.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    // Anonymous public smoke — the bulk of the user-action coverage.
    {
      name: "public",
      testIgnore: /.*\.admin\.spec\.ts|.*\.mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    // Authenticated admin/moderation actions — reuse the dev-login session.
    {
      name: "admin",
      testMatch: /.*\.admin\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e-pw/.auth/admin.json",
      },
      dependencies: ["setup"],
    },

    // ---------------------------------------------------------------------
    // Phone matrix. Rationale, sourcing and the full tier table live in
    // docs/testing/mobile-and-responsive-testing.md — read it before adding,
    // removing or resizing an entry here.
    //
    // Two rules these viewports encode:
    //   1. WIDTH and HEIGHT are independent defect axes. A menu that overflows
    //      its panel is a HEIGHT bug and is invisible at any width if the
    //      viewport is tall enough, so `mobile-short` exists purely to be short.
    //   2. These are VIEWPORT sizes, not screen sizes. Android Chrome spends
    //      ~80-120 CSS px of a device's screen height on browser chrome, so a
    //      360x800 handset gives a page roughly 360x690.
    // Two descriptor traps, both of which cost a debugging round:
    //   * `devices["iPhone SE"]` is the 1st-gen SE at 320x568, NOT the SE 2/3
    //     at 375x667. Pin viewports explicitly rather than trusting a name.
    //   * `devices["iPhone 14"]` and `devices["iPad (gen 7)"]` carry
    //     `defaultBrowserType: "webkit"`, so a project spreading them launches
    //     WebKit — which needs system libs most non-Ubuntu Linux hosts lack, and
    //     fails in ~3ms with a missing-libraries error that looks nothing like a
    //     test failure. Tier A is deliberately Chromium-only; real WebKit is
    //     Tier B and runs in the Playwright Docker image. Hence the explicit
    //     `browserName` below.
    // ---------------------------------------------------------------------
    {
      name: "mobile-android",       // widest-share Android width class in NP
      testMatch: /.*\.mobile\.spec\.ts/,
      use: { ...devices["Galaxy S9+"], browserName: "chromium", viewport: { width: 360, height: 640 } },
    },
    {
      name: "mobile-ios",           // iPhone 12/13/14/15 viewport, Chromium engine
      testMatch: /.*\.mobile\.spec\.ts/,
      use: {
        ...devices["iPhone 14"],
        browserName: "chromium",
        // The descriptor's own viewport is 390x664 (Playwright already nets out
        // Safari's chrome from the 390x844 screen). Stated explicitly so nobody
        // "corrects" it to 844 and tests a viewport no iPhone has.
        viewport: { width: 390, height: 664 },
      },
    },
    {
      name: "mobile-floor",         // hard floor: 1st-gen SE, low-end Android
      testMatch: /.*\.mobile\.spec\.ts/,
      use: { ...devices["Galaxy S9+"], browserName: "chromium", viewport: { width: 320, height: 568 } },
    },
    {
      name: "mobile-short",         // landscape phone / split-screen: SHORT, not narrow
      testMatch: /.*\.mobile\.spec\.ts/,
      use: { ...devices["Galaxy S9+"], browserName: "chromium", viewport: { width: 640, height: 360 } },
    },
  ],
  webServer: START_WEBSERVER
    ? {
        command: `bunx vite --host 127.0.0.1 --port ${E2E_PORT} --strictPort`,
        url: `${BASE_URL}/`,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          VITE_DEV_AUTH: "true",
          VITE_API_PROXY_TARGET:
            process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:48000",
        },
      }
    : undefined,
});
