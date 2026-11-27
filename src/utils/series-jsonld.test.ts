// SPDX-License-Identifier: Hippocratic-3.0
import { describe, expect, it } from "vitest";

import fixture from "../../tests/fixtures/series/deepak-bhatta-affair.json";
import type { SeriesDetail } from "@/types/series";
import { seriesJsonLd } from "@/utils/series-jsonld";

const series = fixture as unknown as SeriesDetail;
const opts = {
  canonicalUrl: "https://jawafdehi.org/series/deepak-bhatta-affair/",
  description: "पाँच मुद्दा।",
};

describe("seriesJsonLd", () => {
  it("is a CollectionPage of the member case pages, in member order", () => {
    const data = seriesJsonLd(series, opts);
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.name).toBe("दीपक भट्ट प्रकरण");
    expect(data.alternateName).toBe("Deepak Bhatta Affair");
    expect(data.url).toBe(opts.canonicalUrl);
    expect(data.description).toBe(opts.description);
    const list = data.mainEntity as { numberOfItems: number; itemListElement: Record<string, unknown>[] };
    expect(list.numberOfItems).toBe(series.members.length);
    expect(list.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      url: `https://jawafdehi.org/case/${series.members[0].case.slug}/`,
      name: series.members[0].case.title,
    });
  });

  it("names the accused by their NES @id and mentions court cases by IRI", () => {
    const data = seriesJsonLd(series, opts);
    const about = data.about as Record<string, unknown>[];
    expect(about.length).toBe(series.accused.length);
    expect(about[0]["@id"]).toBe(series.accused[0].nes_id);
    const mentions = data.mentions as Record<string, unknown>[];
    const iris = series.court_cases.map((row) => row.iri).filter(Boolean);
    expect(mentions.map((m) => m["@id"])).toEqual([...new Set(iris)]);
  });

  it("leaves out what it does not have", () => {
    const data = seriesJsonLd(
      { ...series, title: { ne: null, en: null }, accused: [], court_cases: [], updated_at: undefined },
      opts,
    );
    expect(data.name).toBe(series.slug);
    expect(data).not.toHaveProperty("alternateName");
    expect(data).not.toHaveProperty("about");
    expect(data).not.toHaveProperty("mentions");
    expect(data).not.toHaveProperty("dateModified");
  });
});
