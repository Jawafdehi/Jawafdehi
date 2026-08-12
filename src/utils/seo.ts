export const SITE_URL = "https://jawafdehi.org";

// The organisation's name, settled 2026-08-11: **Jawafdehi Initiative**, on
// every surface. It was spelled six different ways — "Jawafdehi Nepal" here,
// "Jawafdehi Initiative" on YouTube/LinkedIn/TikTok/Linktree, "Jawafdehi |
// जवाफदेही" on X, "Jawafdehi.org" on Discord, bare "Jawafdehi" in our own
// <title> tags, and "जवाफदेही नेपाल" in the Nepali footer.
//
// "Jawafdehi Initiative" is also the registered English name (singular, never
// "Initiatives") per board consensus 2026-07-01, so this aligns the site with
// the legal name and with the four platforms that already used it.
export const SITE_NAME = "Jawafdehi Initiative";

// The Nepali name, standardised by the same board consensus: दीर्घ ही (not
// जवाफदेहि), श (not सि), भ (not व). Used where a field has room for an alternate
// name — JSON-LD alternateName, the Nepali footer — rather than appended to
// SITE_NAME, which would double the length of every <title>.
//
// Careful with any search-and-replace near this string. "जवाफदेही नेपाल" appears
// inside ordinary Nepali prose in ne.json ("जवाफदेही नेपालीहरूद्वारा निर्मित" —
// built by Nepalis; "जवाफदेही नेपाल र विश्वभर" — in Nepal and worldwide) where it
// is not the organisation's name at all. Same trap as जवाफदेहिता, the ordinary
// noun for accountability, which must never be "corrected" to जवाफदेही.
export const SITE_NAME_NEPALI = "जवाफदेही इनिशिएटिभ";
// The canonical descriptor, from the same doc. 140 chars — the "Long" cut, which
// every field on this site can hold. Do not paraphrase it: the branding audit
// found five paraphrases live simultaneously, two of them in this repo.
export const SITE_DESCRIPTION =
  "Nepal's Permanent Corruption Case Archive. We arrange corruption-related evidence and facts into a structured format of who, what, and when.";
export const SOCIAL_IMAGE_URL = `${SITE_URL}/assets/social-preview.png`;

// Language signals. This site is Nepali-first: index.html declares
// <html lang="ne">, and the prerendered HTML that crawlers and social scrapers
// fetch is the Nepali copy. Nine pages nonetheless declared og:locale as
// en_US, so every scraper was told the opposite of what the markup said.
//
// og:locale holds exactly one value. Additional languages belong in
// og:locale:alternate, which may repeat — never emit two og:locale tags.
export const OG_LOCALE_NEPALI = "ne_NP";
export const OG_LOCALE_ENGLISH = "en_US";

// The og:locale / og:locale:alternate pair for a page.
//
// Pass the reader's active language on pages that translate their own copy, so
// a share from an English session describes itself as English. Call it with no
// argument on pages whose copy does not switch: they get the Nepali-first
// default, which is what a crawler sees regardless of any client-side toggle.
export function ogLocale(language?: string): { locale: string; alternate: string } {
  const isEnglish = language !== undefined && !language.startsWith("ne");
  return isEnglish
    ? { locale: OG_LOCALE_ENGLISH, alternate: OG_LOCALE_NEPALI }
    : { locale: OG_LOCALE_NEPALI, alternate: OG_LOCALE_ENGLISH };
}

export function absoluteUrl(value: string | null | undefined, base = SITE_URL): string | null {
  if (!value) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

export function previewImageUrl(value: string | null | undefined, base = SITE_URL): string | null {
  const url = absoluteUrl(value, base);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const isAdminUrl = pathname.includes("/admin/");
    const imageExtensionPattern = /\.(avif|gif|jpe?g|png|webp)$/i;
    const isImagePath = imageExtensionPattern.test(pathname);
    const hasImageQueryValue = [...parsed.searchParams.values()].some((paramValue) =>
      imageExtensionPattern.test(paramValue.split("?")[0].toLowerCase()),
    );

    return !isAdminUrl && (isImagePath || hasImageQueryValue) ? url : null;
  } catch {
    return null;
  }
}

