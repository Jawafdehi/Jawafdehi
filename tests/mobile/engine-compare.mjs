// SPDX-License-Identifier: Hippocratic-3.0
// Cross-engine comparison at one phone viewport.
//
// Viewport size and rendering engine are two independent defect axes. The main
// audit varies size on Chromium only; this varies the engine at a fixed size,
// so a WebKit-only layout break can be told apart from a narrow-viewport break.
//
// HONEST LIMIT, and it matters for the guideline: Playwright's `webkit` is
// WebKit built for Linux. It shares Safari's layout and CSS engine, so it
// catches WebKit-specific layout and CSS-support differences — but it is NOT
// Safari on iOS. It does not reproduce iOS's focus-zoom on small-font inputs,
// the collapsing-toolbar dynamic viewport, momentum/rubber-band scrolling,
// -webkit-overflow-scrolling, or Safari's own JIT/GC timing. Those need a real
// device or a device cloud.
import { chromium, webkit, firefox, devices as pw } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const BASE = (arg("base", "https://jawafdehi.org") || "").replace(/\/$/, "");
const OUT = arg("out", "test-results/mobile/engines");

const ROUTES = [["/", "home"], ["/cases", "cases"], ["/search?q=%E0%A4%AC%E0%A5%88%E0%A4%82%E0%A4%95", "search-results"], ["/data-quality", "data-quality"], ["/report", "report-form"], ["/research/corruption-accountability", "research"], ["/donate", "donate"]];

// Deliberately narrow: layout-only signals, so engines are comparable.
const SNAP = () => {
  const vw = innerWidth;
  const clip = (el) => {
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === "hidden" || ox === "clip" || ox === "auto" || ox === "scroll") return true;
    }
    return false;
  };
  const offenders = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (r.right - vw <= 1) continue;
    if (clip(el)) continue;
    offenders.push({ tag: el.tagName.toLowerCase(), cls: (el.getAttribute("class") || "").slice(0, 70), over: Math.round(r.right - vw) });
    if (offenders.length > 12) break;
  }
  // Per-section heights make an engine-dependent layout shift visible as a
  // height delta rather than requiring a pixel diff.
  const sections = Array.from(document.querySelectorAll("main section, main > div > section, section"))
    .slice(0, 14)
    .map((s) => ({ id: s.id || null, h: Math.round(s.getBoundingClientRect().height) }));
  return {
    scrollW: document.documentElement.scrollWidth,
    scrollH: document.documentElement.scrollHeight,
    vw, overflowPx: Math.max(0, document.documentElement.scrollWidth - vw),
    offenders, sections,
    fontsLoaded: Array.from(document.fonts).filter((f) => f.status === "loaded").map((f) => `${f.family}/${f.weight}`).sort(),
    bodyFont: getComputedStyle(document.body).fontFamily.slice(0, 80),
    h1: (() => { const h = document.querySelector("h1"); if (!h) return null; const r = h.getBoundingClientRect(); return { h: Math.round(r.height), fs: getComputedStyle(h).fontSize, text: (h.innerText || "").trim().slice(0, 40) }; })(),
  };
};

const ENGINES = [["chromium", chromium], ["webkit", webkit], ["firefox", firefox]];

async function main() {
  await fs.mkdir(path.join(OUT, "shots"), { recursive: true });
  const rows = [];
  for (const [name, type] of ENGINES) {
    let browser;
    try { browser = await type.launch(); } catch (e) { console.log(`${name}: launch failed — ${String(e).slice(0, 100)}`); continue; }
    const ctx = await browser.newContext({
      // 390x664 = the real iPhone 12-15 viewport (844 is the screen). The
      // 2026-08-16 audit ran this at 390x844; the figures in that report are
      // for 844 and will differ slightly from a fresh run here.
      viewport: { width: 390, height: 664 },
      userAgent: name === "webkit" ? pw["iPhone 14"].userAgent : pw["Galaxy S9+"].userAgent,
      deviceScaleFactor: 2, isMobile: name !== "firefox", hasTouch: name !== "firefox", locale: "ne-NP",
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: "jawafdehi_analytics_consent", value: "denied" }] }] },
    }).catch(async () => browser.newContext({ viewport: { width: 390, height: 664 }, locale: "ne-NP" }));
    for (const [route, slug] of ROUTES) {
      const page = await ctx.newPage();
      let row = { engine: name, route, slug, ok: false };
      try {
        await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(1500);
        row = { ...row, ok: true, ...(await page.evaluate(SNAP)) };
        const f = path.join(OUT, "shots", `${name}__${slug}.png`);
        await page.screenshot({ path: f, fullPage: false }).catch(() => {});
        row.shot = f;
      } catch (e) { row.error = String(e).split("\n")[0].slice(0, 140); }
      await page.close();
      rows.push(row);
      console.log(`${name.padEnd(9)} ${slug.padEnd(16)} scrollH=${String(row.scrollH ?? "-").padStart(6)} ovf=${String(row.overflowPx ?? "-").padStart(4)} offenders=${String(row.offenders ? row.offenders.length : "-").padStart(2)} fonts=${String(row.fontsLoaded ? row.fontsLoaded.length : "-").padStart(2)} h1=${row.h1 ? row.h1.fs + "/" + row.h1.h + "px" : "-"}${row.error ? " ERR " + row.error.slice(0, 50) : ""}`);
    }
    await ctx.close(); await browser.close();
  }
  await fs.writeFile(path.join(OUT, "engines.json"), JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), rows }, null, 2));

  // diff the engines per route
  console.log("\n=== per-route engine deltas (scrollH, overflow) ===");
  const bySlug = {};
  for (const r of rows) { (bySlug[r.slug] = bySlug[r.slug] || {})[r.engine] = r; }
  for (const [slug, m] of Object.entries(bySlug)) {
    const c = m.chromium, w = m.webkit, f = m.firefox;
    const d = (a, b) => (a && b && a.scrollH && b.scrollH ? b.scrollH - a.scrollH : "n/a");
    console.log(`${slug.padEnd(16)} chromium=${String(c && c.scrollH).padStart(6)}  webkit Δ=${String(d(c, w)).padStart(6)}  firefox Δ=${String(d(c, f)).padStart(6)}  ovf(c/w/f)=${c && c.overflowPx}/${w && w.overflowPx}/${f && f.overflowPx}`);
  }
  console.log(`\nwrote ${path.join(OUT, "engines.json")}`);
}
main();
