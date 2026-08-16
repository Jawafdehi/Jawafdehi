// SPDX-License-Identifier: Hippocratic-3.0
//
// Phone gates. Runs under the four `mobile-*` projects in playwright.config.ts,
// so every check below executes at 360x640, 390x844, 320x568 and 640x360.
//
// These are RATCHET gates, not aspirations: each one is green on the tree that
// introduced it, with today's known defects listed explicitly in
// `KNOWN_DEFECTS` below. A new regression fails immediately; an existing defect
// fails only once someone deletes its entry — which is what fixing it should do.
//
// Why each gate exists (all four were measured on production, 2026-08-16 — see
// docs/testing/mobile-audit-2026-08-16.md):
//   * overflow      — /report overflowed by 65px on all 7 viewports tested and
//                     /donate by 94px at 320px wide, and NOTHING caught it.
//   * shrink-to-fit — the reason nothing caught it: Chromium's mobile emulation
//                     zooms the page out to swallow the overflow and reports the
//                     INFLATED innerWidth, so `scrollWidth > innerWidth` is 0 on
//                     a page rendering 29% smaller than designed.
//   * reachability  — the nav sheet's last 5 items, Donate among them, could not
//                     be reached by any gesture at 360x640.
//   * input zoom    — every field is 14px, so iOS Safari zooms on focus.
import { test, expect, type Page } from "@playwright/test";

// Routes that must survive a phone. Keep this list short and load-bearing:
// one representative of each layout family, plus every form.
const ROUTES = [
  "/",
  "/cases",
  "/search",
  "/entities",
  "/materials",
  "/courtcases",
  "/data-quality",
  "/updates",
  "/report",
  "/feedback",
  "/donate",
  "/about",
  "/team",
  "/faq",
];

// Defects present when these gates were written. Delete an entry when the
// underlying bug is fixed — leaving a stale entry silently un-gates a route.
//
// `MOBILE_GATES_STRICT=1` drops every allowance. That is how you check these
// gates still BITE: with it set, the run MUST fail on /report, /donate, the
// mobile nav and the sub-16px fields. A strict run that passes means a gate has
// gone vacuous — the allowlist is not the only thing that can silence it.
const STRICT = process.env.MOBILE_GATES_STRICT === "1";
const KNOWN_DEFECTS = STRICT
  ? { overflow: {} as Record<string, number>, unreachableOverlays: [] as string[], inputZoomIsKnown: false }
  : {
      // route -> max tolerated horizontal overflow in CSS px, per the 2026-08-16 audit
      overflow: {
        "/report": 105, // input#evidence: `sr-only` loses to the Input base's w-full/h-10 (later in the stylesheet). 65px on phones, 102px on iPad portrait
        "/donate": 95, // a whitespace-nowrap PayPal CTA sets a 350px min-content floor: 94px at 320w
      } as Record<string, number>,
      // Overlays whose content cannot currently be scrolled to. See sheet.tsx:39,41.
      unreachableOverlays: ["mobile-nav"],
      // Every form field inherits .font-input -> text-sm (14px). One fix unblocks all.
      inputZoomIsKnown: true,
    };

/** Deny analytics before first paint so no beacon fires and the banner never masks the fold. */
async function denyAnalytics(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("jawafdehi_analytics_consent", "denied");
    } catch {
      /* private mode */
    }
  });
}

async function settle(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(600);
}

test.describe("phone layout", () => {
  test.beforeEach(async ({ page }) => denyAnalytics(page));

  for (const route of ROUTES) {
    test(`no horizontal overflow: ${route}`, async ({ page }, testInfo) => {
      const want = testInfo.project.use.viewport!.width;
      await settle(page, route);

      const m = await page.evaluate((requested) => {
        const inner = window.innerWidth;
        const sw = document.documentElement.scrollWidth;
        const offenders: { tag: string; cls: string; over: number; minContent: number }[] = [];
        const clipped = (el: Element) => {
          for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
            const ox = getComputedStyle(n).overflowX;
            if (ox === "hidden" || ox === "clip" || ox === "auto" || ox === "scroll") return true;
          }
          return false;
        };
        for (const el of Array.from(document.querySelectorAll("*"))) {
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;
          if (r.right - requested <= 1) continue;
          if (clipped(el)) continue;
          const s = (el as HTMLElement).style;
          const prev = s.width;
          s.width = "min-content";
          const mc = Math.round(el.getBoundingClientRect().width);
          s.width = prev;
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.getAttribute("class") || "").slice(0, 100),
            over: Math.round(r.right - requested),
            minContent: mc,
          });
          if (offenders.length >= 6) break;
        }
        return { inner, sw, requested, overflow: Math.max(0, sw - requested), offenders };
      }, want);

      const tolerated = KNOWN_DEFECTS.overflow[route] ?? 0;
      expect(
        m.overflow,
        `${route} overflows its ${want}px viewport by ${m.overflow}px ` +
          `(innerWidth reported ${m.inner} — Chromium zoomed out to hide it). ` +
          `Offenders: ${JSON.stringify(m.offenders)}`,
      ).toBeLessThanOrEqual(tolerated);
    });
  }

  // The shrink-to-fit signal on its own: innerWidth larger than the viewport we
  // asked for means the browser scaled the page down to fit overflowing content.
  // Kept separate because it is the thing that MASKS the gate above, and a
  // future refactor could silence one without the other.
  for (const route of ["/", "/cases", "/report", "/donate"]) {
    test(`page is not zoomed out to fit: ${route}`, async ({ page }, testInfo) => {
      const want = testInfo.project.use.viewport!.width;
      await settle(page, route);
      const inner = await page.evaluate(() => window.innerWidth);
      const pct = Math.round(((inner - want) / want) * 100);
      const tolerated = KNOWN_DEFECTS.overflow[route] ? 35 : 0;
      expect(
        pct,
        `${route} renders ${pct}% zoomed out at ${want}px (innerWidth ${inner}): ` +
          `text designed at 16px is painted at ~${(16 / (inner / want)).toFixed(1)}px.`,
      ).toBeLessThanOrEqual(tolerated);
    });
  }
});

