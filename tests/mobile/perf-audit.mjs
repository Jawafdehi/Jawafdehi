// SPDX-License-Identifier: Hippocratic-3.0
// Mobile performance audit: what a mid-range Android on a Nepali mobile network
// actually pays to load a page.
//
//   node tests/mobile/perf-audit.mjs --base https://jawafdehi.org --out test-results/mobile/perf
//
// Throttling is applied over CDP, not Playwright's (absent) network throttle:
//   * Network: "Slow 4G" — 1.6 Mbit/s down, 750 Kbit/s up, 150 ms RTT. This is
//     Lighthouse's mobile default and is close to a congested Nepali 4G cell.
//   * CPU: 4x slowdown, Lighthouse's mobile default, standing in for a
//     mid-range Snapdragon rather than this build host's Xeon.
// Both are emulation: they model bandwidth and main-thread speed, not radio
// wake-up latency, thermal throttling or a real device's GPU.
import { chromium, devices as pw } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const BASE = (arg("base", "https://jawafdehi.org") || "").replace(/\/$/, "");
const OUT = arg("out", "test-results/mobile/perf");
const RUNS = Number(arg("runs", "2"));

const PROFILES = {
  "slow-4g-cpu4": { label: "Slow 4G + 4x CPU (Lighthouse mobile default)", down: (1.6 * 1024 * 1024) / 8, up: (750 * 1024) / 8, rtt: 150, cpu: 4 },
  "fast-4g-cpu4": { label: "Fast 4G + 4x CPU", down: (9 * 1024 * 1024) / 8, up: (1.5 * 1024 * 1024) / 8, rtt: 85, cpu: 4 },
  "3g-cpu6": { label: "Regular 3G + 6x CPU (low-end phone, weak cell)", down: (780 * 1024) / 8, up: (330 * 1024) / 8, rtt: 300, cpu: 6 },
  unthrottled: { label: "No throttling (baseline)", down: -1, up: -1, rtt: 0, cpu: 1 },
};

const ROUTES = [["/", "home"], ["/cases", "cases"], ["/search?q=%E0%A4%AC%E0%A5%88%E0%A4%82%E0%A4%95", "search-results"], ["/data-quality", "data-quality"], ["/report", "report-form"]];

const VITALS = `
new Promise((resolve) => {
  const out = { lcp: null, cls: 0, fcp: null, longTasks: 0, longTaskMs: 0, tbt: 0 };
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) out.lcp = Math.round(e.startTime); })
      .observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) out.cls += e.value; })
      .observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") out.fcp = Math.round(e.startTime); })
      .observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) { out.longTasks++; out.longTaskMs += e.duration; out.tbt += Math.max(0, e.duration - 50); }
    }).observe({ type: "longtask", buffered: true });
  } catch (e) { out.observerError = String(e); }
  setTimeout(() => {
    const nav = performance.getEntriesByType("navigation")[0] || {};
    out.ttfb = Math.round(nav.responseStart || 0);
    out.domContentLoaded = Math.round(nav.domContentLoadedEventEnd || 0);
    out.loadEvent = Math.round(nav.loadEventEnd || 0);
    out.cls = Math.round(out.cls * 1000) / 1000;
    out.longTaskMs = Math.round(out.longTaskMs);
    out.tbt = Math.round(out.tbt);
    out.fonts = Array.from(document.fonts).filter((f) => f.status === "loaded").map((f) => f.family + " " + f.weight);
    out.domNodes = document.querySelectorAll("*").length;
    out.scrollHeight = document.documentElement.scrollHeight;
    resolve(out);
  }, 5000);
})`;

const typeOf = (url, ct) => {
  if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(url) || /font/.test(ct)) return "font";
  if (/\.(js|mjs)(\?|$)/i.test(url) || /javascript/.test(ct)) return "js";
  if (/\.css(\?|$)/i.test(url) || /text\/css/.test(ct)) return "css";
  if (/\.(png|jpe?g|gif|webp|avif|svg|ico)(\?|$)/i.test(url) || /^image\//.test(ct)) return "image";
  if (/^text\/html/.test(ct)) return "html";
  if (/json/.test(ct)) return "json";
  return "other";
};

