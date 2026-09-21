import { Skeleton } from "@/components/ui/skeleton";

/**
 * The space the बिगो control occupies, reserved.
 *
 * ~296px: a legend, the track and its endpoint row, two stacked amount fields
 * and the coverage note.
 *
 * Two callers, and they must not drift apart — the cold-load sidebar in
 * `SearchFiltersSkeleton`, and the Suspense fallback in `LazyBigoRangeFilter`.
 * They can both be on screen during the same visit (the facets land, then the
 * slider chunk does), so a discrepancy between them is a reflow the reader sees
 * twice. That is why this is a component and not two copies of seven
 * `<Skeleton>`s.
 *
 * Callers gate it; it does not gate itself. Reserving this block
 * unconditionally collapses ~296px on first paint everywhere it is not filled —
 * see the note in `SearchFiltersSkeleton`, which is the bug this shape exists to
 * avoid.
 */
export function BigoRangeFilterSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-14 w-full rounded-sm" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-11 w-full rounded-md" />
      <Skeleton className="h-11 w-full rounded-md" />
      <Skeleton className="h-11 w-32 rounded-md" />
    </div>
  );
}
