/**
 * The case page's "Evidence & Sources" list, as data: which group each source
 * belongs to, its date, where it came from (outlet, platform or court), and
 * which readable copies it has or is still waiting for.
 *
 * Kept free of React so the rules can be tested on their own; the section and
 * the row only render what this module decides.
 */

import { COURT_NAMES } from "@/data/court-names";
import { formatCourtName } from "@/utils/court-case-format";
import { NEPALI_MONTHS, adStringToBSString, toNepaliNumerals } from "@/utils/bs-calendar";
import { extractUrls } from "@/lib/linkify";
import { withholdUnredacted } from "@/lib/material-links";
import type { EvidenceEntry, EvidenceMaterial, SourceLink } from "@/types/jds";

// ─── groups ────────────────────────────────────────────────────────────────

export type EvidenceGroup = "court" | "charge" | "document" | "news" | "social" | "law";

/** Display order of the groups: what a reader looks for first comes first. */
export const EVIDENCE_GROUPS: readonly EvidenceGroup[] = [
  "court",
  "charge",
  "document",
  "news",
  "social",
  "law",
];

// Material source tokens (the `<source>` in /material/<source>/<ident>, and the
// embed's `material_type`), by group. Anything not listed is a document.
const GROUP_BY_TYPE: Record<string, EvidenceGroup> = {
  court_order: "court",
  special_court_order: "court",
  court_filing: "court",
  supreme_court: "court",
  nkp: "court",
  kanun_patrika: "court",
  us_court: "court",
  ag: "charge",
  charge_sheet: "charge",
  press_release: "charge",
  ciaa_press_release: "charge",
  news: "news",
  news_setopati: "news",
  news_shilaptra: "news",
  ratopati: "news",
  occrp: "news",
  social_media: "social",
  legal_corpus: "law",
  rajpatra: "law",
  legal_template: "law",
};

export function evidenceGroup(
  materialType: string | null | undefined,
  sourceType?: string | null,
): EvidenceGroup {
  // The archive's own classification wins where it is more specific than the
  // bucket the file was uploaded into (a bail ruling filed under "document").
  const st = sourceType?.toUpperCase() ?? "";
  if (st.startsWith("COURT_") || st === "LEGAL_COURT_ORDER") return "court";
  return GROUP_BY_TYPE[materialType?.toLowerCase() ?? ""] ?? "document";
}

// ─── dates ─────────────────────────────────────────────────────────────────

/** A Bikram Sambat date, possibly partial (month/day 0 = unknown). */
export interface BsDate {
  year: number;
  month: number;
  day: number;
  approximate: boolean;
}

const EN_MONTHS = [
  "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Asoj",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
] as const;

// Romanised month spellings that appear in titles, mapped to 1-12.
const MONTH_ALIASES: Record<string, number> = {
  baisakh: 1, baishakh: 1, vaisakh: 1,
  jestha: 2, jeth: 2,
  asar: 3, ashadh: 3, asadh: 3,
  shrawan: 4, saun: 4, srawan: 4,
  bhadra: 5, bhadau: 5,
  asoj: 6, ashwin: 6, aswin: 6,
  kartik: 7, kattik: 7,
  mangsir: 8, mansir: 8,
  poush: 9, push: 9, paush: 9, pous: 9,
  magh: 10,
  falgun: 11, phalgun: 11,
  chaitra: 12, chait: 12,
};
// The Devanagari spellings: the site's own (bs-calendar) plus common variants.
const NE_MONTH_ALIASES: Record<string, number> = {
  ...Object.fromEntries(NEPALI_MONTHS.map((m, i) => [m, i + 1])),
  वैशाख: 1, जेठ: 2, असार: 3, साउन: 4, भदौ: 5, असोज: 6, कात्तिक: 7,
  पुस: 9, फागुन: 11, चैत: 12,
};

const DEVANAGARI_DIGITS = "०१२३४५६७८९";
const asciiDigits = (s: string) =>
  s.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));

// BS years on case material run 2040-2100; anything earlier is an AD year.
const isBsYear = (y: number) => y >= 2040 && y <= 2100;

