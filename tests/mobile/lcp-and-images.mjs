// SPDX-License-Identifier: Hippocratic-3.0
// What is the LCP element on the home page at phone size, and are images sized
// for a phone? An <img> whose intrinsic width is far larger than its rendered
// CSS width is paying for pixels the screen cannot show — the single most
// common avoidable mobile byte cost.
import { chromium, devices as pw } from "playwright";
import fs from "node:fs/promises";

const BASE = process.env.BASE || "https://jawafdehi.org";
const ROUTES = [["/", "home"], ["/cases", "cases"], ["/donate", "donate"], ["/team", "team"]];

const main = async () => {
  const browser = await chromium.launch();
  const out = [];
  for (const [route, slug] of ROUTES) {
    const ctx = await browser.newContext({
      viewport: { width: 360, height: 640 }, userAgent: pw["Galaxy S9+"].userAgent,
      deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "ne-NP",
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: "jawafdehi_analytics_consent", value: "denied" }] }] },
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 120000 });
    const r = await page.evaluate(() => new Promise((resolve) => {
      let lcp = null;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          lcp = {
            startTime: Math.round(e.startTime), size: e.size, url: e.url || null,
            tag: e.element ? e.element.tagName.toLowerCase() : null,
            cls: e.element ? (e.element.getAttribute("class") || "").slice(0, 90) : null,
            text: e.element ? (e.element.innerText || "").trim().slice(0, 60) : null,
          };
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => {
        const imgs = Array.from(document.images).map((im) => {
          const rr = im.getBoundingClientRect();
          return {
            src: (im.currentSrc || im.src || "").replace(location.origin, "").slice(0, 80),
            renderedCss: { w: Math.round(rr.width), h: Math.round(rr.height) },
            intrinsic: { w: im.naturalWidth, h: im.naturalHeight },
            hasSrcset: !!im.getAttribute("srcset"), hasSizes: !!im.getAttribute("sizes"),
            loading: im.getAttribute("loading"), fetchpriority: im.getAttribute("fetchpriority"),
            // dpr-aware waste: a 3x screen legitimately wants 3x the CSS width
            oversizeFactor: rr.width > 0 && im.naturalWidth ? +(im.naturalWidth / (rr.width * devicePixelRatio)).toFixed(2) : null,
          };
        }).filter((i) => i.renderedCss.w > 0);
        resolve({ lcp, dpr: devicePixelRatio, images: imgs });
      }, 9000);
    }));
    out.push({ slug, ...r });
    console.log(`\n=== ${slug} (360x640, dpr ${r.dpr}, slow4G+4xCPU) ===`);
    console.log("  LCP:", r.lcp ? `${r.lcp.startTime}ms  <${r.lcp.tag}>  ${r.lcp.url || ""} ${JSON.stringify(r.lcp.text || "").slice(0, 60)}` : "none");
    const bad = r.images.filter((i) => i.oversizeFactor && i.oversizeFactor > 1.5);
    console.log(`  images: ${r.images.length}, with srcset: ${r.images.filter((i) => i.hasSrcset).length}, oversized >1.5x for this DPR: ${bad.length}`);
    for (const i of bad.slice(0, 8)) console.log(`    ${i.oversizeFactor}x  intrinsic ${i.intrinsic.w}x${i.intrinsic.h} -> css ${i.renderedCss.w}x${i.renderedCss.h}  loading=${i.loading}  ${i.src}`);
    await ctx.close();
  }
  await browser.close();
  // Every other script in this directory creates its output dir first; this one
  // did not, so a clean checkout lost the whole run to ENOENT on the last line.
  await fs.mkdir("test-results/mobile", { recursive: true });
  await fs.writeFile("test-results/mobile/lcp-images.json", JSON.stringify(out, null, 2));
};
main();
