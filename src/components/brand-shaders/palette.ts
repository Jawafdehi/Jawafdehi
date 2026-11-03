// The brand shaders' palette, shared by the WebGL shaders and their CSS
// textures. Brand colours come from the CSS tokens in index.css and are never
// written here as hex (tests/brand/tokens.test.ts enforces it); the hexes below
// are shader-only tints with no token of their own.
//
// Kept apart from shader-backdrop-impl.tsx so importing a type or a colour
// never pulls the lazily loaded shader library into the main bundle.

export type ShaderDesign = "diamond" | "grain";

/** Tints with no CSS token. */
export const SHADER_TINTS = {
  /** The diamond lattice. */
  lattice: "#3B5A8C",
  /** The blue band in the grain gradient. */
  steel: "#24406F",
  /** The grain's red: a muted, darkened crimson, so the pattern leads and the
   * colour stays in the background. */
  ember: "#6B1F2A",
} as const;