async function measure(browser, profile, route, slug, runIdx) {
  const dev = pw["Galaxy S9+"];
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 640 }, userAgent: dev.userAgent,
    deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "ne-NP",
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: "jawafdehi_analytics_consent", value: "denied" }] }] },
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, downloadThroughput: profile.down, uploadThroughput: profile.up, latency: profile.rtt });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });

  const res = [];
  page.on("response", async (r) => {
    try {
      const h = r.headers();
      res.push({
        url: r.url(), status: r.status(),
        type: typeOf(r.url(), h["content-type"] || ""),
        encoding: h["content-encoding"] || "identity",
        declaredLength: Number(h["content-length"] || 0),
        cache: h["cf-cache-status"] || h["age"] || null,
      });
    } catch { /* ignore */ }
  });

  const t0 = Date.now();
  let vitals = {}, err = null;
  try {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 120000 });
    vitals = await page.evaluate(VITALS);
  } catch (e) { err = String(e).slice(0, 200); }
  const wall = Date.now() - t0;

  // real transferred bytes, from the resource timing API (encodedBodySize)
  const timing = await page.evaluate(() => Array.from(performance.getEntriesByType("resource")).map((e) => ({
    name: e.name, initiatorType: e.initiatorType,
    encoded: e.encodedBodySize, decoded: e.decodedBodySize, dur: Math.round(e.duration),
  }))).catch(() => []);
  const navBytes = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return n ? { encoded: n.encodedBodySize, decoded: n.decodedBodySize } : null; }).catch(() => null);

  const byType = {};
  let totalEnc = 0, totalDec = 0;
  for (const t of timing) {
    const m = res.find((r) => r.url === t.name);
    const k = m ? m.type : typeOf(t.name, "");
    byType[k] = byType[k] || { count: 0, encoded: 0, decoded: 0 };
    byType[k].count++; byType[k].encoded += t.encoded; byType[k].decoded += t.decoded;
    totalEnc += t.encoded; totalDec += t.decoded;
  }
  if (navBytes) { byType.html = byType.html || { count: 0, encoded: 0, decoded: 0 }; byType.html.count++; byType.html.encoded += navBytes.encoded; byType.html.decoded += navBytes.decoded; totalEnc += navBytes.encoded; totalDec += navBytes.decoded; }

  const fonts = timing.filter((t) => /\.(woff2?|ttf|otf)(\?|$)/i.test(t.name))
    .map((t) => ({ file: t.name.replace(BASE, ""), encoded: t.encoded, decoded: t.decoded, ms: t.dur }))
    .sort((a, b) => b.encoded - a.encoded);
  const js = timing.filter((t) => /\.(js|mjs)(\?|$)/i.test(t.name))
    .map((t) => ({ file: t.name.replace(BASE, "").slice(0, 90), encoded: t.encoded, decoded: t.decoded, ms: t.dur }))
    .sort((a, b) => b.encoded - a.encoded);

  await ctx.close();
  return { profile: profile.label, route, slug, run: runIdx, wallMs: wall, error: err, ...vitals, totalEncodedBytes: totalEnc, totalDecodedBytes: totalDec, byType, requests: timing.length, fonts, topJs: js.slice(0, 12) };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const rows = [];
  for (const [pid, profile] of Object.entries(PROFILES)) {
    for (const [route, slug] of ROUTES) {
      for (let i = 0; i < RUNS; i++) {
        const r = await measure(browser, profile, route, slug, i);
        r.profileId = pid;
        rows.push(r);
        console.log(
          `${pid.padEnd(14)} ${slug.padEnd(15)} run${i}` +
          ` FCP=${String(r.fcp ?? "-").padStart(6)}ms LCP=${String(r.lcp ?? "-").padStart(6)}ms` +
          ` TBT=${String(r.tbt ?? "-").padStart(5)}ms CLS=${String(r.cls ?? "-").padStart(6)}` +
          ` bytes=${String(Math.round((r.totalEncodedBytes || 0) / 1024)).padStart(5)}KB` +
          ` req=${String(r.requests).padStart(3)} dom=${String(r.domNodes ?? "-").padStart(5)}` +
          (r.error ? ` ERR ${r.error.slice(0, 60)}` : "")
        );
      }
    }
  }
  await browser.close();
  await fs.writeFile(path.join(OUT, "perf.json"), JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), profiles: PROFILES, rows }, null, 2));
  console.log(`\nwrote ${path.join(OUT, "perf.json")}`);
}

main();
