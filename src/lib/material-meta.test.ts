import { describe, it, expect } from "vitest";

import {
  encodeMaterialTail,
  isMaterialTail,
  materialCanonicalUrl,
  materialDescriptionText,
  materialDisplayName,
  materialJsonLd,
  materialMetaDescription,
  materialMetaTitle,
  materialRobots,
} from "./material-meta";

// This module is the single source of the head a material page shows, because
// two renderers produce it: worker.ts at the edge, MaterialProfile.tsx after
// hydration. The worker side is exercised end-to-end in
// tests/ssr/worker.material-meta.test.ts; these are the unit-level invariants
// both sides depend on.

describe("materialJsonLd is safe to embed in a <script> element", () => {
  it("escapes `<` so a name cannot close the script early", () => {
    // Centralised here rather than at each call site, which is the bug this
    // pins: MaterialProfile renders <script>{jsonLd}</script> directly, so an
    // escape applied only in worker.ts left the hydrated path exposed.
    const json = materialJsonLd(
      { "@id": "https://jawafdehi.org/material/ag/1" },
      "Report </script><script>alert(1)</script>",
      "",
    );

    expect(json).not.toContain("</script>");
    expect(json).toContain("\\u003c/script");
  });

  it("still parses back to the same structured data", () => {
    // The escape has to be lossless: `\u003c` is valid JSON for `<`, so a
    // crawler reads exactly what the record says.
    const json = materialJsonLd(
      { "@id": "https://jawafdehi.org/material/ag/1", datePublished: "2021-03-29" },
      "A < B",
      "Contains < and > signs.",
    );
    const parsed = JSON.parse(json);

    expect(parsed.name).toBe("A < B");
    expect(parsed.description).toBe("Contains < and > signs.");
    expect(parsed.datePublished).toBe("2021-03-29");
    expect(parsed.url).toBe("https://jawafdehi.org/material/ag/1");
  });

  it("omits description entirely when the record has none", () => {
    const parsed = JSON.parse(
      materialJsonLd({ "@id": "https://jawafdehi.org/material/ag/1" }, "Name", ""),
    );
    expect("description" in parsed).toBe(false);
  });
});

describe("the description a crawler reads", () => {
  it("prefers English, falls back to Nepali", () => {
    expect(
      materialDescriptionText({ description: { en: "English text.", ne: "नेपाली पाठ।" } }),
    ).toBe("English text.");
    expect(materialDescriptionText({ description: { ne: "नेपाली पाठ।" } })).toBe(
      "नेपाली पाठ।",
    );
  });

  it("strips markup", () => {
    expect(materialDescriptionText({ description: "<p>Hello <b>world</b></p>" })).toBe(
      "Hello world",
    );
  });

  it("truncates the meta tag but not the JSON-LD text", () => {
    // A stored description is frequently a whole abstract. The meta tag is cut
    // by search engines anyway; the JSON-LD is not, so it keeps the full text.
    const long = "x".repeat(500);
    const meta = materialMetaDescription({ description: long }, "Name", "Report");

    expect(meta.length).toBeLessThanOrEqual(160);
    expect(materialDescriptionText({ description: long })).toHaveLength(500);
  });

  it("names the document and its type when the record has no description", () => {
    // The whole point of the change: anything site-wide here is what made all
    // 346,250 material URLs read as copies of the homepage.
    expect(materialMetaDescription({ "@type": "Report" }, "Tender 104987", "Report")).toBe(
      "Tender 104987 — Report in the Jawafdehi governance archive.",
    );
  });
});

describe("the title falls back through the record, then the URL", () => {
  it("uses the name when there is one", () => {
    expect(materialDisplayName({ name: { en: "A Report" } }, "ag/1")).toBe("A Report");
  });

  it("humanizes the IRI tail when there is no name", () => {
    expect(
      materialDisplayName({ "@id": "https://jawafdehi.org/material/ag/annual-report" }, "ag/x"),
    ).toBe("annual report");
  });

  it("uses the URL tail when there is neither", () => {
    expect(materialDisplayName(null, "ag/56575")).toBe("56575");
  });

  it("is suffixed consistently", () => {
    expect(materialMetaTitle("A Report")).toBe("A Report | Jawafdehi governance archive");
  });
});

describe("isMaterialTail gates what reaches a URL", () => {
  it.each(["..", "../cases/a-case", "ag/../../cases/a-case", "./x", "ag/.", "ag//x", "oag-11353", ""])(
    "rejects %o",
    (tail) => {
      // `encodeURIComponent("..")` is `".."` — dots are unreserved — so encoding
      // alone does NOT make a tail safe. fetch then normalises the `..` away and
      // the request lands on a different API endpoint entirely.
      expect(isMaterialTail(tail)).toBe(false);
    },
  );

  it.each(["document/oag-11353", "ag/क-1", "us_court/dcd/24-cr-00302"])(
    "accepts %o",
    (tail) => {
      expect(isMaterialTail(tail)).toBe(true);
    },
  );
});

describe("materialRobots fails closed", () => {
  it("indexes only an explicitly LISTED material", () => {
    expect(materialRobots({ "jawafdehi:visibility": "LISTED" })).toBeNull();
  });

  it.each([
    { "jawafdehi:visibility": "UNLISTED" },
    { "jawafdehi:visibility": "PRIVATE" },
    { "jawafdehi:visibility": null },
    {},
    null,
  ])("noindexes %o", (data) => {
    // The empty object is the case that matters: it is what every API build
    // before the companion change returns.
    expect(materialRobots(data)).toBe("noindex, nofollow");
  });
});

describe("inLanguage names the language of the title actually shown", () => {
  it("says en for a bilingual record, because displayName prefers English", () => {
    // The bug: `name.ne ? "ne" : "en"` labelled this Nepali while the title
    // emitted alongside it was the English one.
    const parsed = JSON.parse(
      materialJsonLd(
        { "@id": "x", name: { en: "Annual Report", ne: "वार्षिक प्रतिवेदन" } },
        "Annual Report",
        "",
      ),
    );
    expect(parsed.name).toBe("Annual Report");
    expect(parsed.inLanguage).toBe("en");
  });

  it("says ne when Nepali is the only name", () => {
    const parsed = JSON.parse(
      materialJsonLd({ "@id": "x", name: { ne: "वार्षिक प्रतिवेदन" } }, "वार्षिक प्रतिवेदन", ""),
    );
    expect(parsed.inLanguage).toBe("ne");
  });
});

describe("the canonical URL", () => {
  it("percent-encodes each segment but keeps the separator", () => {
    // A tail is `<source>/<ident>`; encoding the whole string would eat the `/`.
    expect(encodeMaterialTail("ag/क-1")).toBe("ag/%E0%A4%95-1");
    expect(encodeMaterialTail("document/oag-11353")).toBe("document/oag-11353");
  });

  it("has no trailing slash, unlike a case page", () => {
    // Case pages are pre-rendered to /case/<slug>/index.html so the slashless
    // form 307s. Nothing is published under /material/, so it answers 200 —
    // and the API's own sitemap advertises the slashless form.
    expect(materialCanonicalUrl("document/oag-11353")).toBe(
      "https://jawafdehi.org/material/document/oag-11353",
    );
  });
});
