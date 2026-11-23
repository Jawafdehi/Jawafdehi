// SPDX-License-Identifier: Hippocratic-3.0
import { describe, expect, it } from "vitest";

import { breadcrumbJsonLd, jsonLdString } from "./json-ld";

describe("jsonLdString", () => {
  it("cannot be made to close the <script> element it is emitted into", () => {
    // A court's case-type text, a case title or a name is data we do not control.
    const out = jsonLdString({ name: "a</script><img src=x onerror=alert(1)>" });
    expect(out).not.toMatch(/<\/script/i);
    expect(out).not.toContain("<");
  });

  it("is still the same JSON to a JSON parser", () => {
    const value = { name: "a</script>b", n: 3, nested: { list: ["<x>"] } };
    expect(JSON.parse(jsonLdString(value))).toEqual(value);
  });

  it("leaves Devanagari untouched", () => {
    // Only `<` is escaped. Nepali text must survive verbatim, not as \u escapes.
    expect(jsonLdString({ name: "रकम हिनामिना" })).toContain("रकम हिनामिना");
  });
});

describe("breadcrumbJsonLd", () => {
  const trail = [
    { label: "गृहपृष्ठ", to: "/" },
    { label: "Court cases", to: "/search/?type=courtcase" },
    { label: "071-CR-0232" },
  ];

  it("describes the trail as a BreadcrumbList, 1-based", () => {
    const ld = breadcrumbJsonLd(trail, "https://jawafdehi.org");
    expect(ld).toMatchObject({ "@context": "https://schema.org", "@type": "BreadcrumbList" });
    const items = (ld as { itemListElement: Record<string, unknown>[] }).itemListElement;
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(items.map((i) => i.name)).toEqual(["गृहपृष्ठ", "Court cases", "071-CR-0232"]);
  });

  it("links every crumb absolutely except the current page", () => {
    const items = (breadcrumbJsonLd(trail, "https://jawafdehi.org") as {
      itemListElement: Record<string, unknown>[];
    }).itemListElement;
    expect(items[0].item).toBe("https://jawafdehi.org/");
    expect(items[1].item).toBe("https://jawafdehi.org/search/?type=courtcase");
    // The last crumb is the page itself; Google accepts no `item` for exactly it.
    expect(items[2]).not.toHaveProperty("item");
  });

  it("emits nothing for a trail too short to be one", () => {
    expect(breadcrumbJsonLd([])).toBeNull();
    expect(breadcrumbJsonLd([{ label: "Home", to: "/" }])).toBeNull();
  });

  it("survives a crumb whose path cannot be parsed", () => {
    // A bad path is a caller bug; it must not take the page down.
    const ld = breadcrumbJsonLd(
      [{ label: "Home", to: "/" }, { label: "Odd", to: "http://[::1" }, { label: "Here" }],
      "https://jawafdehi.org",
    );
    const items = (ld as { itemListElement: Record<string, unknown>[] }).itemListElement;
    expect(items[1]).toMatchObject({ name: "Odd", position: 2 });
    expect(items[1]).not.toHaveProperty("item");
  });
});
