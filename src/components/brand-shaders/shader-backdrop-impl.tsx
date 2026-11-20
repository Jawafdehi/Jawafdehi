// The WebGL shaders behind the dark heroes. Lazy-loaded through
// shader-backdrop.tsx so @paper-design/shaders-react stays out of the initial
// bundle.
//
//   diamond — the archive (home): a 2×2 Bayer dither over a warp field, like a
//             register's grid. Cheap to run, so it suits the busiest page.
//   lines   — likhit: a wave dither whose bands read like lines of text on a
//             page. Same cost as diamond.
//   grain   — the MCP product page: a grainy navy glow with a muted ember red.
//             Heavier, so its resolution is capped and weak devices get a CSS
//             texture instead (see shader-backdrop.tsx).
//   silk    — the MCP page's light cards: the mist colours as warped streaks.
//   mist    — light cards: a slow white mesh with a crimson blush and a pale
//             blue wash. Never on navy, so it is unlike the footer's diamond.
import { Dithering, GrainGradient, MeshGradient, Warp } from "@paper-design/shaders-react";

import { SHADER_TINTS, type ShaderDesign } from "@/components/brand-shaders/palette";

const FILL = { width: "100%", height: "100%" } as const;

// Grain is a full-screen noise shader, so render it at no more than 1.5× the
// CSS pixel count of the viewport it fills, whatever the device's DPR.
const GRAIN_MAX_PIXEL_RATIO = 1.5;

/** A CSS colour token in the hsl() form the shaders accept. */
function token(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const [h, s, l] = value.split(/\s+/);
  return h && s && l ? `hsl(${h}, ${s}, ${l})` : "hsl(217, 62%, 14%)";
}

export default function ShaderBackdropImpl({
  design,
  animate,
}: Readonly<{ design: ShaderDesign; animate: boolean }>) {
  const speed = (s: number) => (animate ? s : 0);
  // Both designs draw on --primary-surface: the same navy as the footer and
  // every other dark surface, so the dark sections read as one.
  const navy = token("--primary-surface");

  if (design === "lines") {
    return (
      <Dithering
        style={FILL}
        colorBack={navy}
        colorFront={SHADER_TINTS.lattice}
        shape="wave"
        type="4x4"
        size={3}
        scale={0.7}
        speed={speed(0.12)}
      />
    );
  }

  if (design === "mist") {
    const white = token("--surface");
    return (
      <MeshGradient
        style={FILL}
        colors={[white, SHADER_TINTS.blush, white, SHADER_TINTS.haze]}
        distortion={0.6}
        swirl={0.15}
        speed={speed(0.15)}
      />
    );
  }

  if (design === "silk") {
    const white = token("--surface");
    return (
      <Warp
        style={FILL}
        colors={[white, SHADER_TINTS.haze, white, SHADER_TINTS.blush]}
        proportion={0.45}
        softness={1}
        shape="stripes"
        shapeScale={0.2}
        distortion={0.2}
        swirl={0.6}
        swirlIterations={8}
        speed={speed(0.1)}
      />
    );
  }

  if (design === "diamondLight") {
    return (
      <Dithering
        style={FILL}
        colorBack={token("--background")}
        colorFront={SHADER_TINTS.latticeOnLight}
        shape="warp"
        type="2x2"
        size={4}
        rotation={45}
        scale={1.4}
        speed={speed(0.18)}
      />
    );
  }

  if (design === "diamond") {
    return (
      <Dithering
        style={FILL}
        colorBack={navy}
        colorFront={SHADER_TINTS.lattice}
        shape="warp"
        type="2x2"
        size={4}
        rotation={45}
        scale={1.4}
        speed={speed(0.18)}
      />
    );
  }

  return (
    <GrainGradient
      style={FILL}
      minPixelRatio={1}
      maxPixelCount={Math.round(window.innerWidth * window.innerHeight * GRAIN_MAX_PIXEL_RATIO ** 2)}
      colorBack={navy}
      colors={[navy, SHADER_TINTS.ember, SHADER_TINTS.steel, SHADER_TINTS.ember]}
      softness={0.7}
      intensity={0.35}
      noise={0.45}
      shape="corners"
      speed={speed(0.4)}
    />
  );
}