/** Parse "2081-08-11", "२०८२-०९-३०", "2081 Mangsir 11", "२०७८ वैशाख ५", "circa 2079". */
export function parseBsDate(value: string | null | undefined): BsDate | null {
  if (!value) return null;
  const s = asciiDigits(value);

  let m = /(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(s);
  if (m && isBsYear(+m[1]) && +m[2] >= 1 && +m[2] <= 12) {
    return { year: +m[1], month: +m[2], day: m[3] ? +m[3] : 0, approximate: false };
  }
  m = /(\d{4})\s+([A-Za-z]+)\.?(?:\s+(\d{1,2}))?\b/.exec(s);
  if (m && isBsYear(+m[1]) && MONTH_ALIASES[m[2].toLowerCase()]) {
    return { year: +m[1], month: MONTH_ALIASES[m[2].toLowerCase()], day: m[3] ? +m[3] : 0, approximate: false };
  }
  m = /(\d{4})\s*([\u0900-\u097F]+)(?:\s+(\d{1,2}))?/.exec(s);
  if (m && isBsYear(+m[1]) && NE_MONTH_ALIASES[m[2]]) {
    return { year: +m[1], month: NE_MONTH_ALIASES[m[2]], day: m[3] ? +m[3] : 0, approximate: false };
  }
  m = /(?:circa|c\.|ca\.)\s*(\d{4})/i.exec(s);
  if (m && isBsYear(+m[1])) return { year: +m[1], month: 0, day: 0, approximate: true };
  return null;
}

// A trailing "(…date…)" on a title, e.g. "(2080 Poush 9)", "(n.d., circa 2078 B.S.)".
const TRAILING_DATE_RE = /\s*\(([^()]*)\)\s*$/;

/**
 * Split a title into its text and a trailing BS date in parentheses, which is
 * how caseworkers have been dating sources. Titles with no such date are
 * returned unchanged.
 */
export function splitTitleDate(title: string): { title: string; date: BsDate | null } {
  const m = TRAILING_DATE_RE.exec(title);
  if (!m) return { title, date: null };
  const date = parseBsDate(m[1]);
  if (!date) return { title, date: null };
  return { title: title.slice(0, m.index).trim(), date };
}

export function formatBsDate(date: BsDate, language: string): string {
  const ne = language.startsWith("ne");
  const num = (n: number) => (ne ? toNepaliNumerals(n) : String(n));
  const parts = [num(date.year)];
  if (date.month) parts.push(ne ? NEPALI_MONTHS[date.month - 1] : EN_MONTHS[date.month - 1]);
  if (date.month && date.day) parts.push(num(date.day));
  const text = parts.join(" ");
  if (!date.approximate) return text;
  return ne ? `करिब ${text}` : `c. ${text}`;
}

/** Sort key: undated sources go last. */
export const dateSortKey = (d: BsDate | null) =>
  d ? d.year * 10000 + d.month * 100 + d.day : Number.MAX_SAFE_INTEGER;

// ─── origin (outlet, platform, court) ──────────────────────────────────────

export type OriginKind = "outlet" | "platform" | "court" | "police" | "web";

export interface EvidenceOrigin {
  kind: OriginKind;
  /** English label, or the label to show in every language when `labelNe` is absent. */
  label: string;
  labelNe?: string;
  /** /source-logos/<host>.png when we ship that outlet's or platform's icon. */
  logo?: string;
  /** The original publication, when we have its URL. */
  href?: string;
  /** Who posted it on a platform ("Tanka Dahal" on YouTube). */
  account?: string;
}

interface KnownSource {
  label: string;
  labelNe: string;
  kind: "outlet" | "platform";
  logo?: string;
}

// Outlets and platforms that show up as case sources, by host (sans www./m.).
// Logos are the sites' own small icons, shipped from /public so a case page
// makes no third-party request.
const KNOWN_SOURCES: Record<string, KnownSource> = {
  "ekantipur.com": { label: "Kantipur", labelNe: "कान्तिपुर", kind: "outlet", logo: "ekantipur.com" },
  "kantipurdaily.com": { label: "Kantipur", labelNe: "कान्तिपुर", kind: "outlet", logo: "ekantipur.com" },
  "kathmandupost.com": { label: "The Kathmandu Post", labelNe: "द काठमाडौं पोस्ट", kind: "outlet", logo: "kathmandupost.com" },
  "setopati.com": { label: "Setopati", labelNe: "सेतोपाटी", kind: "outlet", logo: "setopati.com" },
  "en.setopati.com": { label: "Setopati", labelNe: "सेतोपाटी", kind: "outlet", logo: "setopati.com" },
  "onlinekhabar.com": { label: "Onlinekhabar", labelNe: "अनलाइनखबर", kind: "outlet", logo: "onlinekhabar.com" },
  "english.onlinekhabar.com": { label: "Onlinekhabar", labelNe: "अनलाइनखबर", kind: "outlet", logo: "onlinekhabar.com" },
  "ratopati.com": { label: "Ratopati", labelNe: "रातोपाटी", kind: "outlet", logo: "ratopati.com" },
  "x.com": { label: "X", labelNe: "X (ट्विटर)", kind: "platform", logo: "x.com" },
  "twitter.com": { label: "X", labelNe: "X (ट्विटर)", kind: "platform", logo: "x.com" },
  "facebook.com": { label: "Facebook", labelNe: "फेसबुक", kind: "platform", logo: "facebook.com" },
  "fb.watch": { label: "Facebook", labelNe: "फेसबुक", kind: "platform", logo: "facebook.com" },
  "youtube.com": { label: "YouTube", labelNe: "युट्युब", kind: "platform", logo: "youtube.com" },
  "youtu.be": { label: "YouTube", labelNe: "युट्युब", kind: "platform", logo: "youtube.com" },
  "tiktok.com": { label: "TikTok", labelNe: "टिकटक", kind: "platform", logo: "tiktok.com" },
  "instagram.com": { label: "Instagram", labelNe: "इन्स्टाग्राम", kind: "platform", logo: "instagram.com" },
};

// The same sources named in free text ("Source: Kantipur News", "… Twitter").
const NAME_HINTS: Array<[RegExp, string]> = [
  [/\bkantipur\b/i, "ekantipur.com"],
  [/\bkathmandu post\b/i, "kathmandupost.com"],
  [/\bsetopati\b/i, "setopati.com"],
  [/\bonline ?khabar\b/i, "onlinekhabar.com"],
  [/\bratopati\b/i, "ratopati.com"],
  [/\b(twitter|x\.com)\b/i, "x.com"],
  [/\bfacebook\b/i, "facebook.com"],
  [/\byoutube\b/i, "youtube.com"],
  [/\btiktok\b/i, "tiktok.com"],
  [/\binstagram\b/i, "instagram.com"],
];

const OWN_HOST_RE = /(^|\.)jawafdehi\.org$/i;

const hostOf = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^(www|m)\./, "");
  } catch {
    return null;
  }
};