export function truncateMeta(value: string | null | undefined, maxLength = 160): string {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

export function stripHtml(value: string | null | undefined): string {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// The social card's intrinsic size. Emitted as og:image:width/height so scrapers
// can lay out the card before they have fetched the bytes. Only ever attached to
// an image we actually know the dimensions of — see buildHeadTags.
export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

// One head tag, as data. The share metadata for a page used to be written out
// three times — once per page as JSX, once in worker.ts as an HTML string, and
// once as placeholders in index.html — so a tag added to one copy silently
// missed the others. (og:locale was fixed across 20 pages in #300 while the
// worker, the copy that social scrapers actually fetch for /case/* and
// /updates/*, kept saying en_US.) Describing the tags as data instead lets both
// renderers share one list: <Seo> renders them as react-helmet children, the
// worker renders them as escaped HTML.
export type HeadTag =
  | { kind: "title"; content: string }
  | { kind: "meta"; attr: "name" | "property"; key: string; content: string }
  | { kind: "link"; rel: string; href: string; type?: string; title?: string };

export interface HeadTagInput {
  title: string;
  description: string;
  canonicalUrl: string;
  /** Absolute URL. Defaults to the site social card. */
  imageUrl?: string;
  imageAlt?: string;
  /** Set only for an image whose size is known; omitted otherwise. */
  imageWidth?: number;
  imageHeight?: number;
  type?: "website" | "article" | "profile";
  /**
   * The reader's active language, for the og:locale pair. Pass i18n.language on
   * pages that translate their own copy; omit it on pages whose copy does not
   * switch, which get the Nepali-first default. See ogLocale.
   */
  language?: string;
  /** Open Graph / Twitter description, when it differs from the meta one. */
  socialDescription?: string;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  tags?: string[];
  /** e.g. "noindex, nofollow" — keeps unlisted records out of search. */
  robots?: string | null;
}

// Build the ordered head tags for a page. The order matches what the pages and
// the worker emitted before this became shared, so the rendered head is
// unchanged apart from the drift this collapses.
export function buildHeadTags(input: HeadTagInput): HeadTag[] {
  const imageUrl = input.imageUrl ?? SOCIAL_IMAGE_URL;
  const social = input.socialDescription ?? input.description;
  const locales = ogLocale(input.language);

  // Dimensions describe the bytes, so they may only be emitted for an image
  // whose size we know: the site social card, or a caller that measured it.
  // Case banners and CMS images reach here at arbitrary sizes — claiming
  // 1200x630 for those would hand scrapers a wrong aspect ratio.
  const isSocialCard = imageUrl === SOCIAL_IMAGE_URL;
  const width = input.imageWidth ?? (isSocialCard ? SOCIAL_IMAGE_WIDTH : undefined);
  const height = input.imageHeight ?? (isSocialCard ? SOCIAL_IMAGE_HEIGHT : undefined);

  const tags: HeadTag[] = [
    { kind: "title", content: input.title },
    { kind: "meta", attr: "name", key: "description", content: input.description },
  ];

  if (input.robots) {
    tags.push({ kind: "meta", attr: "name", key: "robots", content: input.robots });
  }

  tags.push(
    { kind: "link", rel: "canonical", href: input.canonicalUrl },
    { kind: "meta", attr: "property", key: "og:site_name", content: SITE_NAME },
    { kind: "meta", attr: "property", key: "og:type", content: input.type ?? "website" },
    { kind: "meta", attr: "property", key: "og:url", content: input.canonicalUrl },
    { kind: "meta", attr: "property", key: "og:title", content: input.title },
    { kind: "meta", attr: "property", key: "og:description", content: social },
    { kind: "meta", attr: "property", key: "og:image", content: imageUrl },
  );

  if (input.imageAlt) {
    tags.push({ kind: "meta", attr: "property", key: "og:image:alt", content: input.imageAlt });
  }
  if (width !== undefined && height !== undefined) {
    tags.push(
      { kind: "meta", attr: "property", key: "og:image:width", content: String(width) },
      { kind: "meta", attr: "property", key: "og:image:height", content: String(height) },
    );
  }

  tags.push(
    { kind: "meta", attr: "property", key: "og:locale", content: locales.locale },
    { kind: "meta", attr: "property", key: "og:locale:alternate", content: locales.alternate },
  );

  if (input.publishedTime) {
    tags.push({
      kind: "meta",
      attr: "property",
      key: "article:published_time",
      content: input.publishedTime,
    });
  }
  if (input.modifiedTime) {
    tags.push({
      kind: "meta",
      attr: "property",
      key: "article:modified_time",
      content: input.modifiedTime,
    });
  }
  for (const tag of input.tags ?? []) {
    tags.push({ kind: "meta", attr: "property", key: "article:tag", content: tag });
  }

  // twitter:site is site-wide and lives in index.html, so it is deliberately
  // absent here — emitting it per page would duplicate it in the pre-rendered
  // head. The worker preserves the static one instead of stripping it.
  tags.push(
    { kind: "meta", attr: "name", key: "twitter:card", content: "summary_large_image" },
    { kind: "meta", attr: "name", key: "twitter:title", content: input.title },
    { kind: "meta", attr: "name", key: "twitter:description", content: social },
    { kind: "meta", attr: "name", key: "twitter:image", content: imageUrl },
  );
  if (input.imageAlt) {
    tags.push({ kind: "meta", attr: "name", key: "twitter:image:alt", content: input.imageAlt });
  }

  return tags;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Render head tags as an HTML fragment, for the Worker injecting share metadata
// into the SPA shell. Every value is escaped, which the head-stripping regexes
// in worker.ts rely on to keep `[^>]*` from overrunning an attribute.
export function renderHeadTagsToHtml(tags: HeadTag[]): string {
  return tags
    .map((tag) => {
      if (tag.kind === "title") {
        return `<title>${escapeHtml(tag.content)}</title>`;
      }
      if (tag.kind === "meta") {
        return `<meta ${tag.attr}="${escapeHtml(tag.key)}" content="${escapeHtml(tag.content)}" />`;
      }
      const type = tag.type ? ` type="${escapeHtml(tag.type)}"` : "";
      const title = tag.title ? ` title="${escapeHtml(tag.title)}"` : "";
      return `<link rel="${escapeHtml(tag.rel)}"${type} href="${escapeHtml(tag.href)}"${title} />`;
    })
    .join("\n");
}
