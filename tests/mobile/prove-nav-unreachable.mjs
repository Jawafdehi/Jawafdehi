// SPDX-License-Identifier: Hippocratic-3.0
// Proof harness for the mobile-nav finding.
//
// The measurement said the nav panel's content is 884px tall inside a
// viewport-height panel with `overflow-y: visible`, while <body> is
// scroll-locked. That IMPLIES the tail of the menu is unreachable — but an
// implication is not a proof: Radix could be attaching its own scroll
// behaviour, or touch scrolling could work where wheel scrolling does not.
//
// So: open the menu on a 360x640 phone and try, in turn, every gesture a real
// user has — wheel over the panel, touch swipe up, drag, keyboard Tab to the
// last control, and .scrollIntoView() — then check whether the Donate button
// ever becomes visible and tappable. A finding survives only if all of them
// fail.
import { chromium, devices as pw } from "playwright";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const BASE = (arg("base", process.env.BASE || "https://jawafdehi.org") || "").replace(/\/$/, "");
const TARGET = /आर्थिक सहयोग/;           // "Donate" — last-but-one control
const AI = /AI सहायकलाई सोध्नुहोस्/;      // "Ask the AI assistant" — very last

const state = async (page) => page.evaluate(() => {
  const panel = document.querySelector('[role="dialog"]');
  if (!panel) return { open: false };
  const r = panel.getBoundingClientRect();
  const find = (re) => Array.from(panel.querySelectorAll("a,button"))
    .find((e) => re.test((e.innerText || e.textContent || "")));
  const rect = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom) }; };
  const donate = find(/आर्थिक सहयोग/), ai = find(/AI सहायक/);
  return {
    open: true,
    vh: window.innerHeight,
    panel: { top: Math.round(r.top), h: Math.round(r.height), scrollTop: panel.scrollTop, scrollH: panel.scrollHeight, clientH: panel.clientHeight, overflowY: getComputedStyle(panel).overflowY },
    windowScrollY: window.scrollY,
    bodyOverflow: getComputedStyle(document.body).overflow,
    donate: rect(donate), ai: rect(ai),
    donateVisible: donate ? (() => { const b = donate.getBoundingClientRect(); return b.top >= 0 && b.bottom <= window.innerHeight; })() : null,
    aiVisible: ai ? (() => { const b = ai.getBoundingClientRect(); return b.top >= 0 && b.bottom <= window.innerHeight; })() : null,
  };
});

