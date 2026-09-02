// Shared rules for picking the image that represents a case.
//
// Cases carry an uploaded `thumbnail` / `banner` (a rendition ladder generated
// by the backend) and, on cases that predate the upload flow, a free-text
// `thumbnail_url` / `banner_url`. Either URL can be missing, and either can
// point at something that is not a public image (an article page, or an
// /admin/ upload path that only authenticated staff can fetch). Every surface
// that renders a case image therefore needs the same three things: the ladder
// when there is one, a guard for unusable URLs, and a placeholder to land on
// when nothing usable is left. Keeping them here stops the case detail banner
// and the case card from drifting apart.

// The scales illustration in public/assets. 1476x936 — 328x208, the widest card
// slot it lands in, at DPR 4.5 — so object-cover never has to upscale it. It used
// to ship at 1920x1080 as an 87 KB PNG; regenerate with
// scripts/images/build-optimized.py, which keeps the source at
// scripts/images/sources/placeholder.png.
import type { CaseImage } from "@/types/jds";

export const CASE_PLACEHOLDER_IMAGE = "/assets/placeholder.webp";

// The placeholder is 98% #F5F5F5, so on a dark background it renders as a white
// slab. invert flips its lightness and hue-rotate restores the hue, turning it
// into a dark panel with the illustration intact. Apply this ONLY to the
// placeholder — inverting a real case photograph would misrepresent it.
export const CASE_PLACEHOLDER_DARK_CLASS = "dark:invert dark:hue-rotate-180";

/**
 * True when `url` is a non-blank URL that a public reader can actually load.
 *
 * `/admin/` paths are rejected: those uploads sit behind staff auth, so they
 * resolve for a logged-in caseworker and 403 for everyone else. Treating them
 * as absent is what keeps the public page from showing a broken image.
 */
export function isValidCaseImage(url?: string | null): boolean {
  const trimmedUrl = url?.trim();

  return Boolean(trimmedUrl) && !trimmedUrl?.includes("/admin/");
}

/**
 * Usable case images in preference order, best first. Blank and non-public URLs
 * are dropped; the placeholder is always last, so the caller can walk the list
 * on load errors and still end up with something to show.
 *
 * Duplicates are collapsed, and that is load-bearing rather than tidiness. Many
 * scraped cases carry the SAME url as both thumbnail and banner. A caller that
 * advances through candidates on `error` would then "advance" from that url to
 * itself: the src attribute does not change, the browser issues no new request,
 * no second error event ever fires, and the card stays stuck on a broken image
 * instead of reaching the placeholder.
 */
export function caseImageCandidates(...urls: Array<string | null | undefined>): string[] {
  const usable: string[] = [];

  for (const url of urls) {
    const trimmedUrl = url?.trim();

    if (!trimmedUrl || !isValidCaseImage(trimmedUrl) || usable.includes(trimmedUrl)) continue;

    usable.push(trimmedUrl);
  }

  // A case whose own image IS the placeholder needs no second copy of it.
  if (usable.includes(CASE_PLACEHOLDER_IMAGE)) return usable;

  return [...usable, CASE_PLACEHOLDER_IMAGE];
}

/** Everything an `<img>` needs to render a case image responsively. */
export interface CaseImageSources {
  /** Usable image URLs, best first, placeholder last. Walk this on `error`. */
  candidates: string[];
  /**
   * The `srcset` for a candidate, or undefined when it has no ladder.
   *
   * Per-candidate rather than one value for the whole component, because only
   * the uploaded image has renditions: if a load error advances past it to a
   * legacy URL or the placeholder, the srcset must go away with it. Leaving a
   * stale srcset attached would have the browser keep fetching the tier it just
   * failed on and never reach the fallback.
   */
  srcsetFor: (url: string) => string | undefined;
  /**
   * Intrinsic dimensions of the preferred image, when known.
   *
   * Set `width`/`height` on the `<img>` from this so the browser reserves the
   * box before the bytes land. A case list without them reflows as each card's
   * image arrives, which is most of what a CLS score measures.
   */
  intrinsic: { width: number; height: number } | null;
}

/**
 * Resolve an uploaded rendition ladder plus any legacy URLs into render inputs.
 *
 * The ladder goes first when present, so an uploaded image always wins over a
 * free-text URL on the same case; the legacy URLs stay in the list behind it as
 * error fallbacks, and the placeholder is last as always.
 */
export function caseImageSources(
  image: CaseImage | null | undefined,
  ...urls: Array<string | null | undefined>
): CaseImageSources {
  const ladderSrc =
    image && isValidCaseImage(image.src) ? image.src.trim() : null;

  const candidates = caseImageCandidates(ladderSrc, ...urls);

  return {
    candidates,
    srcsetFor: (url: string) =>
      ladderSrc && url === ladderSrc ? image!.srcset : undefined,
    intrinsic:
      ladderSrc && image ? { width: image.width, height: image.height } : null,
  };
}
