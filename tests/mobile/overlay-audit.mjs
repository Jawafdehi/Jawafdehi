// SPDX-License-Identifier: Hippocratic-3.0
// Overlay reachability audit.
//
// A centred `position: fixed` dialog with no max-height, or a full-height sheet
// with no `overflow-y-auto`, renders content OUTSIDE the viewport that no scroll
// gesture can reach — the page behind is scroll-locked and the panel itself does
// not scroll. The submit button, or the close button, simply cannot be tapped.
// That is invisible to a desktop run and to any viewport tall enough to fit the
// content, so it needs its own probe at phone heights, portrait AND landscape.
//
//   node tests/mobile/overlay-audit.mjs --base https://jawafdehi.org --out test-results/mobile/overlays
import { chromium, devices as pw } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const BASE = (arg("base", "https://jawafdehi.org") || "").replace(/\/$/, "");
const OUT = arg("out", "test-results/mobile/overlays");

const VIEWPORTS = [
  { id: "portrait-360x640", width: 360, height: 640 },
  { id: "portrait-320x568", width: 320, height: 568 },
  { id: "landscape-640x360", width: 640, height: 360 },
  // 390x664 is the REAL iPhone 12/13/14/15 viewport; 390x844 is the screen.
  { id: "portrait-390x664-iphone14", width: 390, height: 664 },
  { id: "portrait-412x839-pixel7", width: 412, height: 839 },
];

// Measure the topmost open overlay: how much of it sits outside the viewport,
// and whether anything can scroll it into view.
const MEASURE = () => {
  const vh = window.innerHeight, vw = window.innerWidth;
  const panels = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"]'))
    .filter((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      const r = el.getBoundingClientRect();
      return r.width > 40 && r.height > 40;
    });
  if (!panels.length) return { open: false };
  // topmost by z-index / DOM order
  const el = panels[panels.length - 1];
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);

  const selfScrolls = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1;
  // any descendant scroll container that could hold the overflowing content
  let descendantScrolls = null;
  for (const d of el.querySelectorAll("*")) {
    const dcs = getComputedStyle(d);
    if (/(auto|scroll)/.test(dcs.overflowY) && d.scrollHeight > d.clientHeight + 1) {
      const dr = d.getBoundingClientRect();
      descendantScrolls = { h: Math.round(dr.height), scrollH: d.scrollHeight, clientH: d.clientHeight };
      break;
    }
  }

  const aboveTop = Math.max(0, Math.round(-r.top));
  const belowBottom = Math.max(0, Math.round(r.bottom - vh));

  // Interactive controls inside the panel, and whether each is inside the viewport.
  const controls = Array.from(el.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button]'))
    .map((c) => {
      const cr = c.getBoundingClientRect();
      if (cr.width === 0 || cr.height === 0) return null;
      const label = (c.getAttribute("aria-label") || c.innerText || c.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50);
      return {
        label: label || `<${c.tagName.toLowerCase()}>`,
        tag: c.tagName.toLowerCase(),
        top: Math.round(cr.top), bottom: Math.round(cr.bottom),
        h: Math.round(cr.height), w: Math.round(cr.width),
        inViewport: cr.top >= -1 && cr.bottom <= vh + 1,
        aboveViewport: cr.bottom < 0,
        belowViewport: cr.top > vh,
      };
    })
    .filter(Boolean);

  return {
    open: true,
    viewport: { w: vw, h: vh },
    panel: {
      role: el.getAttribute("role"),
      cls: (el.getAttribute("class") || "").slice(0, 200),
      rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) },
      position: cs.position, overflowY: cs.overflowY, maxHeight: cs.maxHeight,
      scrollH: el.scrollHeight, clientH: el.clientHeight,
      selfScrolls, descendantScrolls,
      aboveTop, belowBottom,
      // The defect: content outside the viewport with nothing able to scroll it.
      unreachablePx: (selfScrolls || descendantScrolls) ? 0 : aboveTop + belowBottom,
    },
    controls,
    controlsOutOfView: controls.filter((c) => !c.inViewport).map((c) => ({ label: c.label, top: c.top, bottom: c.bottom })),
    bodyScrollLocked: getComputedStyle(document.body).overflow === "hidden" || document.body.hasAttribute("data-scroll-locked"),
  };
};