const fromKnown = (host: string, href?: string): EvidenceOrigin => {
  const k = KNOWN_SOURCES[host];
  return {
    kind: k.kind,
    label: k.label,
    labelNe: k.labelNe,
    logo: k.logo ? `/source-logos/${k.logo}.png` : undefined,
    href,
  };
};

/** The court a material belongs to, as a court identifier ("supreme", "patanhc"). */
export function courtOf(materialIri: string, title: string, court?: string | null): string | null {
  if (court) return court;
  // court_order/special.076-cr-0438 → "special"
  const ident = /\/material\/[^/]+\/([a-z]+)\.[^/]+$/i.exec(materialIri)?.[1]?.toLowerCase();
  if (ident && (ident === "special" || ident === "supreme" || /(hc|dc)$/.test(ident))) return ident;
  // Hand-uploaded orders carry the court only in their title.
  const t = title.toLowerCase();
  if (/\bsupreme court\b|सर्वोच्च अदालत/.test(t)) return "supreme";
  if (/\bspecial court\b|विशेष अदालत/.test(t)) return "special";
  const m = /\b([a-z]+)\s+(high court|hc|district court|dc)\b/.exec(t);
  if (m) return `${m[1]}${m[2] === "high court" || m[2] === "hc" ? "hc" : "dc"}`;
  return null;
}