test.describe("phone reachability", () => {
  test.beforeEach(async ({ page }) => denyAnalytics(page));

  test("every item in the mobile nav can be reached", async ({ page }) => {
    await settle(page, "/");
    await page.getByRole("button", { name: /^(मेनु|Menu)$/i }).first().click();
    await page.waitForTimeout(600);

    const m = await page.evaluate(() => {
      const panel = document.querySelector('[role="dialog"]');
      if (!panel) return null;
      const cs = getComputedStyle(panel);
      const scrolls =
        /(auto|scroll)/.test(cs.overflowY) && panel.scrollHeight > panel.clientHeight + 1;
      const items = Array.from(panel.querySelectorAll("a[href],button")).filter(
        (e) => e.getBoundingClientRect().height > 0,
      );
      const out = items
        .map((e) => {
          const r = e.getBoundingClientRect();
          return {
            label: (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40),
            below: r.top > window.innerHeight,
          };
        })
        .filter((i) => i.below);
      return { scrolls, contentH: panel.scrollHeight, panelH: panel.clientHeight, unreachable: out };
    });

    expect(m, "mobile nav did not open").not.toBeNull();
    // Content taller than the panel is fine — as long as the panel scrolls.
    const broken = !m!.scrolls && m!.unreachable.length > 0;
    const known = KNOWN_DEFECTS.unreachableOverlays.includes("mobile-nav");
    expect(
      broken && !known,
      `${m!.unreachable.length} nav items sit below the fold in a panel that does not ` +
        `scroll (content ${m!.contentH}px in a ${m!.panelH}px panel, overflow-y not auto/scroll). ` +
        `Unreachable: ${m!.unreachable.map((i) => i.label).join(", ")}. ` +
        `Fix: add \`overflow-y-auto overscroll-contain\` to sheetVariants in src/components/ui/sheet.tsx.`,
    ).toBe(false);
  });

  // Any dialog/sheet, not just the nav: content outside the viewport with no
  // scroll container anywhere is unreachable, full stop.
  test("open overlays never strand content outside the viewport", async ({ page }) => {
    await settle(page, "/data-quality");
    const trigger = page.getByRole("button", { name: /डेटा|use this data|API/i }).first();
    if (!(await trigger.count())) test.skip(true, "no overlay trigger on this build");
    await trigger.click();
    await page.waitForTimeout(600);

    const m = await page.evaluate(() => {
      const p = document.querySelector('[role="dialog"]');
      if (!p) return null;
      const r = p.getBoundingClientRect();
      const canScroll = (el: Element) => {
        const cs = getComputedStyle(el);
        return /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1;
      };
      const anyScroller =
        canScroll(p) || Array.from(p.querySelectorAll("*")).some((d) => canScroll(d));
      return {
        anyScroller,
        aboveTop: Math.max(0, Math.round(-r.top)),
        belowBottom: Math.max(0, Math.round(r.bottom - window.innerHeight)),
      };
    });
    if (!m) test.skip(true, "overlay did not open");
    const stranded = m!.anyScroller ? 0 : m!.aboveTop + m!.belowBottom;
    expect(
      stranded,
      `overlay leaves ${stranded}px outside the viewport with no scroll container ` +
        `(${m!.aboveTop}px above, ${m!.belowBottom}px below).`,
    ).toBe(0);
  });
});

test.describe("phone input ergonomics", () => {
  test.beforeEach(async ({ page }) => denyAnalytics(page));

  // iOS Safari zooms the whole page when a focused field's font-size is under
  // 16px, and the viewport meta sets no maximum-scale, so nothing suppresses it.
  // Not reproducible in Chromium or in Linux WebKit — this is a source-level
  // gate standing in for a device behaviour, which is exactly why it is a gate.
  for (const route of ["/", "/report", "/feedback"]) {
    test(`form fields are >=16px so iOS does not zoom on focus: ${route}`, async ({ page }) => {
      await settle(page, route);
      const small = await page.evaluate(() =>
        Array.from(document.querySelectorAll("input:not([type=hidden]), select, textarea"))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 1 && r.height > 1;
          })
          .map((el) => ({
            id: el.id || el.getAttribute("name") || el.tagName.toLowerCase(),
            fontSize: parseFloat(getComputedStyle(el).fontSize),
          }))
          .filter((f) => f.fontSize < 16),
      );
      if (KNOWN_DEFECTS.inputZoomIsKnown && small.length) {
        test.info().annotations.push({
          type: "known-defect",
          description: `${small.length} sub-16px fields on ${route}: fix .font-input in src/styles/typography.css`,
        });
        return;
      }
      expect(
        small,
        `these fields are under 16px, so focusing one zooms the page on iOS: ` +
          `${small.map((f) => `${f.id}@${f.fontSize}px`).join(", ")}. ` +
          `Fix once in \`.font-input\` (src/styles/typography.css): \`text-base sm:text-sm\`.`,
      ).toEqual([]);
    });
  }
});
