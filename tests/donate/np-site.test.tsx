// SPDX-License-Identifier: Hippocratic-3.0
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import en from "@/i18n/locales/en.json";
import type { SiteVariant } from "@/lib/site-host";

// jawafdehi.org.np is the Nepal company's site: it must not ask for gifts to
// the US entity. Its /donate shows only the Nepal panel (the company's own
// bank account and QR codes); jawafdehi.org keeps both panels.

const variant = vi.hoisted(() => ({ current: "org" as SiteVariant | null }));
vi.mock("@/lib/site-host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/site-host")>()),
  currentSiteVariant: () => variant.current,
}));

// Resolve keys against the real English copy, so assertions are about what a
// visitor reads.
const lookup = (key: string): unknown =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en);
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => lookup(key) ?? key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

import { DonationFaq } from "@/components/donate/faq";
import { PayCard } from "@/components/donate/pay-card";

const US_ASK = [/Zeffy/, /PayPal/, /501\(c\)/, /EIN/, /Inc\./, /outside Nepal/];

function mockTimezone(timeZone: string) {
  const real = Intl.DateTimeFormat.prototype.resolvedOptions;
  return vi
    .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
    .mockImplementation(function (this: Intl.DateTimeFormat) {
      return { ...real.call(this), timeZone };
    });
}

afterEach(() => {
  variant.current = "org";
  vi.restoreAllMocks();
});

describe("/donate on jawafdehi.org.np", () => {
  it("offers only the Nepal company's bank account and QR codes", () => {
    variant.current = "np";
    const { container } = render(<PayCard />);
    const text = container.textContent ?? "";
    expect(text).toContain("Prime Commercial Bank");
    expect(container.querySelector('img[src="/assets/fonepay-qr.png"]')).not.toBeNull();
    for (const pattern of US_ASK) expect(text).not.toMatch(pattern);
    expect(container.querySelector('a[href*="zeffy"]')).toBeNull();
    expect(text).not.toContain(en.donate.ways.us.title);
  });

  it("stays on the Nepal panel for a visitor outside Nepal", () => {
    variant.current = "np";
    mockTimezone("Australia/Sydney");
    const { container } = render(<PayCard />);
    const panel = Array.from(container.querySelectorAll("article > div")).find((d) =>
      d.textContent?.includes("Prime Commercial Bank"),
    );
    expect(panel?.hasAttribute("hidden")).toBe(false);
  });

  it("drops the FAQ answers about Zeffy, PayPal and US tax deductibility", () => {
    variant.current = "np";
    const { container } = render(<DonationFaq />);
    fireEvent.click(screen.getByRole("button", { name: /Will I get a receipt\?/ }));
    const text = container.textContent ?? "";
    expect(text).not.toContain("Are my donations tax-deductible?");
    expect(text).not.toContain("Can I give monthly instead of once?");
    for (const pattern of US_ASK) expect(text).not.toMatch(pattern);
    expect(text).toContain("inquiry@jawafdehi.org.np");
  });
});

describe("/donate on jawafdehi.org is unchanged", () => {
  it("keeps the region switch, the abroad panel and the US FAQ answers", () => {
    variant.current = "org";
    const card = render(<PayCard />).container;
    expect(card.querySelector('a[href*="zeffy"]')).not.toBeNull();
    expect(card.textContent).toContain(en.donate.ways.us.title);
    const faq = render(<DonationFaq />).container.textContent ?? "";
    expect(faq).toContain("Are my donations tax-deductible?");
    expect(faq).toContain("Can I give monthly instead of once?");
    expect(faq.match(/Will I get a receipt\?/g)).toHaveLength(1);
  });

  it("pre-render marks the abroad panel and US answers so .np hides them before paint", () => {
    variant.current = null;
    const html = renderToString(
      <>
        <PayCard />
        <DonationFaq />
      </>,
    );
    expect(html).toMatch(/data-site-variant="org"><div class="mt-5"[^>]*>/);
    expect(html).toMatch(/data-site-variant="org"[^>]*>[\s\S]*?Are my donations tax-deductible\?/);
    expect(html).toMatch(/data-site-variant="np"/);
  });
});
