// A brand shader as a section backdrop, mounted only in the browser and only
// once its section comes near the viewport — the footer carries one on every
// page, and most visitors never scroll that far. Until then (and for SSR,
// no-JS and no-WebGL visitors) the section's own navy background shows; the
// shader fades in over it.
//
// Under reduced motion the shader renders one still frame. Grain is heavy, so
// on a weak device or with Save-Data on, its CSS texture stands in. Without
// WebGL nothing mounts and the navy background is the design.
import { lazy, Suspense, useEffect, useRef, useState } from "react";

import type { ShaderDesign } from "@/components/brand-shaders/palette";
import { GrainTexture } from "@/components/brand-shaders/grain-texture";
import { webglSupported } from "@/components/home/hero-webgl-gate";
import { lazyChunk } from "@/lib/chunk-reload";
import { cn } from "@/lib/utils";

// lazyChunk, not a bare import(): it reloads cleanly if a deploy has swapped
// the chunk out from under an open tab.
const ShaderBackdropImpl = lazy(
  lazyChunk(() => import("@/components/brand-shaders/shader-backdrop-impl"), (m) => m.default),
);

type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean } };

function isConstrainedDevice(): boolean {
  const nav = navigator as NavigatorWithConnection;
  return nav.connection?.saveData === true || (nav.hardwareConcurrency ?? 8) <= 4;
}

export function ShaderBackdrop({
  design,
  className,
}: Readonly<{ design: ShaderDesign; className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"none" | "css" | "webgl">("none");
  const [animate, setAnimate] = useState(false);
  // Shader colours are read from CSS tokens at mount; remount on a theme
  // switch so they follow it.
  const [theme, setTheme] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Paper Shaders throws when WebGL is missing, so check first: without it
    // the section's own navy shows, and grain falls back to its CSS texture.
    const reveal = () => {
      if (design === "grain" && (isConstrainedDevice() || !webglSupported())) setMode("css");
      else if (webglSupported()) setMode("webgl");
    };

    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "undefined") {
      reveal();
    } else {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            reveal();
            io?.disconnect();
          }
        },
        { rootMargin: "300px 0px" },
      );
      io.observe(el);
    }

    // matchMedia is missing in some embedded browsers (and jsdom): treat that
    // as reduced motion, which is the safe default.
    const motion = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const syncMotion = () => setAnimate(motion ? !motion.matches : false);
    syncMotion();
    motion?.addEventListener("change", syncMotion);

    const root = document.documentElement;
    const syncTheme = () => setTheme(root.className);
    syncTheme();
    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      io?.disconnect();
      motion?.removeEventListener("change", syncMotion);
      themeObserver.disconnect();
    };
  }, [design]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", mode !== "none" && "animate-in fade-in duration-700", className)}
    >
      {mode === "css" ? <GrainTexture className="h-full w-full" /> : null}
      {mode === "webgl" ? (
        <Suspense fallback={null}>
          <ShaderBackdropImpl key={theme} design={design} animate={animate} />
        </Suspense>
      ) : null}
    </div>
  );
}
