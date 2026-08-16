// SPDX-License-Identifier: Hippocratic-3.0
// Causality check for the proposed one-line sheet fix.
//
// The proof harness showed the tail of the mobile menu is unreachable at
// 360x640. This asks the complementary question: is `overflow-y: auto` on the
// sheet panel actually the thing that fixes it? Inject exactly that one
// declaration into the live page, repeat the same gestures, and see whether the
// Donate control becomes reachable and clickable.
//
// A fix that cannot be shown to change the outcome is a guess.
import { chromium, devices as pw } from "playwright";

const BASE = process.env.BASE || "https://jawafdehi.org";

const probe = (page) => page.evaluate(() => {
  const p = document.querySelector('[role="dialog"]');
  if (!p) return { open: false };
  const el = Array.from(p.querySelectorAll("a,button")).find((e) => /आर्थिक सहयोग/.test(e.innerText || ""));
  const ai = Array.from(p.querySelectorAll("a,button")).find((e) => /AI सहायक/.test(e.innerText || ""));
  const vis = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= window.innerHeight; };
  return {
    open: true, overflowY: getComputedStyle(p).overflowY,
    scrollTop: p.scrollTop, scrollH: p.scrollHeight, clientH: p.clientHeight,
    canScroll: p.scrollHeight > p.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(p).overflowY),
    donateVisible: vis(el), aiVisible: vis(ai),
  };
});

const run = async (browser, withFix) => {
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 640 }, userAgent: pw["Galaxy S9+"].userAgent,
    deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "ne-NP",
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: "jawafdehi_analytics_consent", value: "denied" }] }] },
  });
  const page = await ctx.newPage();
  if (withFix) {
    // Exactly the proposed change, nothing else: the two Tailwind classes
    // `overflow-y-auto overscroll-contain` on the side sheet panel.
    await page.addStyleTag({
      content: `[role="dialog"][class*="inset-y-0"]{overflow-y:auto !important;overscroll-behavior:contain !important;}`,
    });
  }
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1200);
  if (withFix) {
    await page.addStyleTag({
      content: `[role="dialog"][class*="inset-y-0"]{overflow-y:auto !important;overscroll-behavior:contain !important;}`,
    });
  }
  await page.getByRole("button", { name: /^(मेनु|Menu)$/i }).first().click();
  await page.waitForTimeout(900);

  const before = await probe(page);
  const cdp = await ctx.newCDPSession(page);
  // ⚠️ `Input.synthesizeScrollGesture` with `gestureSourceType: "touch"` is a
  // SILENT NO-OP in this headless build — measured at 0px, where the same call
  // with the default source moves 400. It used to be here, which meant the
  // `withFix` arm could look non-causal purely because nothing scrolled. Drive
  // the touch points directly instead, exactly as prove-nav-unreachable.mjs does.
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 180, y: 500 }] }).catch(() => {});
  for (let k = 1; k <= 8; k++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 180, y: 500 - k * 45 }] }).catch(() => {});
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }).catch(() => {});
  await page.waitForTimeout(700);
  const afterScroll = await probe(page);

  let clickOk = false, clickErr = null, urlAfter = null;
  try {
    await page.getByRole("link", { name: /आर्थिक सहयोग/ }).first().click({ timeout: 6000 });
    await page.waitForTimeout(800);
    clickOk = true; urlAfter = page.url();
  } catch (e) { clickErr = String(e).split("\n")[0].slice(0, 90); }

  await page.screenshot({ path: `test-results/mobile/navfix-${withFix ? "WITH" : "WITHOUT"}.png` }).catch(() => {});
  await ctx.close();
  return { withFix, before, afterScroll, clickOk, clickErr, urlAfter };
};

const main = async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const withFix of [false, true]) {
    const r = await run(browser, withFix);
    rows.push(r);
    const tag = withFix ? "WITH fix (overflow-y-auto)" : "WITHOUT fix (as shipped) ";
    console.log(`${tag}  overflowY=${String(r.before.overflowY).padEnd(7)} canScroll=${String(r.before.canScroll).padEnd(5)}` +
      ` | after touch-scroll: donateVisible=${String(r.afterScroll.donateVisible).padEnd(5)} scrollTop=${String(r.afterScroll.scrollTop).padStart(4)}` +
      ` | click Donate: ${r.clickOk ? "OK -> " + r.urlAfter : "FAILED (" + r.clickErr + ")"}`);
  }
  await browser.close();
  const [no, yes] = rows;
  const causal = no.clickOk === false && yes.clickOk === true;
  console.log(`\nfix is causal: ${causal ? "YES — unreachable without it, reachable with it" : "NO — inconclusive, do not claim the fix"}`);
};
main();
