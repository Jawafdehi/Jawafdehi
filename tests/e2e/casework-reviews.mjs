// Headless verify driver for the redesigned casework review flow:
//   1. autocomplete case-search submit (no more raw-IRI box)
//   2. slimmed list — one row per case, LATEST run only
//   3. new per-case review page (/admin/reviews/case/:slug) with run history
//   4. run detail (/admin/reviews/:id) still serves the full breakdown
// Requires: mock API on :48000 (bun tests/e2e/mock-api.ts) and the dev server
// started with VITE_DEV_AUTH=true (port via E2E_BASE_URL, default :40115).
//   node tests/e2e/casework-reviews.mjs
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:40115";
const SHOTS = process.env.E2E_SHOTS_DIR || "/tmp/e2e-shots";
const PATANJALI = "case-081-cr-0107-patanjali"; // seeded with two runs (88, 74)

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).split("\n")[0]));

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

// Dev-auth session snapshot (see src/services/dev-auth-constants.ts) + cookie
// consent pre-answered so its fixed bar can't intercept clicks.
await page.addInitScript(() => {
  localStorage.setItem(
    "jawafdehi.devAuth.user",
    JSON.stringify({ username: "e2e-admin", roles: [], is_admin: true }),
  );
  localStorage.setItem("jawafdehi.devAuth.csrf", "e2e-csrf");
  localStorage.setItem("jawafdehi_analytics_consent", "denied");
});

// === 1. List loads, one row per case, LATEST run only ======================
console.log("\n== List: slim, one row per case ==");
await page.goto(BASE + "/admin/reviews", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Case reviews" }).waitFor({ timeout: 30000 });

// The IRI box is gone; the submit control is the autocomplete combobox.
check(
  "no raw-IRI textbox",
  (await page.locator('input[placeholder*="jawafdehi.org/case"]').count()) === 0,
);
check("autocomplete combobox present", (await page.getByRole("combobox").count()) === 1);

// Seeded patanjali case: latest run is 88/PASS; the older 74 must NOT show.
check("latest score (88) shown on list", (await page.getByText("88", { exact: true }).count()) >= 1);
check("older run score (74) hidden on list", (await page.getByText("74", { exact: true }).count()) === 0);
const rerunButtons = await page.getByRole("button", { name: "Re-run" }).count();
check("one Re-run per case (1 case seeded)", rerunButtons === 1, `count=${rerunButtons}`);
await page.screenshot({ path: `${SHOTS}/reviews-list.png`, fullPage: true });

// === 2. Autocomplete submit ================================================
console.log("\n== Autocomplete: search + submit ==");
await page.getByRole("combobox").click();
const search = page.getByPlaceholder("Search cases by title…");
await search.waitFor({ timeout: 10000 });
await search.click();
await search.pressSequentially("Ncell", { delay: 30 });
await page.waitForResponse(
  (r) => r.url().includes("/api/cases/") && r.url().toLowerCase().includes("search=ncell"),
  { timeout: 10000 },
);
await page.getByRole("option").first().waitFor({ timeout: 10000 });
const optionCount = await page.getByRole("option").count();
check("autocomplete returned matches for 'Ncell'", optionCount >= 1, `options=${optionCount}`);

const [submitReq] = await Promise.all([
  page.waitForRequest(
    (r) => r.method() === "POST" && r.url().includes("/api/casework/reviews/submit/"),
    { timeout: 10000 },
  ),
  page.getByRole("option").first().click(),
]);
const submittedSlug = submitReq.postDataJSON().slug;
check("submit sent a case slug", typeof submittedSlug === "string" && submittedSlug.length > 0, submittedSlug);
check("submitted a Ncell case", String(submittedSlug).startsWith("case-ncell"), submittedSlug);

// === 3. Lands on run detail (full breakdown) ===============================
console.log("\n== Run detail after submit ==");
await page.waitForURL(/\/admin\/reviews\/\d+$/, { timeout: 15000 });
await page.getByText("View case on jawafdehi.org").waitFor({ timeout: 15000 });
check("run detail shows the score (91)", (await page.getByText("91", { exact: true }).count()) >= 1);
check(
  "run detail renders the rule breakdown",
  (await page.getByText("Sources attached").count()) >= 1,
);
await page.screenshot({ path: `${SHOTS}/reviews-run-detail.png`, fullPage: true });

// === 4. Back-link -> per-case page =========================================
console.log("\n== Per-case page (run history) ==");
await page.getByRole("button", { name: /All runs for this case/ }).click();
await page.waitForURL(new RegExp(`/admin/reviews/case/${submittedSlug}$`), { timeout: 15000 });
check(
  "per-case page shows 1 run for the just-submitted case",
  (await page.getByText(/Runs \(1\)/).count()) === 1,
);

// Click the run row -> back to its detail.
await page.locator("ul li").first().click();
await page.waitForURL(/\/admin\/reviews\/\d+$/, { timeout: 15000 });
check("run row opens the run detail", /\/admin\/reviews\/\d+$/.test(page.url()), page.url());

// === 5. List row click -> per-case page; multi-run history ==================
console.log("\n== List row navigation + multi-run history ==");
await page.goto(BASE + "/admin/reviews", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Case reviews" }).waitFor({ timeout: 30000 });
// Two cases now (patanjali + the submitted Ncell) -> two Re-run buttons.
const rerun2 = await page.getByRole("button", { name: "Re-run" }).count();
check("list now has one row per case (2 cases)", rerun2 === 2, `count=${rerun2}`);

// Directly load the patanjali per-case page: its ?slug= history has BOTH runs.
await page.goto(BASE + `/admin/reviews/case/${PATANJALI}`, { waitUntil: "networkidle" });
check("patanjali per-case page shows Runs (2)", (await page.getByText(/Runs \(2\)/).count()) === 1);
check("history shows the latest run (88)", (await page.getByText("88", { exact: true }).count()) >= 1);
check("history shows the older run (74)", (await page.getByText("74", { exact: true }).count()) >= 1);
await page.screenshot({ path: `${SHOTS}/reviews-per-case.png`, fullPage: true });

// The dev SSR harness emits a hydration-mismatch error on every full admin-route
// load (reproducible on unchanged pages like /admin/rules), so ignore that known
// artifact and only fail on unexpected runtime errors.
const IGNORE = /Hydration failed|error while hydrating/;
const realErrors = pageErrors.filter((e) => !IGNORE.test(e));
console.log("\npageErrors (real):", realErrors.length ? realErrors : "none");
console.log(`pageErrors (ignored hydration): ${pageErrors.length - realErrors.length}`);
if (realErrors.length) failures += realErrors.length;
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
