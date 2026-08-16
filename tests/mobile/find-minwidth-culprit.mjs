// SPDX-License-Identifier: Hippocratic-3.0
// Walk into the overflowing /donate card and /report input to find the element
// whose min-content width sets the floor. On a grid/flex item `min-width: auto`
// means "at least min-content", so ONE unbreakable child widens the whole track.
import { chromium, devices as pw } from "playwright";
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const BASE = (arg("base", process.env.BASE || "https://jawafdehi.org") || "").replace(/\/$/, "");
const WALK = () => {
  const vw = 360; // the width we ASKED for, not innerWidth (which shrink-to-fit inflates)
  const res = [];
  const probe = (root, label) => {
    const walk = (el, depth) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      // min-content width of this element, measured directly
      const prev = el.style.width;
      el.style.width = "min-content";
      const mc = Math.round(el.getBoundingClientRect().width);
      el.style.width = prev;
      if (mc > vw - 32) {
        res.push({ label, depth, tag: el.tagName.toLowerCase(), cls: (el.getAttribute("class")||"").slice(0,90),
          rendered: Math.round(r.width), minContent: mc, minWidth: cs.minWidth, whiteSpace: cs.whiteSpace,
          text: (el.innerText||"").trim().replace(/\s+/g," ").slice(0,60) || null,
          src: el.tagName === "IMG" ? (el.getAttribute("src")||"").slice(-40) : null });
      }
      if (depth < 7) for (const c of el.children) walk(c, depth+1);
    };
    walk(root, 0);
  };
  for (const a of document.querySelectorAll("article")) {
    const r = a.getBoundingClientRect();
    if (r.width > vw) probe(a, "donate-article");
  }
  for (const i of document.querySelectorAll('input[type=file]')) {
    const cs = getComputedStyle(i), r = i.getBoundingClientRect();
    res.push({ label:"file-input", tag:"input[file]", rendered: Math.round(r.width), cssWidth: cs.width,
      minWidth: cs.minWidth, maxWidth: cs.maxWidth, parentW: Math.round(i.parentElement.getBoundingClientRect().width),
      cls: (i.getAttribute("class")||"").slice(0,80) });
  }
  return res;
};
const b = await chromium.launch();
for (const route of ["/donate","/report"]) {
  const ctx = await b.newContext({ viewport:{width:360,height:640}, userAgent: pw["Galaxy S9+"].userAgent, deviceScaleFactor:3, isMobile:true, hasTouch:true, locale:"ne-NP",
    storageState:{cookies:[],origins:[{origin:BASE,localStorage:[{name:"jawafdehi_analytics_consent",value:"denied"}]}]} });
  const p = await ctx.newPage();
  await p.goto(BASE+route,{waitUntil:"domcontentloaded",timeout:60000});
  await p.waitForLoadState("networkidle",{timeout:30000}).catch(()=>{});
  await p.waitForTimeout(2000);
  console.log(`\n### ${route}  innerWidth=${await p.evaluate(()=>innerWidth)} (requested 360)`);
  for (const r of await p.evaluate(WALK)) console.log("  ", JSON.stringify(r));
  await ctx.close();
}
await b.close();
