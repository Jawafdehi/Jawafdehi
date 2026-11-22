import pageCards from "@/data/page-cards.json";

import { SITE_URL } from "./seo";

/** Every page share card is drawn at the Open Graph size. */
export const PAGE_CARD_WIDTH = 1200;
export const PAGE_CARD_HEIGHT = 630;

type Card = (typeof pageCards.cards)[number] & { file?: string };

export type PageCardSlug = Exclude<(typeof pageCards.cards)[number]["slug"], "home">;

/**
 * The share-card props for a page's <Seo>: the image scripts/render-social-card.mjs
 * drew from the same entry in data/page-cards.json, its size, and alt text built
 * from the card's own words, so the alt always says what the picture says.
 *
 *     <Seo title=… description=… canonicalUrl=… {...pageCard("donate")} />
 */
export function pageCard(slug: PageCardSlug) {
  const card = (pageCards.cards as Card[]).find((c) => c.slug === slug);
  if (!card) throw new Error(`no share card for ${slug}`);
  return {
    imageUrl: `${SITE_URL}/${card.file ?? `assets/og/${card.slug}.jpg`}`,
    imageAlt: `${card.title.join("")}. ${card.sub}`,
    imageWidth: PAGE_CARD_WIDTH,
    imageHeight: PAGE_CARD_HEIGHT,
  };
}
