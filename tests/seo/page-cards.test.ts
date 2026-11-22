import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import pageCards from "@/data/page-cards.json";
import { pageCard, type PageCardSlug } from "@/utils/page-cards";
import { SITE_URL } from "@/utils/seo";

// A JPEG's size sits in its SOF0/SOF2 segment: height then width, big-endian.
function jpegSize(bytes: Buffer): { width: number; height: number } {
  let i = 2;
  while (i < bytes.length) {
    const marker = bytes[i + 1];
    const length = bytes.readUInt16BE(i + 2);
    if (marker === 0xc0 || marker === 0xc2) {
      return { height: bytes.readUInt16BE(i + 5), width: bytes.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  throw new Error("no SOF segment");
}

const pageSlugs = pageCards.cards.map((c) => c.slug).filter((s) => s !== "home") as PageCardSlug[];

describe("page share cards", () => {
  it.each(pageSlugs)("%s has its drawn image in public/, at 1200x630", (slug) => {
    const { imageUrl, imageWidth, imageHeight } = pageCard(slug);
    const file = resolve(process.cwd(), "public", imageUrl.replace(`${SITE_URL}/`, ""));

    // A card listed but never rendered is an og:image that 404s: the unfurler
    // then shows no picture at all, worse than the generic card.
    expect(existsSync(file)).toBe(true);
    expect(jpegSize(readFileSync(file))).toEqual({ width: imageWidth, height: imageHeight });
  });

  it("describes the card in its own words", () => {
    expect(pageCard("team").imageAlt).toBe(
      "Built by Nepali volunteers, for Nepal. The people behind Jawafdehi.",
    );
  });

  it("gives every page its own picture", () => {
    const urls = pageSlugs.map((s) => pageCard(s).imageUrl);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
