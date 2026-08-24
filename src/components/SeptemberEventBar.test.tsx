// SPDX-License-Identifier: Hippocratic-3.0
//
// The strip announces one moment that lands on two calendar days: the evening of
// 2 September for the diaspora, the morning of भदौ १८ / 3 September in Nepal.
// It used to carry a `barWhenShort` that phones got instead of the full line —
// which meant an English reader on a phone saw only the Pacific day and a Nepali
// reader only the Nepal day. That is not a shorter way of saying the same thing,
// it is telling half the audience the wrong day, so these gates assert both
// halves ship in both locales and that neither is hidden at any width.
import { describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { SeptemberEventBar } from "@/components/SeptemberEventBar";
import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";

const LOCALES = { en, ne } as const;

// Resolve keys against a REAL locale file, not a passthrough: the point of these
// gates is what the shipped translations say, so a stub that echoes the key back
// would assert nothing.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const bundle = (globalThis as { __locale?: Record<string, unknown> }).__locale ?? {};
      return key.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], bundle);
    },
  }),
}));

function renderLocale(locale: keyof typeof LOCALES) {
  (globalThis as { __locale?: unknown }).__locale = LOCALES[locale];
  cleanup();
  return render(<SeptemberEventBar />);
}

/**
 * True when `el` or anything between it and the strip is display:none below the
 * `sm` breakpoint — Tailwind's `hidden` with no unprefixed counterpart. jsdom
 * does not evaluate Tailwind, so this reads the classes the utility stands for.
 */
function hiddenOnPhones(el: Element): boolean {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const cls = n.getAttribute("class") ?? "";
    if (/(^|\s)hidden(\s|$)/.test(cls)) return true;
    if (n.tagName.toLowerCase() === "aside") break;
  }
  return false;
}

describe("September event bar", () => {
  for (const locale of ["en", "ne"] as const) {
    describe(locale, () => {
      const parts = (LOCALES[locale] as { septemberEvent: { barWhenParts: string[] } })
        .septemberEvent.barWhenParts;

      it("carries both calendar days in the locale file", () => {
        expect(
          parts,
          `${locale}.json septemberEvent.barWhenParts must hold both days of the event — ` +
            `the US evening and the Nepal morning — as separate, non-wrapping units.`,
        ).toHaveLength(2);
        expect(parts.every((p) => p.trim().length > 0)).toBe(true);
      });

      it("renders every day, and hides none of them on phones", () => {
        renderLocale(locale);
        for (const part of parts) {
          const node = screen.getByText(part);
          expect(node, `"${part}" is missing from the bar in ${locale}`).toBeTruthy();
          expect(
            hiddenOnPhones(node),
            `"${part}" is inside a \`hidden\` wrapper, so a phone shows only the other ` +
              `day of a two-day event. The bar must wrap, not drop a date.`,
          ).toBe(false);
        }
      });

      it("keeps each day on one line so a wrap cannot split a time", () => {
        renderLocale(locale);
        for (const part of parts) {
          expect(
            screen.getByText(part).getAttribute("class") ?? "",
            `"${part}" must be \`whitespace-nowrap\`: without it a narrow phone breaks ` +
              `the line through the middle of the time.`,
          ).toMatch(/whitespace-nowrap/);
        }
      });
    });
  }

  it("no longer ships a phone-only short form of the date", () => {
    for (const [locale, bundle] of Object.entries(LOCALES)) {
      const ev = (bundle as { septemberEvent: Record<string, unknown> }).septemberEvent;
      expect(
        ev.barWhenShort,
        `${locale}.json still has septemberEvent.barWhenShort. That key existed to give ` +
          `phones one of the two days; it is what this component was fixed to stop doing.`,
      ).toBeUndefined();
    }
  });
});
