// SPDX-License-Identifier: Hippocratic-3.0
// Does page content read THROUGH the sticky header while scrolling?
//
// Navbar.tsx:196 keeps the <header> itself `bg-transparent` at every scroll
// position; `isScrolled` only turns on backgrounds for the individual controls
// inside it (logo pill, search/menu buttons, language toggle). So whatever the
// page is scrolling past sits directly behind the header, and only the pills
// mask it. This measures, at a series of real scroll positions, how much text is
// underneath the header band and whether anything opaque covers it.
import { chromium, devices as pw } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const BASE = (arg("base", "https://jawafdehi.org") || "").replace(/\/$/, "");
const W = Number(arg("width", "360"));
const H = Number(arg("height", "640"));
const OUT = arg("out", `test-results/mobile/header-bleed/${W}x${H}`);

async function flick(cdp, W, H, px) {
  const x = Math.round(W / 2);
  const from = Math.round(H * 0.8);
  const steps = 8;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: from }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: from - Math.round((px * i) / steps) }] });
    await new Promise((r) => setTimeout(r, 14));
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

const MEASURE = () => {
  const header = document.querySelector("header");
  if (!header) return null;
  const hr = header.getBoundingClientRect();
  const hcs = getComputedStyle(header);

  // Text nodes whose box intersects the header band.
  const under = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = (n.nodeValue || "").trim();
    if (t.length < 2) continue;
    const el = n.parentElement;
    if (!el || header.contains(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of Array.from(range.getClientRects())) {
      if (r.height <= 0 || r.width <= 0) continue;
      const overlapTop = Math.max(r.top, hr.top);
      const overlapBottom = Math.min(r.bottom, hr.bottom);
      if (overlapBottom - overlapTop > 2 && r.left < hr.right && r.right > hr.left) {
        under.push({
          text: t.slice(0, 44),
          overlapPx: Math.round(overlapBottom - overlapTop),
          fontSize: cs.fontSize,
          color: cs.color,
          rect: { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) },
        });
        break;
      }
    }
    if (under.length > 12) break;
  }

  // Is anything actually painting an opaque layer across the header band?
  // Walk the header's own subtree for a full-width backdrop.
  const masks = [];
  for (const el of [header, ...header.querySelectorAll("*")]) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const bg = cs.backgroundColor;
    const m = bg.match(/rgba?\(([^)]+)\)/);
    const alpha = m ? (m[1].split(",")[3] !== undefined ? parseFloat(m[1].split(",")[3]) : 1) : 0;
    if (alpha > 0.01 && r.width > window.innerWidth * 0.8 && r.height > 20) {
      masks.push({ tag: el.tagName.toLowerCase(), cls: (el.getAttribute("class") || "").slice(0, 70), bg, alpha, backdrop: cs.backdropFilter, w: Math.round(r.width), h: Math.round(r.height) });
    }
  }

  return {
    scrollY: Math.round(window.scrollY),
    header: { top: Math.round(hr.top), h: Math.round(hr.height), bg: hcs.backgroundColor, backdrop: hcs.backdropFilter, position: hcs.position, zIndex: hcs.zIndex },
    fullWidthMasks: masks,
    textUnderHeader: under,
  };
};

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
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const rows = [];
  for (let step = 0; step < 8; step++) {
    if (step) await flick(cdp, W, H, 260);
    await page.waitForTimeout(450);
    const m = await page.evaluate(MEASURE);
    rows.push(m);
    // crop just the header band, doubled, so the bleed is legible
    await page.screenshot({
      path: path.join(OUT, `hdr-${String(m.scrollY).padStart(5, "0")}.png`),
      clip: { x: 0, y: 0, width: W, height: Math.max(90, m.header.h + 18) },
    }).catch(() => {});
    const worst = m.textUnderHeader.slice(0, 3).map((u) => `"${u.text}"(${u.overlapPx}px)`).join(" ");
    console.log(`scrollY=${String(m.scrollY).padStart(5)}  header.bg=${m.header.bg.padEnd(22)} backdrop=${String(m.header.backdrop).padEnd(6)} fullWidthMasks=${m.fullWidthMasks.length}  textUnder=${String(m.textUnderHeader.length).padStart(2)}  ${worst}`);
  }
  await fs.writeFile(path.join(OUT, "header-bleed.json"), JSON.stringify({ width: W, height: H, rows }, null, 2));
  console.log(`\nheader crops -> ${OUT}`);
  await browser.close();
};
main();
