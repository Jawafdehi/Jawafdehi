#!/usr/bin/env node
// SPDX-License-Identifier: Hippocratic-3.0
//
// Draws every page's share card from src/data/page-cards.json:
//   - public/assets/social-preview.png, the "home" card, which every page
//     without its own falls back to (documents and authors get theirs from the
//     API, which falls back to this one too);
//   - public/assets/og/<slug>.jpg for each other page.
// Drawn from HTML with the site's own font, logo and icons, in the home hero's
// style: the page's line on the left, a motif for the page on the right. The
// home card is drawn dark (theme: "dark"), every page card light.
//
//     node scripts/render-social-card.mjs            # every card
//     node scripts/render-social-card.mjs team mcp   # just these
//
// Re-run after editing a card's copy, and for "team" whenever the team changes
// (its photos come from src/data/team.ts). Needs Playwright's Chromium
// (`bunx playwright install chromium`, or point CHROMIUM_PATH at one). No dev
// server: fonts and images are served straight from public/.
import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const ORIGIN = "https://card.local";
const TYPES = {
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};
const RED = "var(--red)";

const { cards } = JSON.parse(readFileSync("src/data/page-cards.json", "utf8"));
const only = process.argv.slice(2);
const wanted = only.length ? cards.filter((c) => only.includes(c.slug)) : cards;
if (only.length && wanted.length !== only.length) {
  throw new Error(`unknown card: ${only.filter((s) => !cards.some((c) => c.slug === s)).join(", ")}`);
}

// Phosphor's light glyphs, from the same generated table the site draws with.
const ICONS = Object.fromEntries(
  readFileSync("src/components/icon-paths.ts", "utf8")
    .split("\n")
    .map((line) => line.match(/^ {2}(\w+): (\[.*\]),$/))
    .filter(Boolean)
    .map(([, name, pair]) => [name, JSON.parse(pair)[0]]),
);
function icon(name, size, color = "var(--fg)") {
  if (!ICONS[name]) throw new Error(`no icon ${name} in icon-paths.ts`);
  return `<svg width="${size}" height="${size}" viewBox="0 0 256 256" style="fill:${color}">${ICONS[name]}</svg>`;
}

