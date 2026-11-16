import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";
import { siteVariantForHost, type SiteVariant } from "@/lib/site-host";

// Resolve keys against the real English copy, so the assertions are about what
// a visitor actually reads.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en) ??
      key,
    i18n: { resolvedLanguage: "en", language: "en", changeLanguage: vi.fn() },
  }),
}));

const variant = vi.hoisted(() => ({ current: "org" as SiteVariant | null }));
vi.mock("@/lib/site-host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/site-host")>()),
  currentSiteVariant: () => variant.current,
}));

import { Footer } from "@/components/Footer";

// Every way the US entity is identified. None may reach the .org.np footer.
const US_ENTITY = [/Inc\./, /501\(c\)/, /EIN/, /42-3114954/, /Michigan/];

const footerText = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  ).container.textContent ?? "";

afterEach(() => {
  variant.current = "org";
});

describe("Footer legal entity line, per host", () => {
  it("jawafdehi.org keeps the existing line naming both entities", () => {
    variant.current = "org";
    const text = footerText();
    expect(text).toContain(en.footer.legalEntity);
    expect(text).not.toContain(en.footer.legalEntityNp);
  });

  it("jawafdehi.org.np names only the Nepal entity", () => {
    variant.current = "np";
    const text = footerText();
    expect(text).toContain(en.footer.legalEntityNp);
    expect(text).toContain("393949/82/83");
    for (const pattern of US_ENTITY) expect(text).not.toMatch(pattern);
  });

  it("pre-render emits both variants, marked so CSS can pick one before paint", () => {
    variant.current = null;
    const html = renderToString(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(html).toMatch(/data-site-variant="org"[^>]*>[^<]*Michigan/);
    expect(html).toMatch(/data-site-variant="np"[^>]*>[^<]*jawafdehi\.org\.np/);
  });

  it("the Nepal copy carries no US-entity text in either language", () => {
    for (const copy of [en.footer.legalEntityNp, ne.footer.legalEntityNp]) {
      for (const pattern of US_ENTITY) expect(copy).not.toMatch(pattern);
    }
  });
});

describe("site host detection", () => {
  it.each([
    ["jawafdehi.org.np", "np"],
    ["www.jawafdehi.org.np", "np"],
    ["JAWAFDEHI.ORG.NP.", "np"],
    ["jawafdehi.org", "org"],
    ["www.jawafdehi.org", "org"],
    ["feat-x-jawafdehi.newnepal.workers.dev", "org"],
    ["localhost", "org"],
    ["jawafdehi.org.np.example.com", "org"],
    ["notjawafdehi.org.np", "org"],
  ])("%s → %s", (host, expected) => {
    expect(siteVariantForHost(host)).toBe(expected);
  });

  it("index.html's pre-paint script uses the same host rule", () => {
    const html = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
    const source = html.match(/if \((\/.+\/i)\.test\(location\.hostname\)\)/)?.[1];
    expect(source).toBeDefined();
    const [, body, flags] = source!.match(/^\/(.+)\/(\w*)$/)!;
    const prePaint = new RegExp(body, flags);
    for (const host of ["jawafdehi.org.np", "www.jawafdehi.org.np", "jawafdehi.org", "notjawafdehi.org.np"]) {
      expect(prePaint.test(host) ? "np" : "org").toBe(siteVariantForHost(host));
    }
  });
});
