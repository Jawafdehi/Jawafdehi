import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the `<UpdateCard>` on /updates. Declared structurally rather than
// imported from the page so the component doesn't depend on the route module;
// the compiler still catches a drift, because the page passes its own ViewMode.
type UpdateCardSkeletonViewMode = "cards" | "list";

/**
 * Loading placeholder for a single update card.
 *
 * A skeleton is only useful if it mirrors the layout that replaces it — a generic
 * frame is worse than no placeholder at all — so this keeps the real card's
 * chrome (media block, date row, two-line title, excerpt, read-more link) and the
 * same `data-view` list/card switch, and reuses <Skeleton> for the pulse.
 */
export const UpdateCardSkeleton = ({
  viewMode,
}: Readonly<{ viewMode: UpdateCardSkeletonViewMode }>) => {
  const isList = viewMode === "list";

  return (
    <div
      aria-hidden="true"
      data-view={viewMode}
      className="flex min-h-full flex-col overflow-hidden rounded-3xl bg-card shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] md:data-[view=list]:flex-row"
    >
      <div
        data-view={viewMode}
        className="h-52 overflow-hidden border-b border-border/70 md:data-[view=list]:h-auto md:data-[view=list]:min-h-52 md:data-[view=list]:w-80 md:data-[view=list]:shrink-0 md:data-[view=list]:border-b-0 md:data-[view=list]:border-r"
      >
        <Skeleton className="h-full min-h-52 w-full rounded-none" />
      </div>

      <div className="flex flex-1 flex-col justify-between gap-5 p-4 sm:p-5">
        <div>
          {/* Date row: calendar icon + publication date. */}
          <div className="mb-3 flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>

          {/* Title — two clamped lines at `leading-8`. */}
          <div className="space-y-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-2/3" />
          </div>

          {/* Excerpt — three lines, wider in list view where it isn't clamped. */}
          <div className={isList ? "mt-4 max-w-3xl space-y-2" : "mt-4 space-y-2"}>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>

        <Skeleton className="h-5 w-28" />
      </div>
    </div>
  );
};
