import { CaseSectionHeading } from "@/components/case-detail/case-section-heading";
import { lazyChart } from "@/components/charts/lazy";
import type { CourtCaseDetailsProps } from "@/components/courtcase/CourtCaseDetails";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourtCase } from "@/types/jds";

// Deferred, and the deferral is load-bearing rather than tidying. This is the
// ONLY consumer of @/components/ui/collapsible in the app, and the case-detail
// route is eager (it is pre-rendered), so a static import put Radix Collapsible
// plus this hearings table in the initial payload of EVERY page — including
// /search, which never renders a court case this way.
//
// 🛑 `lazyChart`, NOT `lazy()` + `<Suspense>`. See involved-parties-section for
// the measurement; in short, `renderToString` cannot finish a Suspense boundary
// and leaks build-machine paths into the pre-rendered file when it tries.
//
// One visible consequence of the switch: the skeleton is now per court case
// rather than one for the whole group, because each entry defers independently.
// That is the more honest shape — the old single box under-reserved space for a
// case with several court records.
const CourtCaseDetails = lazyChart<CourtCaseDetailsProps>(
  () => import("@/components/courtcase/CourtCaseDetails").then((m) => m.CourtCaseDetails),
  () => (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  ),
);

export type CourtCaseSectionItem = {
  courtCase?: CourtCase;
  id: string;
  isLoading: boolean;
};

interface CourtCasesSectionProps {
  courtCases: CourtCaseSectionItem[];
  title: string;
}

export function CourtCasesSection({
  courtCases,
  title,
}: Readonly<CourtCasesSectionProps>) {
  if (courtCases.length === 0) return null;

  return (
    <section id="court-case" className="mb-12 scroll-mt-28 max-w-4xl">
      <CaseSectionHeading>{title}</CaseSectionHeading>

      <div className="space-y-4 text-primary/75">
        {courtCases.map(({ courtCase, id, isLoading }) => (
          <CourtCaseDetails
            key={id}
            courtCaseId={id}
            courtCase={courtCase}
            isLoading={isLoading}
            linkToDetail
          />
        ))}
      </div>
    </section>
  );
}
