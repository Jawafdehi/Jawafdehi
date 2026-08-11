export const SITE_URL = "https://jawafdehi.org";
// TODO: the org name is spelled five different ways across our own accounts —
// "Jawafdehi Nepal" here, "Jawafdehi Initiative" on YouTube/LinkedIn/TikTok/
// Linktree, "Jawafdehi | जवाफदेही" on X, "Jawafdehi.org" on Discord, and bare
// "Jawafdehi" in our own <title> tags. That decision is still open (meta repo,
// docs/branding/narrative.md §1). Centralised here so settling it is one edit.
export const SITE_NAME = "Jawafdehi Nepal";
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