// ─── police ────────────────────────────────────────────────────────────────

// District names, English → Nepali, from the district courts' official names
// ("District Court Kathmandu" / "जिल्ला अदालत काठमाडौं").
const DISTRICTS_NE: Record<string, string> = Object.fromEntries(
  Object.values(COURT_NAMES)
    .map((c) => [/^District Court (.+)$/.exec(c.en)?.[1], /^जिल्ला अदालत (.+)$/.exec(c.ne)?.[1]])
    .filter((pair): pair is [string, string] => Boolean(pair[0] && pair[1]))
    .map(([en, ne]) => [en.toLowerCase(), ne]),
);

const POLICE_RE =
  /\bpolice\b|प्रहरी|\bCIB\b|central investigation bureau|केन्द्रीय अनुसन्धान ब्यूरो|arrest warrant|पक्राउ पुर्जी/i;

/**
 * The police office behind a document: arrest warrants, custody letters,
 * police and CIB press releases, district police letters. Read from the
 * archive's source bucket, then the description and title. Null when nothing
 * points at the police.
 */
export function policeOffice(
  materialType: string | null | undefined,
  title: string,
  description?: string | null,
): { label: string; labelNe: string } | null {
  const text = `${title}\n${description ?? ""}`;
  if (materialType?.toLowerCase() !== "nepal_police" && !POLICE_RE.test(text)) return null;

  if (/\bCIB\b|central investigation bureau|केन्द्रीय अनुसन्धान ब्यूरो/i.test(text)) {
    return { label: "Central Investigation Bureau", labelNe: "केन्द्रीय अनुसन्धान ब्यूरो" };
  }
  // The office's own Nepali name, when the document quotes it.
  const ne = /जिल्ला प्रहरी (?:कार्यालय|परिसर),?\s*([\u0900-\u097F]+)/.exec(text);
  if (ne) {
    const kind = ne[0].includes("परिसर") ? "परिसर" : "कार्यालय";
    return { label: `District Police ${kind === "परिसर" ? "Range" : "Office"}`, labelNe: `जिल्ला प्रहरी ${kind}, ${ne[1]}` };
  }
  // "District Police Kathmandu", "District Police, Rupandehi", "District Police Office Jhapa",
  // or failing that a warrant "in Kathmandu".
  const district =
    /district police(?: office| range)?,?\s+([A-Z][a-z]+)/i.exec(text)?.[1] ??
    (/arrest warrant/i.test(text) ? /\bin\s+([A-Z][a-z]+)/.exec(title)?.[1] : undefined);
  const districtNe = district ? DISTRICTS_NE[district.toLowerCase()] : undefined;
  if (district && districtNe) {
    return { label: `District Police Office, ${district}`, labelNe: `जिल्ला प्रहरी कार्यालय, ${districtNe}` };
  }
  return { label: "Nepal Police", labelNe: "नेपाल प्रहरी" };
}

/**
 * Where a source came from: a court for court records, else the outlet or
 * platform named by its source-page URL, a URL in its description, or the
 * "Source: …" text. Null when nothing names one.
 */
