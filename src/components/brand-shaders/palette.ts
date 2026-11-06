// The brand shaders' palette, shared by the WebGL shaders and their CSS
// textures. Brand colours come from the CSS tokens in index.css and are never
// written here as hex (tests/brand/tokens.test.ts enforces it); the hexes below
// are shader-only tints with no token of their own.
//
// Kept apart from shader-backdrop-impl.tsx so importing a type or a colour
// never pulls the lazily loaded shader library into the main bundle.

/** diamond: the archive (home). diamondLight: the same field inverted, light
 * blue on the white page with no navy (/whats-new). grain: the MCP. lines:
 * likhit, a wave dither that reads like ruled lines of text. */
export type ShaderDesign = "diamond" | "diamondLight" | "grain" | "lines";

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
} as const;
