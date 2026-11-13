// The picture on the right of the header's mega menu: no card, just one
// light dither field (pale blue or blush) whose shape follows the link under
// the pointer, fading into the panel, and that link's name and line over it.
// Without WebGL the words alone are the design; under reduced motion the field holds
// still.
import { lazy, Suspense, useEffect, useState } from "react";

import { webglSupported } from "@/components/home/hero-webgl-gate";
import { lazyChunk } from "@/lib/chunk-reload";

export type MegaMenuShape = "simplex" | "warp" | "dots" | "wave" | "ripple" | "swirl" | "sphere";
export type MegaMenuArtTone = "lattice" | "ember";

const MegaMenuArtImpl = lazy(lazyChunk(() => import("@/components/nav/mega-menu-art-impl"), (m) => m.default));

export function MegaMenuArt({
  shape,
  tone,
  title,
  line,
}: Readonly<{ shape: MegaMenuShape; tone: MegaMenuArtTone; title: string; line: string }>) {
  const [webgl, setWebgl] = useState(false);
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setWebgl(webglSupported());
    const motion = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    setAnimate(motion ? !motion.matches : false);
  }, []);

  return (
    <div className="relative isolate flex h-full min-h-[15rem] flex-col justify-end overflow-hidden p-2">
      {/* No card: the field fades out at its edges into the panel instead. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_60%_35%,#000_35%,transparent_75%)]"
      >
        {webgl ? (
          <Suspense fallback={null}>
            <MegaMenuArtImpl shape={shape} tone={tone} animate={animate} />
          </Suspense>
        ) : null}
        {/* White pooled under the words so they always sit on plain colour. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,hsl(var(--surface))_20%,transparent_70%)]" />
      </div>
      <p className="text-xl leading-snug text-primary">{title}</p>
      <p className="mt-1 text-[15px] leading-6 text-muted-foreground">{line}</p>
    </div>
  );
}
