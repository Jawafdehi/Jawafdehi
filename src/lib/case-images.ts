// Shared rules for picking the image that represents a case.
//
// Cases carry an optional `thumbnail_url` and `banner_url`. Either can be
// missing, and either can point at something that is not a public image (an
// article page, or an /admin/ upload path that only authenticated staff can
// fetch). Every surface that renders a case image therefore needs the same two
// things: a guard for unusable URLs, and a placeholder to land on when nothing
// usable is left. Keeping them here stops the case detail banner and the case
// card from drifting apart.

// The scales illustration in public/assets. 1476x936 — 328x208, the widest card
// slot it lands in, at DPR 4.5 — so object-cover never has to upscale it. It used
// to ship at 1920x1080 as an 87 KB PNG; regenerate with
// scripts/images/build-optimized.py, which keeps the source at
// scripts/images/sources/placeholder.png.
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
