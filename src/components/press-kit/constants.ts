/**
 * Press-kit asset paths and brand values.
 *
 * The files under /press-kit/ are the master pair exported from
 * `jawafdehi-meta/assets/`, not the site's own `/assets/logo.svg` lineage —
 * the two differ in proportion (4.30:1 against 4.12:1). Journalists get the
 * master pair, which is what the downloadable ZIP contains, so the page and
 * the archive never disagree.
 */

import { SITE_NAME, SITE_NAME_NEPALI } from "@/utils/seo";

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
 * The palette as published to journalists.
 *
 * This is the one place in the app where a brand hex is *content* rather than a
 * theme value — a newsroom needs the literal string to set type in it, and a
 * `hsl(var(--primary))` token tells them nothing. `tests/brand/tokens.test.ts`
 * therefore exempts this file from its no-hardcoded-hex scan and asserts
 * instead that these values equal the hex documented in `src/index.css`, so the
 * page cannot drift from the theme it describes.
 *
 * Do NOT compute these from the CSS custom properties at runtime: the tokens
 * hold HSL, and `hex -> HSL -> hex` is lossy — #0E1F3B round-trips to #0E1F3A,
 * which is exactly the drift that put a wrong navy into two files before.
 *
 * `swatch` is what the page paints, and it reads the live token, so the colour
 * shown is always the colour the site actually renders.
 */
export const PRESS_KIT_COLOURS = [
  { key: "navy", hex: "#0E1F3B", swatch: "hsl(var(--primary))" },
  { key: "crimson", hex: "#B5242C", swatch: "hsl(var(--accent))" },
  { key: "crimsonDark", hex: "#F04C54", swatch: "hsl(var(--accent-on-dark))" },
  { key: "background", hex: "#FAFAF7", swatch: "hsl(var(--background))" },
  { key: "foreground", hex: "#1F2937", swatch: "hsl(var(--foreground))" },
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

/**
 * The registered name, in both scripts. Both come from utils/seo rather than
 * being restated here — the Nepali spelling is board-standardised and carried
 * by the amended certificate of incorporation (दीर्घ ही, श not स, भ not व), and
 * a second copy is a second thing to get wrong.
 */
export const PRESS_KIT_NAMES = {
  latin: SITE_NAME,
  devanagari: SITE_NAME_NEPALI,
} as const;
