// Client-only gate for the WebGL hero scene.
//
// This file is deliberately tiny and dependency-free so it CAN be statically
// imported from hero.tsx. The heavy module (three.js + @react-three/fiber,
// hero-scene.tsx) loads only through React.lazy below, and only after every
// gate passes:
//
//   1. mounted        — never during SSR/prerender (hydration stays identical)
//   2. WebGL support  — probe a throwaway canvas; no context, no scene
//   3. reduced motion — prefers-reduced-motion keeps the static backdrop
//   4. affordability  — Data Saver / 2g-3g / low-memory devices never download
//                       the ~237 KB chunk at all (hero-connection-gate.ts)
//   5. idle           — requestIdleCallback after load, so the 3D chunk never
//                       competes with LCP for bandwidth or main-thread time
//
// When any gate fails the component renders nothing and the existing static
// map backdrop simply remains — that IS the fallback.
import { lazy, Suspense, useEffect, useState } from "react";

import { heroSceneAffordable, readConnectionSignals } from "./hero-connection-gate";

const HeroScene = lazy(() => import("./hero-scene"));

type HeroSceneGateProps = {
  mapSrc: string;
  /** Render light-on-dark points regardless of theme — the hero mounts the
   * scene inside an always-navy panel, where near-black points would vanish. */
  forceDark?: boolean;
  /** Full-bleed stage pose + scroll scrub — see hero-scene.tsx. */
  stage?: boolean;
  /** Scroll progress 0..1, shared as a mutable ref (never re-renders). */
  scrollRef?: { current: number };
  onReady?: () => void;
};

function webglSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function HeroSceneGate({
  mapSrc,
  forceDark = false,
  stage = false,
  scrollRef,
  onReady,
}: Readonly<HeroSceneGateProps>) {
  const [eligible, setEligible] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!webglSupported()) return;
    if (!heroSceneAffordable(readConnectionSignals())) return;

    let cancelled = false;
    const arm = () => {
      if (cancelled) return;
      setDark(document.documentElement.classList.contains("dark"));
      setEligible(true);
    };

    // Defer past first paint: idle callback when available, else a short delay.
    let idleId = 0;
    let timerId = 0;
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(arm, { timeout: 2500 });
    } else {
      timerId = window.setTimeout(arm, 1200);
    }
    return () => {
      cancelled = true;
      if (idleId) window.cancelIdleCallback(idleId);
      if (timerId) window.clearTimeout(timerId);
    };
  }, []);

  if (!eligible) return null;

  return (
    <Suspense fallback={null}>
      <HeroScene mapSrc={mapSrc} dark={forceDark || dark} stage={stage} scrollRef={scrollRef} onReady={onReady} />
    </Suspense>
  );
}
