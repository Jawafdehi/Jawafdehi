// Client-only gate for the WebGL donate globe.
//
// Deliberately tiny and dependency-free so it CAN be statically imported from
// community.tsx. The heavy module (three.js, globe-scene.tsx) loads only
// through React.lazy below, and only after every gate passes — the same
// contract as the home hero's scene gate:
//
//   1. mounted        — never during SSR/prerender (hydration stays identical)
//   2. WebGL support  — probe a throwaway canvas; no context, no scene
//   3. reduced motion — prefers-reduced-motion keeps the static world map
//   4. affordability  — Data Saver / 2g-3g / low-memory devices never download
//                       the 3D chunk at all (hero-connection-gate.ts)
//   5. idle           — requestIdleCallback after load, so the chunk never
//                       competes with LCP for bandwidth or main-thread time
//
// When any gate fails the component renders nothing and the static world-map
// backdrop simply remains — that IS the fallback.
import { lazy, Suspense, useEffect, useState } from "react";

import {
  heroSceneAffordable,
  readConnectionSignals,
} from "@/components/home/hero-connection-gate";

const GlobeScene = lazy(() => import("./globe-scene"));

function webglSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function GlobeGate() {
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!webglSupported()) return;
    if (!heroSceneAffordable(readConnectionSignals())) return;

    let cancelled = false;
    const arm = () => {
      if (cancelled) return;
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
      <GlobeScene />
    </Suspense>
  );
}
