// SPDX-License-Identifier: Hippocratic-3.0
// Drive a mobile Chrome through the home page with REAL scroll gestures and
// watch the hero stats band ("82 cases documented", "Rs 1.90 Kharab", ...).
//
// Three things this is looking for that a static probe cannot see:
//   1. what the band looks like BEFORE hydration — the pre-rendered HTML ships
//      empty <p>s for every CountUp stat, so there is a window where the archive
//      claims nothing;
//   2. whether the CountUp animation is ever actually visible to a phone user,
//      given the band sits below the fold and CountUp starts on mount;
//   3. the band's real geometry at 2 columns: cell widths, label wrapping,
//      unequal heights, clipping, and whether the numbers stay aligned.
//
//   node tests/mobile/hero-stats-scroll.mjs --width 360 --height 640
import { chromium, devices as pw } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const BASE = (arg("base", "https://jawafdehi.org") || "").replace(/\/$/, "");
const W = Number(arg("width", "360"));
const H = Number(arg("height", "640"));
const THROTTLE = arg("throttle", "1") !== "0";
const OUT = arg("out", `test-results/mobile/hero-stats/${W}x${H}`);

// Everything about the stats band, measured in place.
const STATS = () => {
  const grid = document.querySelector('[class*="grid-cols-2"]');
  const findBand = () => {
    const v = document.querySelector(".font-stat-value");
    if (!v) return null;
    let n = v;
    // climb to the grid that holds all of them
    for (let i = 0; i < 6 && n; i++, n = n.parentElement) {
      if (n.querySelectorAll(".font-stat-value").length > 1) return n;
    }
    return null;
  };
  const band = findBand() || grid;
  if (!band) return { found: false };
  const br = band.getBoundingClientRect();
  const bcs = getComputedStyle(band);
  const cells = Array.from(band.children).map((c) => {
    const r = c.getBoundingClientRect();
    const val = c.querySelector(".font-stat-value");
    const lab = c.querySelector(".font-stat-label");
    const vr = val && val.getBoundingClientRect();
    const lr = lab && lab.getBoundingClientRect();
    const vcs = val && getComputedStyle(val);
    const lcs = lab && getComputedStyle(lab);
    return {
      w: Math.round(r.width), h: Math.round(r.height),
      top: Math.round(r.top),
      value: val ? (val.innerText || "").trim() : null,
      valueEmpty: val ? (val.innerText || "").trim() === "" : null,
      valueBox: vr ? { w: Math.round(vr.width), h: Math.round(vr.height) } : null,
      valueFont: vcs ? `${vcs.fontSize}/${vcs.lineHeight} ${vcs.fontFamily.split(",")[0]}` : null,
      valueOverflows: val ? val.scrollWidth > val.clientWidth + 1 : null,
      label: lab ? (lab.innerText || "").trim() : null,
      labelBox: lr ? { w: Math.round(lr.width), h: Math.round(lr.height) } : null,
      labelFont: lcs ? `${lcs.fontSize}/${lcs.lineHeight}` : null,
      // how many lines the label wraps to
      labelLines: lab && lcs ? Math.round(lr.height / (parseFloat(lcs.lineHeight) || parseFloat(lcs.fontSize) * 1.2)) : null,
      isLink: !!c.querySelector("a"),
      linkBox: (() => { const a = c.querySelector("a"); if (!a) return null; const ar = a.getBoundingClientRect(); return { w: Math.round(ar.width), h: Math.round(ar.height) }; })(),
    };
  });
  return {
    found: true,
    band: { w: Math.round(br.width), h: Math.round(br.height), top: Math.round(br.top), cols: bcs.gridTemplateColumns, gap: bcs.gap },
    cells,
    heights: cells.map((c) => c.h),
    equalHeights: new Set(cells.map((c) => c.h)).size === 1,
    docTop: Math.round(br.top + window.scrollY),
    viewport: { w: innerWidth, h: innerHeight },
    scrollY: Math.round(window.scrollY),
  };
};


// A real thumb flick. NB: `Input.synthesizeScrollGesture` with
// `gestureSourceType: "touch"` scrolls NOTHING in this headless build — measured
// 0px against 400px for the same call with the default source. So drive the
// touch points directly; this is the only form that both moves the page AND
// goes through the touch path.
async function touchFlick(cdp, W, H) {
  const x = Math.round(W / 2);
  const from = Math.round(H * 0.78);
  const to = Math.round(H * 0.22);
  const steps = 6;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: from }] }).catch(() => {});
  for (let i = 1; i <= steps; i++) {
    const y = Math.round(from + ((to - from) * i) / steps);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] }).catch(() => {});
    await new Promise((r) => setTimeout(r, 16));
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }).catch(() => {});
}