const attempts = [];
const record = (name, s, note = "") => {
  attempts.push({ attempt: name, donateVisible: s.donateVisible, aiVisible: s.aiVisible, donateTop: s.donate && s.donate.top, panelScrollTop: s.panel && s.panel.scrollTop, windowScrollY: s.windowScrollY, note });
  console.log(`  ${name.padEnd(34)} donateVisible=${String(s.donateVisible).padEnd(5)} aiVisible=${String(s.aiVisible).padEnd(5)} donate.top=${String(s.donate && s.donate.top).padStart(5)} panel.scrollTop=${s.panel && s.panel.scrollTop} window.scrollY=${s.windowScrollY} ${note}`);
};

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 640 }, userAgent: pw["Galaxy S9+"].userAgent,
    deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "ne-NP",
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: "jawafdehi_analytics_consent", value: "denied" }] }] },
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout
    ? await page.waitForTimeout(1200) : null;

  await page.getByRole("button", { name: /^(मेनु|Menu)$/i }).first().click();
  await page.waitForTimeout(900);
  console.log(`open menu at 360x640 (${BASE})`);
  record("0. just opened", await state(page));

  // 1. wheel over the middle of the panel
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(600);
  record("1. mouse wheel +600", await state(page));

  // 2. a REAL touch scroll gesture, synthesized by the browser itself via CDP —
  //    this is the closest available thing to a thumb swipe, and unlike
  //    hand-rolled TouchEvents it drives Chromium's actual scroll machinery.
  // ⚠️ `Input.synthesizeScrollGesture` with `gestureSourceType: "touch"` scrolls
  // NOTHING in this headless build — measured 0px where the same call with the
  // default source moved 400px. An earlier version of this file used it and so
  // recorded a no-op as a failed attempt. Drive the touch points directly.
  const cdp = await ctx.newCDPSession(page);
  for (let i = 0; i < 3; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 180, y: 500 }] }).catch(() => {});
    for (let k = 1; k <= 8; k++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 180, y: 500 - k * 45 }] }).catch(() => {});
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }).catch(() => {});
    await page.waitForTimeout(400);
  }
  record("2. real touch drag x3", await state(page), "Input.dispatchTouchEvent");

  // 3. mouse drag inside the panel (a drawer with a drag handle would move)
  await page.mouse.move(180, 560); await page.mouse.down();
  await page.mouse.move(180, 200, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(600);
  record("3. drag 560->200", await state(page));

  // 4. keyboard: Tab through until the last control has focus. A browser
  //    scrolls focused elements into view, so if anything CAN scroll, this does.
  //
  //    ⚠️ This attempt gives a FALSE NEGATIVE on a tree where the bug is fixed,
  //    and it is the one output here not to trust. 24 presses OVERSHOOTS: the
  //    sheet holds 16 focusables and Donate is the 14th, so by press 24 focus has
  //    moved past it and the scrollport has carried it back off-screen — which
  //    reports `donateVisible: false` for a reason that has nothing to do with
  //    reachability. Measured against `2ac392b` and against the fixed tree, Donate
  //    takes 14 presses on BOTH, landing at top 784 (outside a 640px viewport) on
  //    the former and top 520 (visible) on the latter. Tab to the control you care
  //    about and stop, rather than tabbing a round number of times.
  for (let i = 0; i < 24; i++) await page.keyboard.press("Tab");
  await page.waitForTimeout(700);
  record("4. Tab x24 (focus scroll)", await state(page));

  // 5. explicit scrollIntoView on the Donate control — the strongest possible
  //    programmatic attempt. If even this cannot reveal it, no gesture can.
  await page.evaluate(() => {
    const p = document.querySelector('[role="dialog"]');
    if (!p) return;
    const el = Array.from(p.querySelectorAll("a,button")).find((e) => /आर्थिक सहयोग/.test(e.innerText || ""));
    if (el) el.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(700);
  record("5. donate.scrollIntoView()", await state(page));

  // 6. can Playwright actually click it? (it auto-scrolls and waits for
  //    stability, so a failure here is a genuine can't-tap.)
  let clickErr = null;
  try {
    await page.getByRole("link", { name: TARGET }).first().click({ timeout: 5000 });
  } catch (e) { clickErr = String(e).split("\n")[0].slice(0, 120); }
  const after = await state(page);
  console.log(`  6. click Donate                    ${clickErr ? "FAILED: " + clickErr : "SUCCEEDED — url now " + page.url()}`);
  attempts.push({ attempt: "6. click Donate", clickError: clickErr, urlAfter: page.url() });

  // 7. control: does the SAME menu work on a tall viewport? If yes, the defect
  //    is height-dependent, which is what makes it invisible to desktop CI.
  const tall = await browser.newContext({ viewport: { width: 360, height: 1000 }, userAgent: pw["Galaxy S9+"].userAgent, isMobile: true, hasTouch: true, locale: "ne-NP", storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: "jawafdehi_analytics_consent", value: "denied" }] }] } });
  const p2 = await tall.newPage();
  await p2.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p2.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  await p2.waitForTimeout(1200);
  await p2.getByRole("button", { name: /^(मेनु|Menu)$/i }).first().click();
  await p2.waitForTimeout(900);
  const s2 = await state(p2);
  console.log(`  7. CONTROL 360x1000               donateVisible=${s2.donateVisible} aiVisible=${s2.aiVisible} (panel scrollH=${s2.panel.scrollH})`);
  attempts.push({ attempt: "7. control 360x1000", donateVisible: s2.donateVisible, aiVisible: s2.aiVisible, panelScrollH: s2.panel.scrollH });
  await tall.close();

  await browser.close();
  console.log("\n" + JSON.stringify({ base: BASE, attempts }, null, 2));
};
main();
