// The brand shaders' palette, shared by the WebGL shaders and their CSS
// textures. Brand colours come from the CSS tokens in index.css and are never
// written here as hex (tests/brand/tokens.test.ts enforces it); the hexes below
// are shader-only tints with no token of their own.
//
// Kept apart from shader-backdrop-impl.tsx so importing a type or a colour
// never pulls the lazily loaded shader library into the main bundle.

/** diamond: the archive (home). diamondLight: the same field inverted, light
 * blue on the white page with no navy (/whats-new). grain: the MCP. lines:
 * likhit, a wave dither that reads like ruled lines of text. mist: a soft
 * white mesh with a blush of crimson and a wash of pale blue, for light cards
 * (likhit's OCR setups). silk: the same three colours drawn as soft warped
 * streaks rather than mist's blobs, for the MCP page's light cards. vortex: the
 * home hero's navy dither turned into a swirl, a drain the missing page went
 * down (the 404). */
export type ShaderDesign = "diamond" | "diamondLight" | "grain" | "lines" | "mist" | "silk" | "vortex";

/** Tints with no CSS token. */
export const SHADER_TINTS = {
  /** The diamond lattice. */
  lattice: "#3B5A8C",
  /** The diamond lattice on the white page (diamondLight). */
  latticeOnLight: "#B9C8E2",
  /** The blue band in the grain gradient. */
  steel: "#24406F",
  /** The grain's red: a muted, darkened crimson, so the pattern leads and the
   * colour stays in the background. */
  ember: "#6B1F2A",
  /** The ember on the white page (the header's mega-menu tile). */
  emberOnLight: "#E7B3BB",
  /** mist's blush: the crimson thinned almost to white. */
  blush: "#F8E1E5",
  /** mist's pale blue. */
  haze: "#DDE7F6",
} as const;
