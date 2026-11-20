/**
 * The dot-dither art on light cards (likhit's "What it does", the press kit's
 * contacts): a field of dots, dense at one corner and thinning out, in crimson
 * or the archive's blue by turn. Pure CSS — a dot grid under a radial mask —
 * so a row of cards costs no WebGL. `top` lays it over the top of a tall card
 * and fades it out before the text; `right` lays it along the right of a short
 * one and fades it out towards the words on the left.
 */
const DITHER_ART = [
  { color: "hsl(var(--accent))", at: "100% 0%" },
  { color: "hsl(214 65% 52%)", at: "0% 0%" },
  { color: "hsl(var(--accent))", at: "50% 0%" },
  { color: "hsl(214 65% 52%)", at: "100% 0%" },
] as const;

export function DotDither({ index, placement = "top" }: Readonly<{ index: number; placement?: "top" | "right" }>) {
  const { color, at } = DITHER_ART[index % DITHER_ART.length];
  const bloom = placement === "right" ? "100% 0%" : at;
  // Two masks multiplied: the corner bloom, and a fade to nothing before the
  // text, so the dots never sit under a word.
  const fade = placement === "right" ? "linear-gradient(to left, #000 25%, transparent 100%)" : "linear-gradient(#000 30%, transparent 100%)";
  const mask = `radial-gradient(circle at ${bloom}, #000 0%, rgba(0,0,0,0.5) 35%, transparent 75%), ${fade}`;
  return (
    <div
      aria-hidden="true"
      className={placement === "right" ? "absolute inset-y-0 right-0 -z-10 w-1/2" : "absolute inset-x-0 top-0 -z-10 h-[55%]"}
      style={{
        backgroundImage: `radial-gradient(${color} 1.5px, transparent 2px), radial-gradient(${color} 1.5px, transparent 2px)`,
        backgroundSize: "8px 8px, 8px 8px",
        backgroundPosition: "0 0, 4px 4px",
        maskImage: mask,
        WebkitMaskImage: mask,
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    />
  );
}