// Each scenario: navigate, then open one overlay.
const SCENARIOS = [
  {
    id: "mobile-nav",
    route: "/",
    open: async (page) => { await page.getByRole("button", { name: /^(मेनु|Menu)$/i }).first().click({ timeout: 8000 }); },
  },
  {
    id: "search-command",
    route: "/",
    open: async (page) => {
      const b = page.getByRole("button", { name: /खोज|search/i }).first();
      await b.click({ timeout: 8000 });
    },
  },
  {
    id: "report-case-dialog",
    route: "/",
    open: async (page) => {
      const b = page.getByRole("button", { name: /मुद्दा दर्ता|रिपोर्ट|report a case|report case/i }).first();
      await b.click({ timeout: 8000 });
    },
  },
  {
    id: "newsletter-modal",
    route: "/",
    open: async (page) => {
      const b = page.getByRole("button", { name: /सदस्यता|subscribe|newsletter/i }).first();
      await b.click({ timeout: 8000 });
    },
  },
  {
    id: "use-this-data",
    route: "/data-quality",
    open: async (page) => {
      const b = page.getByRole("button", { name: /डेटा|use this data|API/i }).first();
      await b.click({ timeout: 8000 });
    },
  },
  {
    id: "share-dialog",
    route: "/cases",
    open: async (page) => {
      await page.locator('a[href^="/case/"]').first().click({ timeout: 10000 });
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const b = page.getByRole("button", { name: /सेयर|share/i }).first();
      await b.click({ timeout: 8000 });
    },
  },
  {
    id: "document-preview",
    route: "/cases",
    open: async (page) => {
      await page.locator('a[href^="/case/"]').first().click({ timeout: 10000 });
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const b = page.getByRole("button", { name: /हेर्नुहोस्|preview|view document|प्रमाण/i }).first();
      await b.click({ timeout: 8000 });
    },
  },
];

async function main() {
  await fs.mkdir(path.join(OUT, "shots"), { recursive: true });
  const browser = await chromium.launch();
  const rows = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: pw["Galaxy S9+"].userAgent,
      deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ne-NP",
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: "jawafdehi_analytics_consent", value: "denied" }] }] },
    });
    for (const sc of SCENARIOS) {
      const page = await ctx.newPage();
      let row = { viewport: vp.id, scenario: sc.id, route: sc.route, ok: false };
      try {
        await page.goto(BASE + sc.route, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
        await page.waitForTimeout(1200);
        await sc.open(page);
        await page.waitForTimeout(1200);
        const m = await page.evaluate(MEASURE);
        row = { ...row, ok: true, ...m };
        const f = path.join(OUT, "shots", `${vp.id}__${sc.id}.png`);
        await page.screenshot({ path: f }).catch(() => {});
        row.shot = f;
      } catch (e) {
        row.error = String(e).split("\n")[0].slice(0, 140);
      }
      await page.close();
      rows.push(row);
      const p = row.panel;
      console.log(
        `${vp.id.padEnd(20)} ${sc.id.padEnd(20)}` +
        (row.open === false ? " NO-OVERLAY-OPENED" :
          p ? ` h=${String(p.rect.h).padStart(4)} top=${String(p.rect.top).padStart(5)} scrolls=${p.selfScrolls || !!p.descendantScrolls ? "Y" : "N"} UNREACHABLE=${String(p.unreachablePx).padStart(4)}px offscreenCtrls=${row.controlsOutOfView.length}` : "") +
        (row.error ? ` ERR ${row.error.slice(0, 60)}` : "")
      );
    }
    await ctx.close();
  }
  await browser.close();
  await fs.writeFile(path.join(OUT, "overlays.json"), JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), rows }, null, 2));
  console.log(`\nwrote ${path.join(OUT, "overlays.json")}`);
}

main();
