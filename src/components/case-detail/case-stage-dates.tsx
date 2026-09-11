import { useTranslation } from "react-i18next";

import type { CaseStage } from "@/types/jds";
import { cn } from "@/lib/utils";
import { stageIsPending, stageLabelKey } from "@/utils/case-stages";
import { formatCaseDateRangeForLanguage } from "@/utils/date";
import { formatCourtName } from "@/utils/court-case-format";
import { parseCourtCaseRef } from "@/utils/courtCaseRef";

// One labelled row per stage of a case, replacing the single "मुद्दा मिति /
// Case date" range. That label read to the public as WHEN THE CORRUPTION
// HAPPENED, which it never was: these are court registration and verdict
// dates, and a case runs through several forums, so it takes several rows.
interface CaseStageDatesProps {
  stages: CaseStage[];
  language: string;
  /** `banner` is the hero metadata block; `compact` the print sidebar. */
  variant?: "banner" | "compact";
  className?: string;
}

// The forum a stage was heard in: the court behind its court-case IRI, else
// the investigating/arbitrating `body` as recorded. Two `appeal` rows on the
// same case are otherwise two identical labels.
function stageForum(stage: CaseStage, language: string): string | null {
  const court = parseCourtCaseRef(stage.courtcase_iri)?.court;
  if (court) return formatCourtName(court, language);
  const body = stage.body?.trim();
  return body || null;
}

export function CaseStageDates({
  stages,
  language,
  variant = "banner",
  className,
}: Readonly<CaseStageDatesProps>) {
  const { t } = useTranslation();

  if (stages.length === 0) return null;

  const pendingLabel = t("caseDetail.stagePending");
  const compact = variant === "compact";

  return (
    <div
      className={cn(compact ? "space-y-1" : "space-y-3", className)}
      data-testid="case-stage-dates"
    >
      {stages.map((stage, index) => {
        // `other` carries its own label; every other stage is named by the
        // closed vocabulary, so an unlabelled `other` still gets a word.
        const label =
          (stage.stage === "other" ? stage.label?.trim() : "") ||
          t(stageLabelKey(stage.stage));
        const forum = stageForum(stage, language);
        // A stage with neither date is pending too — "N/A" would say the case
        // has no dates when what it has is no decision yet.
        const range =
          !stage.start && !stage.end
            ? { primary: pendingLabel, secondary: null }
            : formatCaseDateRangeForLanguage(
                stage.start,
                stage.end,
                pendingLabel,
                language,
              );

        return (
          <div
            // Stages are an ordered, non-unique list (a remand starts a second
            // first instance), so position is the only stable key.
            key={`${stage.stage}-${index}`}
            data-testid="case-stage-row"
            data-stage={stage.stage}
            data-pending={stageIsPending(stage) ? "true" : "false"}
          >
            <p
              className={cn(
                "font-semibold text-primary/60",
                compact ? "text-sm leading-5" : "mb-1 text-sm leading-5",
              )}
            >
              {label}
              {forum ? <span className="font-normal"> · {forum}</span> : null}:
            </p>
            <div
              className={cn(
                "font-medium text-primary",
                compact ? "text-sm leading-5" : "text-sm leading-6 md:text-base",
              )}
            >
              <p>{range.primary}</p>
              {range.secondary ? (
                <p className="text-sm font-normal leading-6 text-primary/65">
                  ({range.secondary})
                </p>
              ) : null}
              {stage.notes?.trim() ? (
                <p
                  className="mt-0.5 text-sm font-normal leading-6 text-muted-foreground"
                  data-testid="case-stage-note"
                >
                  {stage.notes}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
