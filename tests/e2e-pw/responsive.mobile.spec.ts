// SPDX-License-Identifier: Hippocratic-3.0
//
// Phone gates. Runs under the four `mobile-*` projects in playwright.config.ts,
// so every check below executes at 360x640, 390x664, 320x568 and 640x360.
// (390x664, not 390x844: the iPhone 14's 844 is a SCREEN height. Playwright's
// descriptor already nets out browser chrome, and testing 844 would be testing a
// viewport nobody has.)
//
// These are RATCHET gates, not aspirations: each one is green on the tree that
// introduced it, with today's known defects listed explicitly in
// `KNOWN_DEFECTS` below. A new regression fails immediately. An existing defect
// is exempt while its entry is present — and the entry itself is checked, so
// fixing the bug without deleting the entry fails too, which is what stops a
// stale exemption from silently un-gating a route.
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
// underlying bug is fixed.
//
// Every allowance is an upper bound (`toBeLessThanOrEqual`), so a fix that lands
// without its entry being trimmed would leave the run GREEN — silently un-gating
// the route, permanently. The upper bound is deliberate (these fixes land in
// separate PRs and merge order should not matter), so instead of relying on
// somebody remembering, **every entry also asserts the defect still reproduces**.
// Fix the bug and leave the entry, and the run goes RED telling you to delete it.
//
// That makes each entry a measured claim rather than a standing exemption, and it
// keeps `main` safe: CI runs on `refs/pull/N/merge`, so the PR that would strand a
// stale entry goes red on its own branch, before it can land.
//
// `presentAt` is the set of viewport widths where the defect was MEASURED on
// `main` — it is not decoration. /donate does not overflow at 640px, so claiming
// it there would fail the staleness check on a bug that was never present.
//
// `MOBILE_GATES_STRICT=1` drops every allowance. That is how you check these
// gates still BITE: with it set, the run MUST fail on /report, /donate, the
// mobile nav and the sub-16px fields. A strict run that passes means a gate has
// gone vacuous — the allowlist is not the only thing that can silence it.
const STRICT = process.env.MOBILE_GATES_STRICT === "1";

type OverflowAllowance = {
  /** Upper bound in CSS px, across every viewport this spec drives. */
  maxPx: number;
  /** Widths where the overflow was measured > 0 on `main`, 2026-08-16. */
  presentAt: number[];
};

const KNOWN_DEFECTS = STRICT
  ? { overflow: {} as Record<string, OverflowAllowance>, unreachableOverlays: [] as string[], inputZoomIsKnown: false }
  : {
      overflow: {
        // input#evidence: `sr-only` loses to the Input base's w-full/h-10, which
        // Tailwind emits later in the stylesheet. 65px at 320/360/390, 73px at
        // 640. The bound also covers the 102px this reproduces at on iPad
        // portrait, which tests/mobile/audit.mjs drives and this spec does not.
        "/report": { maxPx: 105, presentAt: [320, 360, 390, 640] },
        // A whitespace-nowrap PayPal CTA sets a 350px min-content floor:
        // 94px at 320w, 55px at 360w, 24px at 390w — and 0 at 640w, where the
        // CTA finally fits, so 640 is deliberately absent.
        "/donate": { maxPx: 95, presentAt: [320, 360, 390] },
      } as Record<string, OverflowAllowance>,
      // Overlays whose content cannot currently be scrolled to. See sheet.tsx:39,41.
      unreachableOverlays: ["mobile-nav"],
      // Every form field inherits .font-input -> text-sm (14px). One fix unblocks all.
      inputZoomIsKnown: true,
    };

