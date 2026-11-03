// The platform changelog: one dated, tagged list of what has changed in the
// archive and the tools around it. /whats-new shows all of it; the home page
// and each product page show a slice (see entriesFor).
//
// Rules for an entry:
//   * it has shipped — merged and live, never planned
//   * it is written for a reader of the archive, not for a developer: what
//     they can now do or see, in a sentence or two
//   * the date is the day it went live, and the newest entry goes first
//
// Text is kept here rather than in the locale files because an entry is
// content, written once with both languages side by side.

export const WHATS_NEW_TAGS = ["archive", "mcp", "api", "likhit", "chat"] as const;
export type WhatsNewTag = (typeof WHATS_NEW_TAGS)[number];

type Bilingual = { en: string; ne: string };

export type WhatsNewEntry = {
  id: string;
  /** ISO date the change went live. */
  date: string;
  tags: readonly WhatsNewTag[];
  title: Bilingual;
  body: Bilingual;
  /** Where to go next: a route inside the site, or an absolute URL. */
  href?: string;
  /** Kept at the front of short lists (the home page) regardless of date. */
  pinned?: boolean;
};

export const WHATS_NEW: readonly WhatsNewEntry[] = [
  {
    id: "likhit-0-2-0",
    date: "2026-10-18",
    tags: ["likhit"],
    title: {
      en: "Likhit 0.2.0 redacts personal data",
      ne: "लिखित ०.२.० ले व्यक्तिगत विवरण हटाउँछ",
    },
    body: {
      en: "Likhit, our open-source reader for Nepali government documents, now removes personal details such as citizenship and phone numbers as it converts, and can turn a PDF into a properly redacted one.",
      ne: "नेपाली सरकारी कागजात पढ्ने हाम्रो खुला स्रोत टुल लिखितले अब रूपान्तरण गर्दै नागरिकता र फोन नम्बरजस्ता व्यक्तिगत विवरण हटाउँछ, र PDF लाई साँच्चै सम्पादित PDF मा बदल्न सक्छ।",
    },
    href: "/likhit",
  },
  {
    id: "mcp-document-tools",
    date: "2026-10-13",
    tags: ["mcp"],
    title: {
      en: "Your AI can now read long documents",
      ne: "तपाईंको एआईले अब लामा कागजात पढ्न सक्छ",
    },
    body: {
      en: "Four new MCP tools let an assistant open a document, see what is inside, and read one part at a time: a page range, a table or a figure, even in an Auditor General report hundreds of pages long.",
      ne: "चार नयाँ MCP टुलले सहायकलाई कागजात खोल्न, भित्र के छ हेर्न, र एकपटकमा एउटा भाग पढ्न दिन्छन्: केही पाना, एउटा तालिका वा चित्र, सयौं पानाको महालेखा परीक्षकको प्रतिवेदनमा पनि।",
    },
    href: "/mcp",
  },
  {
    id: "mcp-connect-page",
    date: "2026-10-07",
    tags: ["mcp"],
    pinned: true,
    title: {
      en: "Connect the archive to your AI",
      ne: "अभिलेखलाई आफ्नो एआईसँग जोड्नुहोस्",
    },
    body: {
      en: "The Jawafdehi MCP brings the archive into Claude, ChatGPT or any MCP client. Ask about cases, court records and documents, and get answers that cite their sources.",
      ne: "जवाफदेही MCP ले अभिलेखलाई क्लाउड, च्याटजिपिटी वा कुनै पनि MCP क्लाइन्टभित्र ल्याउँछ। मुद्दा, अदालती अभिलेख र कागजातबारे सोध्नुहोस्, र स्रोतसहितको जवाफ पाउनुहोस्।",
    },
    href: "/mcp",
  },
  {
    id: "likhit-quality-and-privacy",
    date: "2026-08-29",
    tags: ["likhit"],
    title: {
      en: "Likhit checks its own transcripts",
      ne: "लिखितले आफ्नै प्रतिलिपि जाँच्छ",
    },
    body: {
      en: "Likhit can now audit a converted document for damage, such as broken Devanagari, so a bad conversion is caught without reading every page.",
      ne: "लिखितले अब रूपान्तरित कागजातमा बिग्रिएको देवनागरीजस्ता त्रुटि जाँच्न सक्छ, जसले हरेक पाना नपढी नराम्रो रूपान्तरण समात्छ।",
    },
    href: "/likhit",
  },
  {
    id: "one-api",
    date: "2026-07-02",
    tags: ["archive", "api"],
    title: {
      en: "One API for the whole archive",
      ne: "पूरा अभिलेखका लागि एउटै API",
    },
    body: {
      en: "Corruption cases, people and public bodies, and court records now come from a single service at api.jawafdehi.org.",
      ne: "भ्रष्टाचारका मुद्दा, व्यक्ति र सार्वजनिक निकाय, र अदालती अभिलेख अब api.jawafdehi.org को एउटै सेवाबाट आउँछन्।",
    },
    href: "https://api.jawafdehi.org/api/swagger/",
  },
];

/** The most recent entry's date: the page's "last updated". */
export const WHATS_NEW_UPDATED = WHATS_NEW[0].date;

/**
 * A slice of the changelog: optionally one tag, pinned entries first when
 * asked, newest first otherwise, at most `limit` long.
 */
export function entriesFor({
  tag,
  limit,
  pinnedFirst = false,
}: { tag?: WhatsNewTag; limit?: number; pinnedFirst?: boolean } = {}): WhatsNewEntry[] {
  const matching = WHATS_NEW.filter((entry) => !tag || entry.tags.includes(tag));
  const ordered = pinnedFirst
    ? [...matching.filter((e) => e.pinned), ...matching.filter((e) => !e.pinned)]
    : matching;
  return limit ? ordered.slice(0, limit) : ordered;
}

/** Tags that at least one entry carries, in WHATS_NEW_TAGS order. */
export function tagsInUse(): WhatsNewTag[] {
  return WHATS_NEW_TAGS.filter((tag) => WHATS_NEW.some((entry) => entry.tags.includes(tag)));
}
