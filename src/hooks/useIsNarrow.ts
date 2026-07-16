import { useEffect, useState } from "react";

/**
 * True when the viewport is at or below `maxWidthPx` (default 640px — Tailwind's
 * `sm` breakpoint). SSR-safe: returns false until mounted (so server markup and
 * the first client render agree), then subscribes to viewport changes.
 *
 * Used to shrink chart gutters on phones so horizontal bars don't crush into a
 * thin strip on the right.
 */
export function useIsNarrow(maxWidthPx = 640): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const update = () => setNarrow(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [maxWidthPx]);

  return narrow;
}
