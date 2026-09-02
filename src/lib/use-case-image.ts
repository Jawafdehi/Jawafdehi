// The candidate-walk half of the case-image rules, as a hook.
//
// `caseImageSources` in ./case-images decides WHICH images a case has, in what
// order. This owns the runtime behaviour that goes with it: hold a position in
// that list, advance it when the browser fails to load one, and reset when the
// list changes because the component was reused for a different case.
//
// Extracted because three surfaces need it — the card, the detail hero, and the
// oEmbed card — and each had its own copy of the same index/useEffect/clamp
// dance. Three copies of a subtle rule is three chances to fix a bug in one and
// not the others, and two of the three sit in the eagerly-loaded shell, so the
// duplication cost initial payload as well as clarity.
import { useEffect, useState } from "react";

import { CASE_PLACEHOLDER_IMAGE, caseImageSources } from "@/lib/case-images";
import type { CaseImage } from "@/types/jds";

export interface CaseImageState {
  /** The URL to render right now. Undefined only when there is nothing left. */
  src: string | undefined;
  /** The ladder for `src`, or undefined — see `caseImageSources.srcsetFor`. */
  srcSet: string | undefined;
  /** True when `src` is the shared scales illustration rather than a real image. */
  isPlaceholder: boolean;
  /** Wire to the `<img onError>`; advances to the next candidate. */
  onError: () => void;
}

/**
 * Track which of a case's images is currently renderable.
 *
 * @param image uploaded rendition ladder, preferred over every URL below
 * @param urls  deprecated free-text URLs, tried in the order given
 * @param opts  `includePlaceholder: false` drops the shared illustration from
 *   the list, for a surface with its own no-image treatment (the oEmbed card
 *   uses a short navy band). `src` is then undefined once everything fails.
 */
export function useCaseImage(
  image: CaseImage | null | undefined,
  urls: Array<string | null | undefined>,
  opts: { includePlaceholder?: boolean } = {},
): CaseImageState {
  const { includePlaceholder = true } = opts;
  const { candidates, srcsetFor } = caseImageSources(image, ...urls);
  const usable = includePlaceholder
    ? candidates
    : candidates.filter((url) => url !== CASE_PLACEHOLDER_IMAGE);

  const [index, setIndex] = useState(0);

  // Keyed on the candidate LIST, not the raw props. A list re-sort or refetch
  // hands a reused component another case's images, and the old position must
  // not carry over — otherwise the new case opens on a fallback. But a prop
  // change that yields the SAME list (whitespace, or a duplicate collapsing)
  // must not discard an error-advance, or the surface swings back to a URL
  // already known to fail and flickers between the two on every render.
  const key = usable.join("|");
  useEffect(() => {
    setIndex(0);
  }, [key]);

  // Whether running off the end is meaningful depends on what ends the list.
  //
  // With the placeholder, the last entry IS the terminal state, so clamp:
  // advancing past a placeholder that itself failed to load must not wrap back
  // to a URL already known to fail and loop the error handler forever.
  //
  // Without it there is no terminal entry, so the index must be allowed past
  // the end — `src` goes undefined and the caller renders its own no-image
  // treatment. Clamping here instead would pin the surface to a broken image
  // forever, which is the bug this hook exists to prevent.
  const src = includePlaceholder
    ? usable[Math.min(index, usable.length - 1)]
    : usable[index];

  return {
    src,
    srcSet: src ? srcsetFor(src) : undefined,
    isPlaceholder: src === CASE_PLACEHOLDER_IMAGE,
    onError: () => setIndex((i) => i + 1),
  };
}
