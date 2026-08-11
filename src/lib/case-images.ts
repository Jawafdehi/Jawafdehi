// Shared rules for picking the image that represents a case.
//
// Cases carry an optional `thumbnail_url` and `banner_url`. Either can be
// missing, and either can point at something that is not a public image (an
// article page, or an /admin/ upload path that only authenticated staff can
// fetch). Every surface that renders a case image therefore needs the same two
// things: a guard for unusable URLs, and a placeholder to land on when nothing
// usable is left. Keeping them here stops the case detail banner and the case
// card from drifting apart.

// The scales illustration in public/assets. 1920x1080, so it survives being
// object-cover'd into a wide card slot.
export const CASE_PLACEHOLDER_IMAGE = "/assets/placeholder.png";

// placeholder.png is 98% #F5F5F5, so on a dark background it renders as a white
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
 */
export function caseImageCandidates(...urls: Array<string | null | undefined>): string[] {
  const usable = urls
    .map((url) => url?.trim())
    .filter((url): url is string => isValidCaseImage(url));

  return [...usable, CASE_PLACEHOLDER_IMAGE];
}
