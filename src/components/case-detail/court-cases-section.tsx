import { Suspense, lazy } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { CourtCase } from "@/types/jds";

// Lazy, and the laziness is load-bearing rather than tidying. This is the ONLY
// consumer of @/components/ui/collapsible in the app, and the case-detail route
// is eager (it is pre-rendered), so a static import put Radix Collapsible plus
// this hearings table in the initial payload of EVERY page — including /search,
// which never renders a court case this way. The section is below the fold and
// already conditional, so a Suspense fallback here costs nothing visible.
const CourtCaseDetails = lazy(() =>
  import("@/components/courtcase/CourtCaseDetails").then((m) => ({
    default: m.CourtCaseDetails,
  })),
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
      <h2 className="mb-6 flex items-center text-xl md:text-2xl font-semibold tracking-tight text-primary">
        {title}
      </h2>

      <div className="space-y-4 text-primary/75">
        <Suspense
          fallback={
            <div className="space-y-2 rounded-lg border border-border p-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          }
        >
          {courtCases.map(({ courtCase, id, isLoading }) => (
          <CourtCaseDetails
            key={id}
            courtCaseId={id}
            courtCase={courtCase}
            isLoading={isLoading}
            linkToDetail
          />
          ))}
        </Suspense>
      </div>
    </section>
  );
}
