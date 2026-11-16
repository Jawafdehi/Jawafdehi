#!/usr/bin/env node
// SPDX-License-Identifier: Hippocratic-3.0
//
// Draws public/assets/social-preview.png — the share card every page without
// its own falls back to (documents and authors get theirs from the API, which
// falls back to this one too). Drawn from HTML with the site's own font and
// logo, in the home hero's style, carrying the canonical descriptor.
//
//     node scripts/render-social-card.mjs [out.png]
//
// Needs Playwright's Chromium (`bunx playwright install chromium`). No dev
// server: the font and logo are served straight from public/.
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const OUT = process.argv[2] || "public/assets/social-preview.png";
const ORIGIN = "https://card.local";
const TYPES = { ".woff2": "font/woff2", ".svg": "image/svg+xml" };

const rows = Array.from({ length: 13 }, (_, i) => ({ a: 18 + ((i * 37) % 30), b: 22 + ((i * 53) % 35), c: i % 3 === 0 }));
const lines = rows.map(r => `<div class="row"><span style="width:${r.a}%;background:rgba(255,255,255,.07)"></span><span style="width:${r.b}%;background:rgba(255,255,255,.14)"></span>${r.c ? '<span style="width:14%;background:rgba(240,76,84,.45)"></span>' : ''}</div>`).join("");
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Inter; src: url(/font/Inter/Inter-latin-wght.woff2) format("woff2"); font-weight: 100 900; }
* { margin:0; box-sizing:border-box }
body { width:1200px; height:630px; background:#0E1F3B; font-family:Inter, sans-serif; color:#fff; overflow:hidden; position:relative }
.grain { position:absolute; inset:0; background: radial-gradient(70% 90% at 85% 40%, rgba(181,36,44,.22), transparent 60%), radial-gradient(60% 80% at 10% 100%, rgba(60,110,200,.18), transparent 60%); }
.lines { position:absolute; right:72px; top:96px; bottom:96px; width:420px; display:flex; flex-direction:column; justify-content:space-between; -webkit-mask-image:linear-gradient(to left,#000 45%,transparent); }
.row { display:flex; gap:12px } .row span { height:12px; border-radius:3px; display:block }
.copy { position:absolute; left:72px; top:72px; bottom:72px; width:640px; display:flex; flex-direction:column }
img { height:52px; width:auto; align-self:flex-start }
.eyebrow { margin-top:auto; font-size:22px; letter-spacing:.06em; color:#F04C54; font-weight:500 }
h1 { margin-top:18px; font-weight:400; font-size:68px; line-height:1.04; letter-spacing:-0.035em }
.tag { margin-top:20px; font-size:28px; color:rgba(255,255,255,.72) }
.url { margin-top:28px; font-size:22px; color:rgba(255,255,255,.6) }
</style></head><body>
<div class="grain"></div>
<div class="lines">${lines}</div>
<div class="copy">
  <img src="/assets/logo-dark.svg" alt="">
  <h1 style="margin-top:auto">Nepal’s Permanent <span style="color:#F04C54">Corruption Case</span> Archive</h1>
  <p class="tag">— who, what, and when.</p>
  <p class="url">jawafdehi.org</p>
</div>
</body></html>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.route(`${ORIGIN}/**`, (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: html });
  return route.fulfill({
    contentType: TYPES[extname(path)] || "application/octet-stream",
    body: readFileSync(join("public", path)),
  });
});
await page.goto(`${ORIGIN}/`, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
if (!(await page.evaluate(() => document.fonts.check("400 68px Inter")))) {
  throw new Error("Inter did not load; the card would fall back to a system font");
}
await page.screenshot({ path: OUT, type: "png" });
await browser.close();
console.log(`wrote ${OUT}`);
