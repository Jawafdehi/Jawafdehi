// SPDX-License-Identifier: Hippocratic-3.0
// Mobile responsiveness audit driver.
//
//   node tests/mobile/audit.mjs --base https://jawafdehi.org --out test-results/mobile/audit
//   node tests/mobile/audit.mjs --device android-360 --route home --shots 0
//
// Always exits 0 — an instrument, not a gate. Writes findings.json plus one
// full-page screenshot per (device, route).
import { chromium, devices as pw } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { PROBE } from "./probe.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const BASE = (arg("base", "https://jawafdehi.org") || "").replace(/\/$/, "");
const OUT = arg("out", "test-results/mobile/audit");
const ONLY_ROUTE = arg("route", null);
const ONLY_DEVICE = arg("device", null);
const SHOTS = arg("shots", "1") !== "0";
const INTERACT = arg("interact", "1") !== "0";

// IDs match the `mobile-*` project names in playwright.config.ts so there is one
// vocabulary for both halves. The first four ARE Tier A; the rest are Tier B.
// See docs/testing/mobile-and-responsive-testing.md §2.
export const DEVICES = [
  { id: "mobile-android", label: "Android 360x640 @3x — widest-share Android width class", viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: pw["Galaxy S9+"].userAgent },
  { id: "mobile-floor", label: "320x568 @2x — hard floor: iPhone SE1 / low-end Android", viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: pw["Galaxy S9+"].userAgent },
  { id: "mobile-ios", label: "iPhone 14 (390x844)", ...pw["iPhone 14"] },
  { id: "mobile-short", label: "Android landscape 640x360 — SHORT, not narrow", viewport: { width: 640, height: 360 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: pw["Galaxy S9+"].userAgent },
  // NB: Playwright's "iPhone SE" descriptor is the 1st-gen SE at 320x568 — NOT
  // the SE 2/3 at 375x667. Pin 375 explicitly rather than trusting the name.
  { id: "iphone-se3", label: "iPhone SE 2/3 (375x667)", viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: pw["iPhone 12"].userAgent },
  { id: "pixel-7", label: "Pixel 7 (412x915)", ...pw["Pixel 7"] },
  { id: "ipad-portrait", label: "iPad portrait (810x1080) — 0.45% of NP traffic", ...pw["iPad (gen 7)"] },
];

export const ROUTES = [
  ["/", "home"],
  ["/cases", "cases"],
  ["/search?q=%E0%A4%AC%E0%A5%88%E0%A4%82%E0%A4%95", "search-results"],
  ["/search", "search-empty"],
  ["/entities", "entities"],
  ["/materials", "materials"],
  ["/courtcases", "courtcases"],
  ["/data-quality", "data-quality"],
  ["/updates", "updates"],
  ["/report", "report-form"],
  ["/feedback", "feedback-form"],
  ["/volunteer", "volunteer"],
  ["/donate", "donate"],
  ["/about", "about"],
  ["/team", "team"],
  ["/our-process", "our-process"],
  ["/commitment", "commitment"],
  ["/faq", "faq"],
  ["/research/corruption-accountability", "research"],
  ["/products", "products"],
  ["/saptahik", "saptahik"],
  ["/privacy", "privacy"],
  ["/terms", "terms"],
];

async function probePage(page, requestedWidth) { return page.evaluate(PROBE, requestedWidth); }

// After the static probe, exercise the things only a touch user hits: the
// hamburger menu, the in-page search command palette, and the first detail link.
async function interactions(page, dev, slug, outDir) {
  const acts = [];
  const shot = async (name) => {
    if (!SHOTS) return null;
    const f = path.join(outDir, "shots", `${dev.id}__${slug}__${name}.png`);
    await page.screenshot({ path: f, fullPage: false }).catch(() => {});
    return f;
  };

  // --- mobile nav ---
  // The trigger's accessible name comes from an sr-only <span> (Navbar.tsx:427),
  // not an aria-label, so match by role+name rather than by attribute.
  const burger = page.getByRole("button", { name: /^(मेनु|Menu)$/i }).first();
  if (await burger.count().catch(() => 0)) {
    try {
      await burger.click({ timeout: 4000 });
      await page.waitForTimeout(700);
      const p = await probePage(page, dev.viewport.width);
      // Can the whole menu be reached? Measure the open panel.
      const panel = await page.evaluate(() => {
        const cands = Array.from(document.querySelectorAll('[role=dialog],[data-state=open],nav'))
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter((c) => c.r.height > 120 && c.r.width > window.innerWidth * 0.5 && getComputedStyle(c.el).display !== "none");
        if (!cands.length) return null;
        const c = cands.sort((a, b) => b.r.height * b.r.width - a.r.height * a.r.width)[0];
        const cs = getComputedStyle(c.el);
        const links = Array.from(c.el.querySelectorAll("a[href],button")).filter((l) => l.getBoundingClientRect().height > 0);
        const last = links.length ? links[links.length - 1].getBoundingClientRect() : null;
        return {
          h: Math.round(c.r.height), w: Math.round(c.r.width),
          scrollH: c.el.scrollHeight, clientH: c.el.clientHeight,
          overflowY: cs.overflowY, position: cs.position,
          itemCount: links.length,
          lastItemBottom: last ? Math.round(last.bottom) : null,
          viewportH: window.innerHeight,
          lastItemBelowFold: last ? last.bottom > window.innerHeight + 1 : null,
          panelScrollable: c.el.scrollHeight > c.el.clientHeight + 1,
        };
      });
      acts.push({ action: "open-mobile-nav", ok: true, panel, probe: { overflowPx: p.overflowPx, tapCounts: p.tapCounts, tapTargets: p.tapTargets.filter((t) => t.verdict !== "pass_wcag258_via_exception").slice(0, 20) }, shot: await shot("nav-open") });
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(400);
    } catch (e) { acts.push({ action: "open-mobile-nav", ok: false, error: String(e).slice(0, 160) }); }
  } else {
    acts.push({ action: "open-mobile-nav", ok: false, error: "no hamburger found" });
  }

  // --- first "view detail" style link, to reach a real detail page ---
  if (slug === "cases" || slug === "search-results") {
    const link = page.locator('a[href^="/case/"], a[href^="/courtcase/"], a[href^="/entity/"]').first();
    if (await link.count().catch(() => 0)) {
      try {
        const href = await link.getAttribute("href");
        await link.click({ timeout: 6000 });
        await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const p = await probePage(page, dev.viewport.width);
        acts.push({ action: "open-detail", ok: true, href, url: page.url(), probe: p, shot: await shot("detail") });
        if (SHOTS) await page.screenshot({ path: path.join(outDir, "shots", `${dev.id}__detail-full.png`), fullPage: true }).catch(() => {});
      } catch (e) { acts.push({ action: "open-detail", ok: false, error: String(e).slice(0, 160) }); }
    }
  }
  return acts;
}

async function main() {
  await fs.mkdir(path.join(OUT, "shots"), { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  const devs = ONLY_DEVICE ? DEVICES.filter((d) => d.id === ONLY_DEVICE) : DEVICES;
  const routes = ONLY_ROUTE ? ROUTES.filter((r) => r[1] === ONLY_ROUTE) : ROUTES;

  for (const dev of devs) {
    const ctx = await browser.newContext({
      viewport: dev.viewport, userAgent: dev.userAgent,
      deviceScaleFactor: dev.deviceScaleFactor, isMobile: dev.isMobile, hasTouch: dev.hasTouch,
      locale: "ne-NP",
      // DENY analytics up front (key/values from src/lib/consent.ts) so the
      // banner never masks the fold and no beacon is sent to their analytics.
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: "jawafdehi_analytics_consent", value: "denied" }] }] },
    });
    for (const [route, slug] of routes) {
      const url = BASE + route;
      const page = await ctx.newPage();
      const consoleErrors = [];
      page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
      page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 200)));
      let rec = { device: dev.id, deviceLabel: dev.label, viewportSpec: dev.viewport, route, slug, url, ok: false };
      try {
        const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        rec.status = resp ? resp.status() : null;
        await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
        await page.waitForTimeout(1000);
        const probe = await probePage(page, dev.viewport.width);
        rec = { ...rec, ok: true, ...probe, consoleErrors: consoleErrors.slice(0, 8) };
        if (SHOTS) {
          rec.shot = path.join(OUT, "shots", `${dev.id}__${slug}.png`);
          await page.screenshot({ path: rec.shot, fullPage: true }).catch(() => {});
          rec.shotFold = path.join(OUT, "shots", `${dev.id}__${slug}__fold.png`);
          await page.screenshot({ path: rec.shotFold, fullPage: false }).catch(() => {});
        }
        if (INTERACT && (slug === "home" || slug === "cases" || slug === "search-results" || slug === "report-form")) {
          rec.interactions = await interactions(page, dev, slug, OUT);
        }
      } catch (e) { rec.error = String(e).slice(0, 300); }
      await page.close();
      results.push(rec);
      const tc = rec.tapCounts || {};
      console.log(
        `${dev.id.padEnd(18)} ${slug.padEnd(17)}` +
        ` ovf=${String(rec.overflowPx ?? "-").padStart(4)}px` +
        ` zoomOut=${String(rec.zoomedOutPct ?? "-").padStart(3)}%` +
        ` AAfail=${String(tc.FAIL_wcag258_AA || 0).padStart(3)}` +
        ` <44=${String(tc.below_44_advisory || 0).padStart(3)}` +
        ` zoomIn=${String(rec.zoomInputs ? rec.zoomInputs.length : "-").padStart(2)}` +
        ` tiny=${String(rec.tinyText ? rec.tinyText.length : "-").padStart(2)}` +
        ` vh=${String(rec.vhTraps ? rec.vhTraps.length : "-").padStart(2)}` +
        (rec.error ? ` ERR ${rec.error.slice(0, 70)}` : "")
      );
    }
    await ctx.close();
  }
  await browser.close();
  await fs.writeFile(path.join(OUT, "findings.json"), JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), devices: devs.map((d) => ({ id: d.id, label: d.label, viewport: d.viewport })), results }, null, 2));
  console.log(`\nwrote ${path.join(OUT, "findings.json")} — ${results.length} page-runs`);
}

main();
