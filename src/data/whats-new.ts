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
    id: "likhit-careful-redaction",
    date: "2026-11-02",
    tags: ["likhit"],
    title: {
      en: "Likhit marks what it redacts",
      ne: "लिखितले हटाएको ठाउँ अब देखिन्छ",
    },
    body: {
      en: "A redacted spot in a PDF is now marked, not left blank, so a reader can tell something was removed. Driving licence numbers are no longer mistaken for phone numbers and removed.",
      ne: "PDF मा हटाइएको ठाउँ अब खाली नछोडी चिन्ह लगाइन्छ, जसले केही हटाइएको छ भन्ने थाहा हुन्छ। सवारी चालक अनुमतिपत्रका नम्बरलाई अब फोन नम्बर ठानेर हटाइँदैन।",
    },
    href: "https://github.com/Jawafdehi/likhit",
  },
  {
    id: "appeal-results-on-cards",
    date: "2026-10-26",
    tags: ["archive"],
    title: {
      en: "Supreme Court appeal results on case cards",
      ne: "मुद्दाका कार्डमा सर्वोच्च अदालतको पुनरावेदन फैसला",
    },
    body: {
      en: "When a case has gone to appeal, each defendant's card now shows what the Supreme Court decided.",
      ne: "मुद्दा पुनरावेदनमा गएको छ भने, अब हरेक प्रतिवादीको कार्डमा सर्वोच्च अदालतले के फैसला गर्‍यो भन्ने देखिन्छ।",
    },
    href: "/search?type=case",
  },
  {
    id: "ai-sections-labelled",
    date: "2026-10-26",
    tags: ["archive"],
    title: {
      en: "AI-written sections are labelled",
      ne: "एआईले लेखेका खण्डमा लेबल",
    },
    body: {
      en: "Where AI drafted a case's overview, allegations or timeline and our team has not yet reviewed it, that section now says so.",
      ne: "मुद्दाको सारांश, आरोप वा घटनाक्रम एआईले तयार गरेको र हाम्रो टोलीले अझै नजाँचेको भए, अब त्यो खण्डमा त्यसै लेखिएको हुन्छ।",
    },
  },
  {
    id: "search-by-district",
    date: "2026-10-26",
    tags: ["archive"],
    title: {
      en: "Search by district and province",
      ne: "जिल्ला र प्रदेशअनुसार खोज्नुहोस्",
    },
    body: {
      en: "Case and entity search can now be narrowed to a district or a province.",
      ne: "मुद्दा र व्यक्ति/निकायको खोजलाई अब जिल्ला वा प्रदेशअनुसार साँघुरो बनाउन सकिन्छ।",
    },
    href: "/search?type=case",
  },
  {
    id: "auditor-general-shelves",
    date: "2026-10-19",
    tags: ["archive"],
    title: {
      en: "Auditor General reports, sorted by kind",
      ne: "महालेखा परीक्षकका प्रतिवेदन, प्रकारअनुसार",
    },
    body: {
      en: "The Auditor General's documents are now five shelves, one per kind of document, and a document's contents open in a tab you expand.",
      ne: "महालेखा परीक्षकका कागजात अब कागजातको प्रकारअनुसार पाँच दराजमा छन्, र कागजातको विषयसूची खोल्न मिल्ने ट्याबमा देखिन्छ।",
    },
    href: "/materials",
  },
  {
    id: "likhit-0-2-0",
    date: "2026-10-18",
    tags: ["likhit"],
    title: {
      en: "Likhit 0.2.0 redacts PDFs",
      ne: "लिखित ०.२.० ले PDF बाट व्यक्तिगत विवरण हटाउँछ",
    },
    body: {
      en: "Likhit, our open-source reader for Nepali government documents, can now turn a PDF into a properly redacted one: personal details are removed from the text and the file, not just covered over. Converting a document now redacts by default.",
      ne: "नेपाली सरकारी कागजात पढ्ने हाम्रो खुला स्रोत टुल लिखितले अब PDF लाई साँच्चै सम्पादित PDF मा बदल्छ: व्यक्तिगत विवरण छोपिने मात्र होइन, पाठ र फाइलबाटै हटाइन्छ। कागजात रूपान्तरण गर्दा अब पूर्वनिर्धारित रूपमा विवरण हटाइन्छ।",
    },
    href: "https://pypi.org/project/likhit/",
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
      en: "Likhit can now audit a transcript for damage, such as broken Devanagari, and find and redact personal data like citizenship and phone numbers.",
      ne: "लिखितले अब प्रतिलिपिमा बिग्रिएको देवनागरीजस्ता त्रुटि जाँच्न, र नागरिकता तथा फोन नम्बरजस्ता व्यक्तिगत विवरण पत्ता लगाएर हटाउन सक्छ।",
    },
    href: "https://github.com/Jawafdehi/likhit",
  },
  {
    id: "mcp-new-address",
    date: "2026-08-11",
    tags: ["mcp", "api"],
    title: {
      en: "The MCP has a new address",
      ne: "MCP को नयाँ ठेगाना",
    },
    body: {
      en: "The MCP server now lives at api.jawafdehi.org/mcp, inside the archive's own API. The old addresses keep working.",
      ne: "MCP सर्भर अब अभिलेखकै API भित्र api.jawafdehi.org/mcp मा छ। पुराना ठेगाना पनि चलिरहन्छन्।",
    },
    href: "/mcp",
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
