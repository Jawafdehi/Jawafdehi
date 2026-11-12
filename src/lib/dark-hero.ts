// Pages whose path the navbar cannot know in advance (the 404 answers any
// path) say here that they open on a full-bleed navy stage, so the
// transparent navbar turns light-on-dark over it like it does on /.
import { useSyncExternalStore } from "react";

let darkHero = false;
const listeners = new Set<() => void>();

export function setPageDarkHero(next: boolean) {
  darkHero = next;
  listeners.forEach((listener) => listener());
}

export function usePageDarkHero(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => darkHero,
    () => false,
  );
}
