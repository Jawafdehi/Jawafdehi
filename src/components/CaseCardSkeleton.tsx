import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors <CaseCard> in the grid: the archive's card shell (white on a
 * hairline, rounded-2xl, no shadow), a 16:9 banner, two tag pills, the title, the entity / location / बिगो rows, and the navy pill button. Same
 * outer box as the live card, so the grid does not jump when results land.
 */
export const CaseCardSkeleton = () => {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-surface"
    >
      <Skeleton className="aspect-video w-full shrink-0 rounded-none" />
      <div className="flex flex-1 flex-col px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-5 w-4/5" />
        <div className="mt-5 space-y-3">
          {["w-48", "w-40", "w-44"].map((width) => (
            <div key={width} className="flex items-center gap-2">
              <Skeleton className="h-[18px] w-[18px] shrink-0 rounded-full" />
              <Skeleton className={`h-4 ${width}`} />
            </div>
          ))}
        </div>
        <div className="mt-auto pt-6">
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
};
