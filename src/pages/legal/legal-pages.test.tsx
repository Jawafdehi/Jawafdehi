// SPDX-License-Identifier: Hippocratic-3.0
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";
import { isFaqPageSection } from "@/lib/faq-page-content";
import type { SiteVariant } from "@/lib/site-host";

const state = vi.hoisted(() => ({
  variant: "org" as SiteVariant | null,
  language: "ne",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: state.language, changeLanguage: vi.fn() },
  }),
}));
vi.mock("@/lib/site-host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/site-host")>()),
  currentSiteVariant: () => state.variant,
}));
// The page shell's <Seo> needs a helmet provider; it is not under test here.
vi.mock("@/components/Seo", () => ({ Seo: () => null }));

import Privacy from "@/pages/Privacy";
import TermsOfService from "@/pages/TermsOfService";
import { registerEagerLegalBodies } from "@/pages/legal/bodies";
import { EAGER_LEGAL_BODIES } from "@/pages/legal/eager-bodies";

// What the pre-render (src/entry-server.tsx) does; the lazy client path has
// its own test in legal-lazy.test.tsx.
registerEagerLegalBodies(EAGER_LEGAL_BODIES);

const PAGES = { privacy: Privacy, terms: TermsOfService } as const;
const LANGUAGES = ["en", "ne"] as const;
const SITES = ["org", "np"] as const;

// Ways the US entity used to be named as operator, or US law chosen.
const US_OPERATOR = [/Michigan/, /मिशिगन/, /State of Michigan/, /501\(c\)/, /EIN/];
const DONATION_LINE = /Jawafdehi Initiative, Inc\./;

const textOf = (page: keyof typeof PAGES) => {
  const Page = PAGES[page];
  return render(<Page />).container.textContent ?? "";
};

afterEach(() => {
  state.variant = "org";
  state.language = "ne";
});

describe("legal pages name the Nepal company, on both sites and in both languages", () => {
  for (const language of LANGUAGES) {
    for (const site of SITES) {
      for (const page of ["privacy", "terms"] as const) {
        it(`${page} · ${language} · ${site}`, () => {
          state.language = language;
          state.variant = site;
          const text = textOf(page);
          expect(text).toContain("393949/82/83");
          expect(text).toMatch(language === "en" ? /Biratnagar Metropolitan City Ward 5/ : /विराटनगर महानगरपालिका वडा नं\. ५/);
          for (const pattern of US_OPERATOR) expect(text).not.toMatch(pattern);
        });
      }
    }
  }

  it("terms choose the laws and courts of Nepal", () => {
    state.language = "en";
    expect(textOf("terms")).toContain(
      "These Terms are governed by the laws of Nepal. Any dispute arising from these Terms is subject to the jurisdiction of the competent courts of Nepal.",
    );
    state.language = "ne";
    expect(textOf("terms")).toContain(
      "यी सर्तहरू नेपालको कानूनबमोजिम सञ्चालित हुनेछन्। यी सर्तहरूबाट उत्पन्न हुने कुनै पनि विवाद नेपालको सक्षम अदालतको क्षेत्राधिकारभित्र पर्नेछ।",
    );
  });

  it("the privacy policy scopes both domains and names the Nepal company as controller", () => {
    state.language = "en";
    const text = textOf("privacy");
    expect(text).toContain("jawafdehi.org.np");
    expect(text).toContain("Jawafdehi Initiative is the data controller");
    state.language = "ne";
    expect(textOf("privacy")).toContain("वैयक्तिक सूचनाको नियन्त्रक (data controller) जवाफदेही इनिशिएटिभ हो");
  });
});

describe("per-site differences", () => {
  it.each(LANGUAGES)("the US donation line is on jawafdehi.org only (%s)", (language) => {
    state.language = language;
    state.variant = "org";
    expect(textOf("privacy")).toMatch(DONATION_LINE);
    state.variant = "np";
    expect(textOf("privacy")).not.toMatch(DONATION_LINE);
  });

  it.each(LANGUAGES)("contact addresses follow the site (%s)", (language) => {
    state.language = language;
    state.variant = "np";
    const np = textOf("privacy") + textOf("terms");
    expect(np).toContain("privacy@jawafdehi.org.np");
    expect(np).toContain("inquiry@jawafdehi.org.np");
    expect(np).not.toMatch(/(privacy|inquiry|report)@jawafdehi\.org(?!\.np)/);

    state.variant = "org";
    const org = textOf("privacy") + textOf("terms");
    expect(org).toMatch(/privacy@jawafdehi\.org(?!\.np)/);
    expect(org).not.toContain("@jawafdehi.org.np");
  });

  it("pre-render emits both sites' copy, marked for the pre-paint CSS", () => {
    state.variant = null;
    state.language = "en";
    const html = renderToString(<Privacy />);
    expect(html).toMatch(/data-site-variant="org"[^>]*>\s*<p>\s*Gifts made through jawafdehi\.org/);
    expect(html).toMatch(/data-site-variant="np" data-site-inline="">.*privacy@jawafdehi\.org\.np/);
  });
});

describe("the Nepali and English texts match section for section", () => {
  const anchors = (page: keyof typeof PAGES, language: string) => {
    state.language = language;
    const Page = PAGES[page];
    const { container } = render(<Page />);
    return Array.from(container.querySelectorAll("h2[id], h3[id]")).map((h) => h.id);
  };

  it.each(["privacy", "terms"] as const)("%s", (page) => {
    const english = anchors(page, "en");
    expect(english.length).toBeGreaterThan(10);
    expect(anchors(page, "ne")).toEqual(english);
  });
});

describe("FAQ: how to give, on jawafdehi.org.np", () => {
  it.each([
    ["en", en],
    ["ne", ne],
  ] as const)("the .np answer asks for no gift to the US entity (%s)", (_, locale) => {
    const sections: unknown[] = locale.faqPage.sections;
    const question = sections
      .filter(isFaqPageSection)
      .flatMap((section) => section.questions)
      .find((q) => q.id === "financial-support");
    expect(question?.answer).toMatch(/Zeffy/);
    expect(question?.answerNp).toBeDefined();
    expect(question?.answerNp).not.toMatch(/Zeffy|PayPal/);
    expect(question?.answerNp).toMatch(/FonePay/);
  });
});
