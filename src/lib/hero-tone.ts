import { useSyncExternalStore } from "react";

// Whether the page's hero is dark (navy) or light. The navbar is transparent
// over a hero at rest and needs to know which text colour reads on it; the
// home page's hero styles (see components/home/hero.tsx) are not all navy.
// A route-based guess (Navbar's DARK_HERO_PATHS) covers every other page.
export type HeroTone = "dark" | "light";

let tone: HeroTone = "dark";
const listeners = new Set<() => void>();

export function setHeroTone(next: HeroTone) {
  if (next === tone) return;
  tone = next;
  listeners.forEach((listener) => listener());
}

export function useHeroTone(): HeroTone {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => tone,
    () => "dark",
  );
}