// The current team (everyone above "pastMembers"), in page order.
function teamPhotos() {
  const src = readFileSync("src/data/team.ts", "utf8");
  const current = src.slice(0, src.indexOf("export const pastMembers"));
  return [...current.matchAll(/thumb: "([^"]+)"/g)].map((m) => m[1]);
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function motif(m) {
  switch (m.kind) {
    case "lines": {
      const rows = Array.from({ length: 13 }, (_, i) => ({ a: 18 + ((i * 37) % 30), b: 22 + ((i * 53) % 35), c: i % 3 === 0 }));
      return `<div class="lines">${rows
        .map((r) => `<div class="row"><span style="width:${r.a}%;background:rgba(var(--ink),.07)"></span><span style="width:${r.b}%;background:rgba(var(--ink),.14)"></span>${r.c ? '<span style="width:14%;background:rgba(var(--red-rgb),.45)"></span>' : ""}</div>`)
        .join("")}</div>`;
    }
    case "none":
      return "";
    case "glyph":
      return `<div class="glyph">${esc(m.glyph)}</div>`;
    case "team":
      return `<div class="faces">${teamPhotos()
        .map((src) => `<div class="face" style="background-image:url(${src})"></div>`)
        .join("")}</div>`;
    case "search": {
      const rows = [62, 48, 70, 40, 56];
      return `<div class="search"><div class="pill"><span>Search the archive</span></div>${rows
        .map((w, i) => `<div class="res"><span class="dot" style="background:${i % 2 ? "rgba(var(--ink),.18)" : "rgba(var(--red-rgb),.55)"}"></span><span class="bar" style="width:${w}%"></span><span class="bar dim" style="width:${w - 22}%"></span></div>`)
        .join("")}</div>`;
    }
    case "covers": {
      const covers = readdirSync("public/assets/materials/covers").filter((f) => f.endsWith(".webp")).slice(0, 5);
      return `<div class="covers">${covers
        .map((f, i) => `<img src="/assets/materials/covers/${f}" style="left:${i * 62}px;top:${Math.abs(i - 2) * 22}px;transform:rotate(${(i - 2) * 5}deg);z-index:${5 - Math.abs(i - 2)}">`)
        .join("")}</div>`;
    }
    case "chat":
      return `<div class="chat">
        <div class="bubble me">Which officials did the CIAA charge in Lalitpur last year?</div>
        <div class="bubble ai"><span class="bar" style="width:92%"></span><span class="bar" style="width:78%"></span><span class="bar" style="width:84%"></span><span class="src">3 cases · 5 source documents</span></div>
      </div>`;
    case "tiles":
      return `<div class="tiles">${m.icons.map((n, i) => `<div class="tile">${icon(n, 96, i === 0 ? "var(--on-red)" : "var(--fg)")}</div>`).join("")}</div>`;
    case "convert":
      return `<div class="convert"><div class="doc scan"><span class="bar" style="width:80%"></span><span class="bar dim" style="width:64%"></span><span class="bar" style="width:72%"></span><span class="bar dim" style="width:56%"></span><span>PDF, scan, .doc</span></div><span class="arrow">→</span><div class="doc md"><span class="h"># </span><span class="bar" style="width:70%"></span><span class="bar" style="width:88%"></span><span class="bar" style="width:60%"></span><span class="bar" style="width:80%"></span><span>Markdown</span></div></div>`;
    case "steps":
      return `<div class="steps">${m.steps
        .map((s, i) => `<div class="step"><span class="n${i === m.steps.length - 1 ? " last" : ""}">${i + 1}</span><span>${esc(s)}</span></div>`)
        .join("")}</div>`;
    default:
      throw new Error(`unknown motif ${m.kind}`);
  }
}

function html(card) {
  const [lead, hi, tail] = card.title;
  const length = (lead + hi + tail).length;
  const size = length > 52 ? 56 : length > 38 ? 62 : 68;
  const url = `jawafdehi.org${card.path ? `/${card.path.split("?")[0]}` : ""}`;
  return `<!doctype html><html class="${card.theme === "dark" ? "dark" : ""}"><head><meta charset="utf-8"><style>
@font-face { font-family: Inter; src: url(/font/Inter/Inter-latin-wght.woff2) format("woff2"); font-weight: 100 900; }
* { margin:0; box-sizing:border-box }
:root { --bg:#FFFFFF; --fg:#0E1F3B; --ink:14,31,59; --red:#B5242C; --red-rgb:181,36,44; --on-red:#fff }
:root.dark { --bg:#0E1F3B; --fg:#FFFFFF; --ink:255,255,255; --red:#F04C54; --red-rgb:240,76,84 }
body { width:1200px; height:630px; background:var(--bg); font-family:Inter, sans-serif; color:var(--fg); overflow:hidden; position:relative }
.grain { display:none }
.dark .grain { display:block; position:absolute; inset:0 }
.dark .grain { background: radial-gradient(60% 80% at 10% 100%, rgba(60,110,200,.18), transparent 60%); }
.copy { position:absolute; left:72px; top:72px; bottom:72px; width:620px; display:flex; flex-direction:column }
.copy img { height:52px; width:auto; align-self:flex-start }
h1 { margin-top:auto; font-weight:400; font-size:${size}px; line-height:1.06; letter-spacing:-0.035em; text-wrap:balance }
h1 em { font-style:normal; color:${RED} }
.tag { margin-top:20px; font-size:27px; line-height:1.3; color:rgba(var(--ink),.72) }
.wide { width:1056px } .top h1 { margin-top:64px } .top .url { margin-top:auto }
.url { margin-top:26px; font-size:22px; color:rgba(var(--ink),.6) }
.art { position:absolute; left:720px; right:64px; top:72px; bottom:72px; display:flex; align-items:center; justify-content:center }
.bar { display:block; height:12px; border-radius:3px; background:rgba(var(--ink),.16) } .bar.dim { background:rgba(var(--ink),.08) }
.lines { position:absolute; inset:24px 8px; display:flex; flex-direction:column; justify-content:space-between; -webkit-mask-image:linear-gradient(to left,#000 45%,transparent) }
.row { display:flex; gap:12px } .row span { height:12px; border-radius:3px; display:block }
.glyph { font-size:520px; line-height:1; font-weight:300; color:rgba(var(--ink),.08); margin-top:-40px }
.faces { display:grid; grid-template-columns:repeat(5,74px); gap:12px }
.face { width:74px; height:74px; border-radius:50%; background-size:cover; background-position:center 30%; border:2px solid rgba(var(--ink),.14) }
.search { width:100%; display:flex; flex-direction:column; gap:22px }
.pill { display:flex; align-items:center; gap:16px; padding:22px 26px; border-radius:999px; background:rgba(var(--ink),.08); border:1.5px solid rgba(var(--ink),.2); font-size:22px; color:rgba(var(--ink),.65); margin-bottom:14px; white-space:nowrap }
.res { display:flex; align-items:center; gap:14px; padding-left:12px } .res .dot { width:16px; height:16px; border-radius:50%; flex:none }
.covers { position:relative; width:420px; height:400px }
.covers img { position:absolute; width:170px; height:auto; border-radius:6px; box-shadow:0 18px 40px rgba(14,31,59,.22); border:1px solid rgba(var(--ink),.12) }
.chat { width:100%; display:flex; flex-direction:column; gap:22px; font-size:22px; line-height:1.35 }
.bubble { padding:22px 26px; border-radius:24px; max-width:88% }
.me { align-self:flex-end; background:var(--red); color:var(--on-red); border-bottom-right-radius:6px }
.ai { align-self:flex-start; width:88%; background:rgba(var(--ink),.08); border:1.5px solid rgba(var(--ink),.14); border-bottom-left-radius:6px; display:flex; flex-direction:column; gap:14px }
.src { display:flex; align-items:center; gap:10px; margin-top:6px; font-size:19px; color:rgba(var(--ink),.7) }
.tiles { display:grid; grid-template-columns:repeat(2,160px); gap:22px }
.tile { width:160px; height:160px; border-radius:28px; display:flex; align-items:center; justify-content:center; background:rgba(var(--ink),.06); border:1.5px solid rgba(var(--ink),.14) }
.tile:first-child { background:var(--red); border-color:var(--red); color:var(--on-red) }
.convert { display:flex; align-items:center; gap:22px }
.doc { width:170px; height:220px; border-radius:16px; background:rgba(var(--ink),.06); border:1.5px solid rgba(var(--ink),.16); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; font-size:17px; color:rgba(var(--ink),.65) }
.doc.scan, .doc.md { align-items:flex-start; padding:22px; justify-content:flex-start } .doc.md .h { font-size:30px; color:${RED}; font-weight:600 } .doc span:last-child { margin-top:auto; white-space:nowrap }
.doc.scan { justify-content:flex-start }
.arrow { font-size:48px; color:${RED} }
.steps { display:flex; flex-direction:column; gap:30px; position:relative }
.steps::before { content:""; position:absolute; left:31px; top:30px; bottom:30px; border-left:2px dashed rgba(var(--ink),.2) }
.step { display:flex; align-items:center; gap:24px; font-size:30px; color:rgba(var(--ink),.85) }
.n { position:relative; width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--bg); border:2px solid rgba(var(--ink),.3); font-size:26px }
.n.last { background:${RED}; border-color:${RED}; color:var(--on-red) }
</style></head><body>
<div class="grain"></div>
<div class="art">${motif(card.motif)}</div>
<div class="copy${card.layout === "top" ? " top" : ""}${card.wide ? " wide" : ""}">
  <img src="/assets/${card.theme === "dark" ? "logo-dark" : "logo"}.svg" alt="">
  <h1>${esc(lead)}<em>${esc(hi)}</em>${esc(tail)}</h1>
  <p class="tag">${esc(card.sub)}</p>
  <p class="url">${url}</p>
</div>
</body></html>`;
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
let current = "";
await page.route(`${ORIGIN}/**`, (route) => {
  const path = decodeURIComponent(new URL(route.request().url()).pathname);
  if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: current });
  return route.fulfill({
    contentType: TYPES[extname(path)] || "application/octet-stream",
    body: readFileSync(join("public", path)),
  });
});
for (const card of wanted) {
  current = html(card);
  await page.goto(`${ORIGIN}/`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  if (!(await page.evaluate(() => document.fonts.check("400 68px Inter")))) {
    throw new Error("Inter did not load; the card would fall back to a system font");
  }
  const out = join("public", card.file ?? `assets/og/${card.slug}.jpg`);
  await page.screenshot(out.endsWith(".png") ? { path: out, type: "png" } : { path: out, type: "jpeg", quality: 86 });
  console.log(`wrote ${out}`);
}
await browser.close();
