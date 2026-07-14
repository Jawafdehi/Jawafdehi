// Headless verify driver for the casework review flow (consolidated design):
//   1. list is navigational — one row per case, LATEST run only, NO submit here
//   2. search / row-click NAVIGATE to the case page (they never start a review)
//   3. the per-case page HOSTS the reviews: run switcher + selected run's full
//      breakdown inline, and is the only place a new review is triggered
//   4. legacy /admin/reviews/:id redirects to /admin/reviews/case/:slug?run=:id
// Requires: mock API on :48000 (bun tests/e2e/mock-api.ts) and the dev server
// started with VITE_DEV_AUTH=true (port via E2E_BASE_URL, default :40115).
//   node tests/e2e/casework-reviews.mjs
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:40115";
const SHOTS = process.env.E2E_SHOTS_DIR || "/tmp/e2e-shots";
const PATANJALI = "case-081-cr-0107-patanjali"; // seeded with two runs: #502=88, #501=74

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).split("\n")[0]));
// Track review-submit POSTs so we can assert navigation NEVER starts a review.
const submitPosts = [];
page.on("request", (r) => {
  if (r.method() === "POST" && r.url().includes("/api/casework/reviews/submit/")) {
    submitPosts.push(r.url());
  }
});

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

await page.addInitScript(() => {
  localStorage.setItem(
    "jawafdehi.devAuth.user",
    JSON.stringify({ username: "e2e-admin", roles: [], is_admin: true }),
  );
  localStorage.setItem("jawafdehi.devAuth.csrf", "e2e-csrf");
  localStorage.setItem("jawafdehi_analytics_consent", "denied");
});

