/**
 * Press-kit asset paths and brand values.
 *
 * The files under /press-kit/ are the master pair exported from
 * `jawafdehi-meta/assets/`, not the site's own `/assets/logo.svg` lineage —
 * the two differ in proportion (4.30:1 against 4.12:1). Journalists get the
 * master pair, which is what the downloadable ZIP contains, so the page and
 * the archive never disagree.
 */

export const PRESS_KIT_FILES = {
  zip: "/press-kit/jawafdehi-press-kit.zip",
  pdf: "/press-kit/jawafdehi-press-kit.pdf",
  faq: "https://docs.google.com/document/d/1o7vkXuLldx5UsNEGoHxCkx2jUfhOOB5Shdu-yzG9qnY/edit",
} as const;

export const PRESS_KIT_LOGOS = {
  navyPng: "/press-kit/logo/jawafdehi-logo-navy-for-light-bg.png",
  navySvg: "/press-kit/logo/jawafdehi-logo-navy-for-light-bg.svg",
  whitePng: "/press-kit/logo/jawafdehi-logo-white-for-dark-bg.png",
  whiteSvg: "/press-kit/logo/jawafdehi-logo-white-for-dark-bg.svg",
  markPng: "/press-kit/logo/jawafdehi-mark-square.png",
  markTransparentPng: "/press-kit/logo/jawafdehi-mark-square-transparent.png",
} as const;

/**
 * Hex is canonical; the CSS tokens are derived from it, never the reverse.
 * `hex -> HSL -> hex` is lossy and the loss is silent, which is how two files
 * previously drifted from #0E1F3B to #0E1F3A.
 */
export const PRESS_KIT_COLOURS = [
  { key: "navy", hex: "#0E1F3B", token: "--primary" },
  { key: "crimson", hex: "#B5242C", token: "--accent" },
  { key: "crimsonDark", hex: "#F04C54", token: "--accent-on-dark" },
  { key: "background", hex: "#FAFAF7", token: "--background" },
  { key: "foreground", hex: "#1F2937", token: "--foreground" },
] as const;

/**
 * IBM Plex Mono is Latin-only — Devanagari set in it silently falls back to
 * Noto, which would misrepresent the face. Its sample is figures instead,
 * which is also the job it actually does.
 */
export const PRESS_KIT_TYPEFACES = [
  { key: "displayRole", name: "Vesper Libre", className: "font-display", sample: "जवाफदेही Aa" },
  { key: "bodyRole", name: "Noto Sans Devanagari", className: "font-sans", sample: "जवाफदेही Aa" },
  { key: "monoRole", name: "IBM Plex Mono", className: "font-mono", sample: "082-CR-0154" },
] as const;

export const PRESS_KIT_DESCRIPTORS = {
  nepali: "नेपालको स्थायी भ्रष्टाचार अभिलेख — को, के र कहिले।",
  long: "Nepal's Permanent Corruption Case Archive. We arrange corruption-related evidence and facts into a structured format of who, what, and when.",
  medium:
    "Nepal's Permanent Corruption Case Archive. Corruption evidence, structured into who, what, and when.",
  short: "Nepal's Permanent Corruption Case Archive — who, what, and when.",
} as const;

export const PRESS_KIT_NAMES = {
  latin: "Jawafdehi Initiative",
  /** Board-standardised 2026-07-01 and carried by the amended certificate of
   *  incorporation: दीर्घ ही, श (not स), भ (not व). Do not let a spellchecker
   *  "correct" this. */
  devanagari: "जवाफदेही इनिशिएटिभ",
} as const;