const main = async () => {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, userAgent: pw["Galaxy S9+"].userAgent,
    deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ne-NP",
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: "jawafdehi_analytics_consent", value: "denied" }] }] },
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (THROTTLE) {
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  const shots = [];
  const snap = async (name) => {
    const f = path.join(OUT, `${String(shots.length).padStart(2, "0")}-${name}.png`);
    await page.screenshot({ path: f }).catch(() => {});
    shots.push(f);
    return f;
  };

  console.log(`\n### ${W}x${H}${THROTTLE ? "  (Slow 4G + 4x CPU)" : "  (unthrottled)"}\n`);

  // --- phase 1: what lands before JS runs -----------------------------------
  await page.goto(BASE + "/", { waitUntil: "commit", timeout: 120000 });
  // Read the SERVED markup before hydration can fill it. Waiting on a selector
  // here is what made the first pass mislabel mid-animation frames as
  // "pre-hydration"; poll the DOM instead and stop at the first sighting.
  let pre = { found: false };
  for (let i = 0; i < 120; i++) {
    pre = await page.evaluate(STATS);
    if (pre.found) break;
    await page.waitForTimeout(100);
  }
  await snap("00-served-markup");
  const preRaw = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".font-stat-value")).map((e) => JSON.stringify(e.textContent)));
  console.log("served .font-stat-value textContent:", preRaw.join("  "));
  console.log("PRE-HYDRATION (as soon as the stats markup exists):");
  if (pre.found) for (const c of pre.cells) console.log(`   value=${JSON.stringify(c.value)}  empty=${c.valueEmpty}  box=${JSON.stringify(c.valueBox)}  label=${JSON.stringify(c.label)}`);
  await snap("pre-hydration");

  // --- phase 2: real scroll down to the band, in thumb-sized flicks ---------
  await page.waitForLoadState("load", { timeout: 90000 }).catch(() => {});
  const bandTop = (await page.evaluate(STATS)).docTop;
  console.log(`\nstats band sits at document y=${bandTop} (viewport is ${H}px tall) -> ${bandTop > H ? "BELOW the fold" : "above the fold"}`);

  // STATS returns `{ found: false }` — no `cells`, no `docTop` — when the band is
  // absent, which is exactly what happens if the markup is renamed. Say so instead
  // of dying on `undefined.map`, so a rename reads as "subject gone", not a crash.
  if (bandTop === undefined) {
    console.error(`\nFATAL: no .font-stat-value band on ${BASE}/ — the subject of this harness is gone.\n` +
      `Either the home page no longer renders the hero stats, or the class names moved.`);
    await browser.close();
    process.exit(2);
  }

  const frames = [];
  let y = 0;
  for (let i = 0; i < 14 && y < bandTop + 400; i++) {
    await touchFlick(cdp, W, H);
    await page.waitForTimeout(260);
    const s = await page.evaluate(STATS);
    y = s.scrollY ?? y;
    frames.push({ scrollY: s.scrollY, bandTop: s.band && s.band.top, values: (s.cells || []).map((c) => c.value) });
    if (s.band && s.band.top < H && s.band.top + s.band.h > 0) {
      await snap(`band-visible-scroll${s.scrollY}`);
    }
  }
  console.log("\nscroll filmstrip (band.top relative to viewport | stat values):");
  for (const f of frames) console.log(`   scrollY=${String(f.scrollY).padStart(5)}  band.top=${String(f.bandTop).padStart(5)}  ${JSON.stringify(f.values)}`);

  // --- phase 3: settled geometry --------------------------------------------
  await page.evaluate((t) => window.scrollTo({ top: Math.max(0, t - 120), behavior: "instant" }), bandTop);
  await page.waitForTimeout(1500);
  const post = await page.evaluate(STATS);
  await snap("band-settled");
  console.log("\nSETTLED band geometry:");
  console.log(`   grid: ${post.band.cols}  gap=${post.band.gap}  band=${post.band.w}x${post.band.h}`);
  console.log(`   cell heights: ${JSON.stringify(post.heights)}  equal=${post.equalHeights}`);
  for (const c of post.cells) {
    console.log(`   ${String(c.value).padEnd(16)} ${String(c.valueFont).padEnd(28)} valBox=${JSON.stringify(c.valueBox)} overflows=${c.valueOverflows}`);
    console.log(`      label ${JSON.stringify(c.label)} ${c.labelFont} lines=${c.labelLines} box=${JSON.stringify(c.labelBox)}`);
    console.log(`      cell=${c.w}x${c.h}  link=${JSON.stringify(c.linkBox)}`);
  }
  await fs.writeFile(path.join(OUT, "stats.json"), JSON.stringify({ width: W, height: H, throttled: THROTTLE, pre, frames, post, shots }, null, 2));
  console.log(`\nshots -> ${OUT}`);
  await browser.close();
};
main();