// === 1. List: slim + navigational (no submit / no re-run here) =============
console.log("\n== List: slim, navigational ==");
await page.goto(BASE + "/admin/reviews", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Case reviews" }).waitFor({ timeout: 30000 });
check("autocomplete combobox present", (await page.getByRole("combobox").count()) === 1);
check("latest score (88) shown on list", (await page.getByText("88", { exact: true }).count()) >= 1);
check("older run score (74) hidden on list", (await page.getByText("74", { exact: true }).count()) === 0);
check("no Re-run button on the list", (await page.getByRole("button", { name: /Re-run/ }).count()) === 0);

// Clicking a case row NAVIGATES to its case page and starts NOTHING. Click the
// slug text (bubbles to the row's onClick) — a stable hook not tied to styling.
let n = submitPosts.length;
await page.getByText(PATANJALI, { exact: true }).click();
await page.waitForURL(new RegExp(`/admin/reviews/case/${PATANJALI}$`), { timeout: 15000 });
check("row click navigates to the case page", true, page.url());
check("row click started no review", submitPosts.length === n, `submits=${submitPosts.length - n}`);

// === 2. Per-case page HOSTS the reviews (run switcher + inline breakdown) ===
console.log("\n== Per-case page: run switcher + inline breakdown ==");
check("shows Runs (2)", (await page.getByText(/Runs \(2\)/).count()) === 1);
// Latest run (#502) is selected by default; its full breakdown renders inline.
await page.getByText("Sources attached").first().waitFor({ timeout: 15000 });
check("latest run breakdown renders inline (run #502)", (await page.getByText("run #502").count()) >= 1);
check(
  "breakdown shows the rule cards (inline, not a separate page)",
  (await page.getByText("Sources attached").count()) >= 1,
);

// Select the older run (#501=74) — the breakdown switches in place.
await page.locator("li", { hasText: "#501" }).first().click();
await page.getByText("run #501").first().waitFor({ timeout: 10000 });
check("selecting a run swaps the breakdown in place", (await page.getByText("run #501").count()) >= 1);
check("selecting a run deep-links via ?run=", page.url().includes("run=501"), page.url());
await page.screenshot({ path: `${SHOTS}/reviews-per-case-hosted.png`, fullPage: true });

// Source viewer is the shared Dialog primitive (focus trap + Escape-to-close).
await page.getByRole("button", { name: /View/ }).first().click();
const dialog = page.getByRole("dialog");
await dialog.waitFor({ timeout: 10000 });
check("source viewer opens as a dialog", (await dialog.getByText("Charge sheet").count()) >= 1);
await page.keyboard.press("Escape");
await dialog.waitFor({ state: "hidden", timeout: 10000 });
check("Escape closes the source dialog", (await page.getByRole("dialog").count()) === 0);

// === 3. Search NAVIGATES to a case (never auto-submits) ====================
console.log("\n== Search navigates, does not submit ==");
await page.goto(BASE + "/admin/reviews", { waitUntil: "networkidle" });
await page.getByRole("combobox").click();
const search = page.getByPlaceholder("Search cases by title…");
await search.click();
await search.pressSequentially("Ncell", { delay: 30 });
await page.waitForResponse(
  (r) => r.url().includes("/api/cases/") && r.url().toLowerCase().includes("search=ncell"),
  { timeout: 10000 },
);
await page.getByRole("option").first().waitFor({ timeout: 10000 });
n = submitPosts.length;
await page.getByRole("option").first().click();
await page.waitForURL(/\/admin\/reviews\/case\/case-ncell/, { timeout: 15000 });
check("search click navigates to the case page", /\/admin\/reviews\/case\/case-ncell/.test(page.url()), page.url());
check("search click started NO review", submitPosts.length === n, `submits=${submitPosts.length - n}`);
const ncellSlug = decodeURIComponent(page.url().split("/admin/reviews/case/")[1].split("?")[0]);
// A never-reviewed case shows the empty state + a Run-review trigger.
check("zero-run case shows empty state", (await page.getByText(/No reviews for this case yet/).count()) === 1);
check("case page offers a Run review trigger", (await page.getByRole("button", { name: /Run review/ }).count()) === 1);

// === 4. Trigger a review — only on the case page ===========================
console.log("\n== Trigger a review on the case page ==");
n = submitPosts.length;
const [submitReq] = await Promise.all([
  page.waitForRequest(
    (r) => r.method() === "POST" && r.url().includes("/api/casework/reviews/submit/"),
    { timeout: 10000 },
  ),
  page.getByRole("button", { name: /Run review/ }).click(),
]);
check(
  "Run review submits the picked case's slug",
  submitReq.postDataJSON().slug === ncellSlug,
  submitReq.postDataJSON().slug,
);
await page.getByText(/Runs \(1\)/).waitFor({ timeout: 15000 });
await page.getByText("Sources attached").first().waitFor({ timeout: 15000 });
check("new run appears with its breakdown inline", (await page.getByText("91", { exact: true }).count()) >= 1);

// === 5. Legacy /admin/reviews/:id redirects to the case page ===============
console.log("\n== Legacy per-run URL redirects ==");
await page.goto(BASE + "/admin/reviews/502", { waitUntil: "networkidle" });
await page.waitForURL(new RegExp(`/admin/reviews/case/${PATANJALI}\\?run=502`), { timeout: 15000 });
check("/admin/reviews/502 redirects to the case page ?run=502", page.url().includes(`case/${PATANJALI}?run=502`), page.url());
await page.getByText("run #502").first().waitFor({ timeout: 15000 });
check("redirect lands on the right run's breakdown", (await page.getByText("run #502").count()) >= 1);

// The dev SSR harness emits a hydration-mismatch error on every full admin-route
// load (reproducible on unchanged pages), so ignore that known artifact and only
// fail on unexpected runtime errors.
const IGNORE = /Hydration failed|error while hydrating/;
const realErrors = pageErrors.filter((e) => !IGNORE.test(e));
console.log("\npageErrors (real):", realErrors.length ? realErrors : "none");
console.log(`pageErrors (ignored hydration): ${pageErrors.length - realErrors.length}`);
if (realErrors.length) failures += realErrors.length;
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
