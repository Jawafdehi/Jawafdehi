// SPDX-License-Identifier: Hippocratic-3.0
// Prove (1) the mechanism: Tailwind emits `sr-only` BEFORE the width/height
// utilities, so `w-full h-10` from the Input base override it; and (2) that
// dropping those utilities removes the whole 65px overflow.
import { chromium } from "playwright";
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const BASE = (arg("base", process.env.BASE || "https://jawafdehi.org") || "").replace(/\/$/, "");
const W = 360;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: 640 }, isMobile: false, locale: "ne-NP",
  storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: "jawafdehi_analytics_consent", value: "denied" }] }] } });
const p = await ctx.newPage();
await p.goto(BASE + "/report", { waitUntil: "load", timeout: 90000 });
await p.waitForLoadState("networkidle", { timeout: 30000 }).catch(()=>{});
await p.waitForTimeout(2000);

const m = await p.evaluate((requested) => {
  const ev = document.querySelector("#evidence");
  const before = { scrollWidth: document.documentElement.scrollWidth,
                   overflow: document.documentElement.scrollWidth - requested,
                   box: (() => { const r = ev.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
                   width: getComputedStyle(ev).width, height: getComputedStyle(ev).height };

  // Which rule actually wins for width? Find the source order of the two rules.
  const order = { srOnly: -1, wFull: -1, h10: -1 };
  let i = 0;
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules) {
      i++;
      const sel = rule.selectorText || "";
      if (sel === ".sr-only" && order.srOnly < 0) order.srOnly = i;
      if (sel === ".w-full" && order.wFull < 0) order.wFull = i;
      if (sel === ".h-10" && order.h10 < 0) order.h10 = i;
    }
  }

  // THE FIX: the element is visually hidden, so it needs no Input styling at all.
  ev.className = "sr-only";
  const after = { scrollWidth: document.documentElement.scrollWidth,
                  overflow: document.documentElement.scrollWidth - requested,
                  box: (() => { const r = ev.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
                  width: getComputedStyle(ev).width, height: getComputedStyle(ev).height };

  // Is it still operable? (a visually-hidden file input must still be clickable
  // via its <label for>, and must still be focusable)
  const label = document.querySelector('label[for="evidence"]');
  ev.focus();
  const operable = { hasLabel: !!label, focused: document.activeElement === ev,
                     labelBox: label ? Math.round(label.getBoundingClientRect().height) : null };
  return { before, after, order, operable };
}, W);

console.log(JSON.stringify(m, null, 2));
console.log(`\nCSS source order: .sr-only@${m.order.srOnly}  .w-full@${m.order.wFull}  .h-10@${m.order.h10}`);
console.log(m.order.srOnly < m.order.wFull
  ? "=> .sr-only is emitted FIRST, so .w-full/.h-10 win. Mechanism confirmed."
  : "=> .sr-only is emitted LAST; mechanism is NOT class order.");
console.log(`\noverflow ${m.before.overflow}px -> ${m.after.overflow}px`);
await b.close();
