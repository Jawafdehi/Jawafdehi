// A CSS echo of the grain shader: a soft ember light with film grain, used in
// place of the grain shader on weak devices (shader-backdrop.tsx).
import { SHADER_TINTS } from "@/components/brand-shaders/palette";
import { cn } from "@/lib/utils";

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.4'/%3E%3C/svg%3E\")";

const BACKGROUND = `${NOISE}, radial-gradient(70% 120% at 80% 0%, ${SHADER_TINTS.ember} 0%, ${SHADER_TINTS.steel} 50%, transparent 85%), hsl(var(--primary-surface))`;

export function GrainTexture({ className }: Readonly<{ className?: string }>) {
  return <div aria-hidden="true" className={cn("pointer-events-none", className)} style={{ background: BACKGROUND }} />;
}