/** Message for an allowance that outlived the bug it was written for. */
const stale = (entry: string, what: string) =>
  `${entry} is STALE: ${what}. The bug it exempts is fixed, so the entry now ` +
  `exempts nothing and would keep this gate green forever. ` +
  `Delete the entry from KNOWN_DEFECTS in this file.`;

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

      const allow = KNOWN_DEFECTS.overflow[route];
      expect(
        m.overflow,
        `${route} overflows its ${want}px viewport by ${m.overflow}px ` +
          `(innerWidth reported ${m.inner} — Chromium zoomed out to hide it). ` +
          `Offenders: ${JSON.stringify(m.offenders)}`,
      ).toBeLessThanOrEqual(allow?.maxPx ?? 0);

      if (allow?.presentAt.includes(want)) {
        expect(
          m.overflow,
          stale(`KNOWN_DEFECTS.overflow["${route}"]`, `${route} no longer overflows at ${want}px`),
        ).toBeGreaterThan(0);
      }
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
      // Only the widths where the overflow actually reproduces get the allowance:
      // /donate fits at 640px, so it must not be zoomed out there either.
      const tolerated = KNOWN_DEFECTS.overflow[route]?.presentAt.includes(want) ? 35 : 0;
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

      // Reachability is per-control, not per-panel. Asking only whether the
      // PANEL scrolls fails the correct fix: putting the scrollport on a wrapper
      // INSIDE the panel is better design — it keeps the close button pinned
      // instead of scrolling it away — and leaves the panel itself
      // `overflow-y: visible`. So walk each control's ancestors up to and
      // including the panel and ask whether anything can scroll it into view.
      const scrollableTo = (el: Element) => {
        for (let n: Element | null = el.parentElement; n; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) return true;
          if (n === panel) break;
        }
        return false;
      };

      const panelScrolls =
        /(auto|scroll)/.test(getComputedStyle(panel).overflowY) &&
        panel.scrollHeight > panel.clientHeight + 1;
      const scrollports = [panel, ...Array.from(panel.querySelectorAll("*"))].filter((n) => {
        const cs = getComputedStyle(n);
        return /(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1;
      }).length;

      const out = Array.from(panel.querySelectorAll("a[href],button"))
        .filter((e) => e.getBoundingClientRect().height > 0)
        .map((e) => ({
          label: (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40),
          below: e.getBoundingClientRect().top > window.innerHeight,
          rescuable: scrollableTo(e),
        }))
        .filter((i) => i.below && !i.rescuable);

      return {
        panelScrolls,
        scrollports,
        contentH: panel.scrollHeight,
        panelH: panel.clientHeight,
        unreachable: out,
      };
    });

    expect(m, "mobile nav did not open").not.toBeNull();
    // Content taller than the viewport is fine — as long as SOMETHING can scroll
    // each control into view.
    const broken = m!.unreachable.length > 0;
    const known = KNOWN_DEFECTS.unreachableOverlays.includes("mobile-nav");
    expect(
      broken && !known,
      `${m!.unreachable.length} nav items sit below the fold with no scrollable ancestor ` +
        `inside the sheet (content ${m!.contentH}px in a ${m!.panelH}px panel, ` +
        `${m!.scrollports} scrollports found, panel itself scrolls=${m!.panelScrolls}). ` +
        `Unreachable: ${m!.unreachable.map((i) => i.label).join(", ")}. ` +
        `Fix: give the sheet's content wrapper \`overflow-y-auto overscroll-contain\` ` +
        `in src/components/ui/sheet.tsx.`,
    ).toBe(false);

    if (known) {
      expect(
        broken,
        stale(
          `KNOWN_DEFECTS.unreachableOverlays "mobile-nav"`,
          `every control is now reachable (${m!.scrollports} scrollport(s) inside the sheet, ` +
            `content ${m!.contentH}px in a ${m!.panelH}px panel)`,
        ),
      ).toBe(true);
    }
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
      const fields = await page.evaluate(() =>
        Array.from(document.querySelectorAll("input:not([type=hidden]), select, textarea"))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 1 && r.height > 1;
          })
          .map((el) => ({
            id: el.id || el.getAttribute("name") || el.tagName.toLowerCase(),
            fontSize: parseFloat(getComputedStyle(el).fontSize),
          })),
      );
      const small = fields.filter((f) => f.fontSize < 16);
      if (KNOWN_DEFECTS.inputZoomIsKnown) {
        if (small.length) {
          test.info().annotations.push({
            type: "known-defect",
            description: `${small.length} sub-16px fields on ${route}: fix .font-input in src/styles/typography.css`,
          });
          return;
        }
        // No sub-16px fields. Either the defect is fixed and this exemption should
        // go, or the route rendered no fields at all — in which case it is no
        // evidence either way, so say so rather than declaring the entry stale.
        expect(
          fields.length,
          `${route} rendered no visible form fields, so it cannot tell you whether ` +
            `the sub-16px defect is fixed. Pick a route that has fields.`,
        ).toBeGreaterThan(0);
        expect(
          small.length,
          stale(
            "KNOWN_DEFECTS.inputZoomIsKnown",
            `all ${fields.length} fields on ${route} are >=16px`,
          ),
        ).toBeGreaterThan(0);
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
