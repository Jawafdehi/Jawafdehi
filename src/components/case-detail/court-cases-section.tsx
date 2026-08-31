import { CaseSectionHeading } from "@/components/case-detail/case-section-heading";
import { CourtCaseCard } from "@/components/CourtCaseCard";
import type { CourtCase } from "@/types/jds";

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
          <CourtCaseCard
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
