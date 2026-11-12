// The WebGL half of MegaMenuArt, lazy-loaded so @paper-design/shaders-react
// stays out of the initial bundle (the header is on every page; the menu opens
// on few visits).
import { Dithering } from "@paper-design/shaders-react";

import { SHADER_TINTS } from "@/components/brand-shaders/palette";

import type { MegaMenuArtTone, MegaMenuShape } from "@/components/nav/mega-menu-art";

const FILL = { width: "100%", height: "100%" } as const;

function token(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const [h, s, l] = value.split(/\s+/);
  return h && s && l ? `hsl(${h}, ${s}, ${l})` : "hsl(0, 0%, 100%)";
}

export default function MegaMenuArtImpl({
  shape,
  tone,
  animate,
}: Readonly<{ shape: MegaMenuShape; tone: MegaMenuArtTone; animate: boolean }>) {
  // One shader for the whole menu: changing the shape only swaps a uniform,
  // so moving between links never remounts a WebGL context.
  return (
    <Dithering
      style={FILL}
      colorBack={token("--surface")}
      colorFront={tone === "ember" ? SHADER_TINTS.emberOnLight : SHADER_TINTS.latticeOnLight}
      shape={shape}
      type="4x4"
      size={3}
      scale={0.8}
      speed={animate ? 0.25 : 0}
    />
  );
}