export function evidenceOrigin(args: {
  group: EvidenceGroup;
  materialIri: string;
  title: string;
  links: SourceLink[];
  description?: string | null;
  court?: string | null;
  materialType?: string | null;
}): EvidenceOrigin | null {
  const { group, materialIri, title, links, description } = args;

  // A court the archive itself records wins; then the police (a warrant is
  // filed among court records but issued by the police); then a court named
  // only in the title.
  const recordedCourt = group === "court" ? courtOf(materialIri, "", args.court) : null;
  const titledCourt = group === "court" && !recordedCourt ? courtOf(materialIri, title) : null;
  const isWarrant = /arrest warrant|पक्राउ पुर्जी/i.test(title);
  const police =
    recordedCourt || (titledCourt && !isWarrant) ? null : policeOffice(args.materialType, title, description);
  if (police) return { kind: "police", ...police };

  if (group === "court") {
    const court = recordedCourt ?? titledCourt;
    if (court) {
      return {
        kind: "court",
        label: COURT_NAMES[court]?.en ?? formatCourtName(court, "en"),
        labelNe: COURT_NAMES[court]?.ne ?? formatCourtName(court, "ne"),
      };
    }
  }

  const sourcePage = links.find((l) => l.role === "SOURCE_PAGE")?.link;
  const urls = [
    ...(sourcePage ? [sourcePage] : []),
    ...(description ? extractUrls(description) : []),
  ].filter((u) => {
    const h = hostOf(u);
    return h && !OWN_HOST_RE.test(h);
  });

  const account = description
    ? /Source:\s*([^(\n·]+?)\s+(?:Twitter|X|Facebook|YouTube|TikTok|Instagram)\b/i.exec(description)?.[1]?.trim()
    : undefined;

  for (const url of urls) {
    const host = hostOf(url)!;
    if (KNOWN_SOURCES[host]) return { ...fromKnown(host, url), account };
  }
  if (urls[0]) return { kind: "web", label: hostOf(urls[0])!, href: urls[0] };

  const named = description ? /Source:\s*([^\n(]+)/i.exec(description)?.[1]?.trim() : undefined;
  const hay = `${named ?? ""} ${group === "news" || group === "social" ? title : ""}`;
  for (const [re, host] of NAME_HINTS) {
    if (re.test(hay)) return { ...fromKnown(host), account };
  }
  if (named) return { kind: "web", label: named };
  return null;
}

/** Description text minus what the origin chip already says. */
export function stripSourceLine(description: string, origin: EvidenceOrigin | null): string {
  if (!origin) return description;
  return description
    .replace(/^\s*Source:\s*[^\n]*(\n|$)/i, "")
    .replace(/^\s*Transcripts? (?:to|of) a post on [^\n]*$/i, "")
    .trim();
}

// ─── readable copies and their state ───────────────────────────────────────

export type ActionKind = "pdf" | "text" | "source" | "file" | "archive";

export interface EvidenceAction {
  kind: ActionKind;
  href: string;
  /** Redacted copy (private details removed). */
  redacted: boolean;
}

const extensionOf = (link: string) => {
  try {
    const last = new URL(link).pathname.split("/").pop() ?? "";
    return last.includes(".") ? (last.split(".").pop() ?? "").toLowerCase() : "";
  } catch {
    return "";
  }
};

const isArchiveUrl = (link: string) => /^https?:\/\/(web\.)?archive\.org\//i.test(link.trim());

/**
 * The buttons a source row shows, best first: the PDF, the text transcript,
 * the original page, then anything else (other formats, archive snapshots).
 * Staff-only originals are dropped before anything else happens.
 */
export function evidenceActions(material: EvidenceMaterial | null | undefined): EvidenceAction[] {
  const raw = (material?.urls ?? []).filter(
    (u): u is SourceLink => Boolean(u?.link) && /^https?:\/\//i.test(u.link.trim()),
  );
  const links = withholdUnredacted(raw, (u) => u.link, (u) => u.role as string);
  const seen = new Set<string>();
  const out: EvidenceAction[] = [];
  const push = (kind: ActionKind, l: SourceLink) => {
    const href = l.link.trim();
    if (seen.has(href)) return;
    seen.add(href);
    out.push({ kind, href, redacted: String(l.role).startsWith("REDACTED_") });
  };
  const role = (l: SourceLink) => String(l.role);
  const ext = (l: SourceLink) => extensionOf(l.link);

  const pdfs = links.filter((l) => ext(l) === "pdf" && !isArchiveUrl(l.link));
  const pdf = pdfs.find((l) => role(l) === "REDACTED_PDF") ?? pdfs[0];
  if (pdf) push("pdf", pdf);

  const texts = links.filter(
    (l) => role(l) === "REDACTED_MARKDOWN" || role(l) === "MARKDOWN" || ext(l) === "md" || ext(l) === "markdown",
  );
  const text = texts.find((l) => role(l) === "REDACTED_MARKDOWN") ?? texts[0];
  if (text) push("text", text);

  const page = links.find((l) => role(l) === "SOURCE_PAGE");
  if (page) push("source", page);

  for (const l of links) {
    if (seen.has(l.link.trim())) continue;
    if (texts.includes(l)) continue; // a second transcript copy adds nothing
    if (isArchiveUrl(l.link) || role(l) === "PERMALINK") push("archive", l);
    else if (ext(l) === "pdf") continue; // the other PDF copy of the same document
    else if (role(l) === "SOURCE_PAGE") push("source", l);
    else push("file", l);
  }
  return out;
}

export type WithheldState = "none" | "all" | "pdf";

/**
 * What the reader is told is still to come. "all": nothing readable is public
 * yet; "pdf": the transcript is out but the PDF is still being redacted.
 * Needs the API's `withheld` flags; without them a source with no links says
 * nothing rather than guessing.
 */
export function withheldState(
  material: EvidenceMaterial | null | undefined,
  actions: EvidenceAction[],
): WithheldState {
  const w = material?.withheld;
  if (!w) return "none";
  const hasPdf = actions.some((a) => a.kind === "pdf");
  const hasText = actions.some((a) => a.kind === "text");
  if (!hasPdf && !hasText && (w.pdf || w.transcript)) return "all";
  if (!hasPdf && w.pdf) return "pdf";
  return "none";
}

// ─── the whole row ─────────────────────────────────────────────────────────

export interface EvidenceRow {
  key: string;
  index: number;
  materialIri: string;
  title: string;
  date: BsDate | null;
  group: EvidenceGroup;
  origin: EvidenceOrigin | null;
  /** The material's description and the case's note, minus what is shown elsewhere. */
  details: string[];
  actions: EvidenceAction[];
  withheld: WithheldState;
}

const isPlaceholder = (s: string | null | undefined) => !s || !s.trim() || s.trim() === ".";

export function buildEvidenceRow(entry: EvidenceEntry, index: number): EvidenceRow {
  const material = entry.material ?? null;
  const rawTitle = material?.display_name?.trim() || "";
  const split = splitTitleDate(rawTitle);
  const note = isPlaceholder(entry.additional_details) ? "" : entry.additional_details.trim();
  const noteDate = note ? parseBsDate(note) : null;
  // A note that is nothing but a date is the date, not a detail.
  const noteIsDate = Boolean(noteDate) && note.length <= 20;

  const date =
    parseBsDate(material?.date) ??
    parseBsDate(adStringToBSString(material?.date_ad ?? null)) ??
    split.date ??
    (noteIsDate ? noteDate : null);

  const group = evidenceGroup(material?.material_type, material?.source_type);
  const description = isPlaceholder(material?.description) ? "" : material!.description!.trim();
  const origin = evidenceOrigin({
    group,
    materialIri: entry.material_iri,
    title: rawTitle,
    links: material?.urls ?? [],
    description: description || note,
    court: material?.court,
    materialType: material?.material_type,
  });

  const details = [stripSourceLine(description, origin), noteIsDate ? "" : stripSourceLine(note, origin)]
    .map((d) => d.replace(/\r/g, "").replace(/\s*\n+\s*/g, " · ").trim())
    .filter((d, i, all) => d && all.indexOf(d) === i);

  const actions = evidenceActions(material);
  return {
    key: entry.material_iri || String(index),
    index,
    materialIri: entry.material_iri,
    title: split.title || rawTitle,
    date,
    group,
    origin,
    details,
    actions,
    withheld: withheldState(material, actions),
  };
}

export function sortByDate(rows: EvidenceRow[]): EvidenceRow[] {
  return [...rows].sort((a, b) => dateSortKey(a.date) - dateSortKey(b.date) || a.index - b.index);
}
