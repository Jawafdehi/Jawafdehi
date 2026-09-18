import { lazy, Suspense } from "react";

import { BigoRangeFilterSkeleton } from "@/components/search/BigoRangeFilterSkeleton";
import { hasUsableRails, type BigoBounds, type BigoExtent } from "@/lib/bigo-range";

/**
 * `BigoRangeFilter`, kept off the critical path.
 *
 * ## Why this one and not the other filters
 *
 * It is the only consumer of `@radix-ui/react-slider` in the tree:
 * `src/components/ui/slider.tsx` is the package's sole importer, and this
 * filter is the sole importer of that. So the boundary moves a whole
 * third-party package, not just component source — which is exactly what the
 * `DateRangeFilter` attempt could not do. That one recovered 319 bytes of an
 * estimated ~1,600 because `lib/date-range` stays eager regardless
 * (`archive-search-params` and `ArchiveSearch` both read its helpers on every
 * render), so only the component moved.
 *
 * `lib/bigo-range` is eager here for the same reason and stays that way — see
 * the `hasUsableRails` note below. The win is the slider, and the slider has
 * nowhere else to be.
 *
 * ## Why deferring is honest here and not a waterfall
 *
 * The control renders only under `selectedType === "case"`, and `/search`
 * defaults to `type=all` (`utils/archive-search-params`: an unknown or absent
 * type is rewritten to `all`, deliberately, so a fresh search is not scoped to
 * one under-populated type). `/materials` and `/court-cases` pin a non-case
 * type. So on every cold load the chunk is NOT fetched; it is fetched when the
 * reader chooses the Cases tab, which is a click, which is the textbook case
 * for a dynamic import — the same reasoning as `LazyQRCode`, where the code
 * cannot be needed before the dialog opens.
 *
 * It is in no pre-rendered HTML either. `/search` and `/courtcases` are
 * pre-rendered, but the pre-renderer passes no query string, so `selectedType`
 * is `all` there and this subtree never renders. The split policy in
 * `src/routes.tsx` — renderToString does not await Suspense, so a lazy boundary
 * inside pre-rendered output would publish a fallback — therefore does not bite.
 */
const BigoRangeFilter = lazy(() =>
  import("@/components/search/BigoRangeFilter").then((m) => ({
    default: m.BigoRangeFilter,
  })),
);

export type { BigoBounds };

type LazyBigoRangeFilterProps = {
  /** Corpus extent from the API. Absent → no control. */
  extent?: BigoExtent;
  min?: number;
  max?: number;
  onCommit: (bounds: BigoBounds) => void;
};

export function LazyBigoRangeFilter({
  extent,
  min,
  max,
  onCommit,
}: Readonly<LazyBigoRangeFilterProps>) {
  // The rails check is hoisted OUT of the lazy component on purpose, and this is
  // the whole reason this wrapper has a body at all.
  //
  // `BigoRangeFilter` returns null when the extent has no usable rails — no
  // cases with a recorded amount, or a corpus that cannot be laddered. That is a
  // real and routine outcome. Left inside the boundary it becomes a ~296px
  // skeleton that flashes and then resolves to nothing, on a column whose every
  // facet below it would jump: the reader watches the sidebar collapse for a
  // control that was never going to appear.
  //
  // Hoisting it costs nothing. `hasUsableRails` is a four-predicate guard in
  // `lib/bigo-range`, and that module is eager anyway — `ArchiveSearch` and
  // `utils/archive-search-params` both import from it — so this decides between
  // the skeleton and nothing without pulling a byte forward.
  if (!hasUsableRails(extent)) return null;

  return (
    <Suspense fallback={<BigoRangeFilterSkeleton />}>
      <BigoRangeFilter extent={extent} max={max} min={min} onCommit={onCommit} />
    </Suspense>
  );
}
