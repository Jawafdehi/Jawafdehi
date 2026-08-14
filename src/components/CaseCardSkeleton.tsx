import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const CaseCardSkeleton = () => {
  return (
    <Card aria-hidden="true" className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-card shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)]">
      <div className="relative h-52 overflow-hidden bg-muted/20">
        <Skeleton className="h-full w-full rounded-none" />
        <div className="absolute inset-x-0 top-0 p-4">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <CardHeader className="space-y-2 px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
          <div className="flex gap-1.5 mb-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </CardHeader>

        <CardContent className="flex flex-1 flex-col px-4 pb-0 pt-4 sm:px-5">
          {/* Mirrors <CaseCard>: no summary paragraph, just the meta rows
              (entity, location, बिगो) under the title. */}
          <div className="mt-2 border-t border-border/70 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </CardContent>

        <CardFooter className="mt-auto px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <Skeleton className="h-12 w-full rounded-2xl" />
        </CardFooter>
      </div>
    </Card>
  );
};
