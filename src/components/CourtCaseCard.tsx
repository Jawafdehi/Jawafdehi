import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Scale, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { CourtCase, CourtCaseHearing } from "@/types/jds";
import { formatDateWithBS } from "@/utils/date";

// ── Court identifier parsing ──────────────────────────────────────────────

const COURT_NAMES_EN: Record<string, string> = {
  special: "Special Court",
  supreme: "Supreme Court",
  high: "High Court",
  district: "District Court",
  appellate: "Appellate Court",
};

const COURT_NAMES_NE: Record<string, string> = {
  special: "विशेष अदालत",
  supreme: "सर्वोच्च अदालत",
};

function parseCourtIdentifier(
  courtIdentifier: string,
  lang: string
): { courtName: string; caseNumber: string } {
  const colonIdx = courtIdentifier.indexOf(":");
  if (colonIdx === -1) {
    return { courtName: courtIdentifier, caseNumber: "" };
  }

  const prefix = courtIdentifier.slice(0, colonIdx).toLowerCase();
  const caseNumber = courtIdentifier.slice(colonIdx + 1);

  let courtName: string;
  if (lang === "ne" && COURT_NAMES_NE[prefix]) {
    courtName = COURT_NAMES_NE[prefix];
  } else {
    courtName = COURT_NAMES_EN[prefix] ?? courtIdentifier.slice(0, colonIdx);
  }

  return { courtName, caseNumber };
}

// ── Defendant/Plaintiff from entities ────────────────────────────────────

function getPartiesByRole(courtCase: CourtCase): {
  plaintiffs: string[];
  defendants: string[];
} {
  const plaintiffs: string[] = [];
  const defendants: string[] = [];

  for (const entity of courtCase.entities) {
    const side = entity.side?.toLowerCase();
    if (side === "plaintiff" || side === "वादी") {
      plaintiffs.push(entity.name);
    } else if (side === "defendant" || side === "प्रतिवादी") {
      defendants.push(entity.name);
    }
  }

  // Fall back to string fields if entities list is empty
  if (plaintiffs.length === 0 && courtCase.plaintiff) {
    plaintiffs.push(courtCase.plaintiff);
  }
  if (defendants.length === 0 && courtCase.defendant) {
    defendants.push(courtCase.defendant);
  }

  return { plaintiffs, defendants };
}

// ── Component ─────────────────────────────────────────────────────────────

interface CourtCaseCardProps {
  courtCaseId: string;
  courtCase?: CourtCase;
  isLoading: boolean;
  // When true, the header links to the data-lake court-case detail page
  // (/courtcase/<court>/<case_number>). Off on the detail page itself.
  linkToDetail?: boolean;
}

// The /courtcase/* detail path for a `<court>:<case_number>` id (or null if the
// id isn't in that composite form).
function courtCaseDetailPath(courtCaseId: string): string | null {
  const colonIdx = courtCaseId.indexOf(":");
  if (colonIdx === -1) return null;
  const court = courtCaseId.slice(0, colonIdx);
  const caseNumber = courtCaseId.slice(colonIdx + 1);
  if (!court || !caseNumber) return null;
  return `/courtcase/${court}/${encodeURIComponent(caseNumber)}`;
}

export function CourtCaseCard({ courtCaseId, courtCase, isLoading, linkToDetail }: CourtCaseCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const { courtName, caseNumber } = parseCourtIdentifier(courtCaseId, lang);
  const detailPath = linkToDetail ? courtCaseDetailPath(courtCaseId) : null;

  const header = (
    <>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Scale className="h-4 w-4 shrink-0 text-muted-foreground" />
        {courtName}
      </div>
      {caseNumber && (
        <div className="pl-6 text-xs font-mono text-muted-foreground">
          {t("caseDetail.courtCaseNumber", "Case No.")}: {caseNumber}
        </div>
      )}
    </>
  );

  return (
    <div className="rounded-lg border border-border p-4">
      {/* Court name + case number header (links to the detail page when asked). */}
      <div className="mb-3 space-y-0.5">
        {detailPath ? (
          <Link
            to={detailPath}
            className="block rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {header}
          </Link>
        ) : (
          header
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : courtCase ? (
        <div className="space-y-3 text-sm">
          {/* Metadata row */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
            {courtCase.case_type && (
              <span>
                <span className="font-medium text-foreground">{t("caseDetail.courtCaseType", "Case Type")}:</span>{" "}
                {courtCase.case_type}
              </span>
            )}
            {courtCase.category && (
              <span>
                <span className="font-medium text-foreground">{t("caseDetail.courtCategory", "Category")}:</span>{" "}
                {courtCase.category}
              </span>
            )}
            {courtCase.division && (
              <span>
                <span className="font-medium text-foreground">{t("caseDetail.courtDivision", "Division")}:</span>{" "}
                {courtCase.division}
              </span>
            )}
            {courtCase.registration_date_ad && (
              <span>
                <span className="font-medium text-foreground">{t("caseDetail.courtRegistered", "Registered")}:</span>{" "}
                {formatDateWithBS(courtCase.registration_date_ad)}
              </span>
            )}
            {courtCase.case_status && (
              <span>
                <span className="font-medium text-foreground">{t("caseDetail.courtStatus", "Status")}:</span>{" "}
                {courtCase.case_status}
              </span>
            )}
          </div>

          {/* Parties row */}
          {(() => {
            const { plaintiffs, defendants } = getPartiesByRole(courtCase);
            if (plaintiffs.length === 0 && defendants.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
                {plaintiffs.length > 0 && (
                  <span>
                    <span className="font-medium text-foreground">{t("caseDetail.courtPlaintiff", "Plaintiff")}:</span>{" "}
                    {plaintiffs.join(", ")}
                  </span>
                )}
                {defendants.length > 0 && (
                  <span>
                    <span className="font-medium text-foreground">{t("caseDetail.courtDefendant", "Defendant")}:</span>{" "}
                    {defendants.join(", ")}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Hearings collapsible */}
          {courtCase.hearings.length > 0 && (
            <Collapsible className="mt-3">
              <CollapsibleTrigger className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                <span>
                  {t("caseDetail.courtHearings", "Hearings")} ({courtCase.hearings.length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="table-scroll-wrapper overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                          {t("caseDetail.courtHearingDate", "सुनवाइ मिती")}
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground">
                          {t("caseDetail.courtHearingJudges", "Judges")}
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                          {t("caseDetail.courtHearingStatus", "Status")}
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                          {t("caseDetail.courtHearingDecision", "Decision")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...courtCase.hearings]
                        .sort((a, b) => a.hearing_date_ad.localeCompare(b.hearing_date_ad))
                        .map((hearing: CourtCaseHearing) => (
                          <tr key={hearing.id} className="border-b border-border/50 last:border-0">
                            <td className="px-3 py-3 text-foreground whitespace-nowrap">
                              {formatDateWithBS(hearing.hearing_date_ad)}
                            </td>
                            <td className="px-3 py-3 text-foreground">
                              {hearing.judge_names
                                ? hearing.judge_names.split("\n").map((line, i, arr) => (
                                    <span key={i}>
                                      {line}
                                      {i < arr.length - 1 && <br />}
                                    </span>
                                  ))
                                : null}
                            </td>
                            <td className="px-3 py-3 text-foreground whitespace-nowrap">
                              {hearing.case_status}
                            </td>
                            <td className="px-3 py-3 text-foreground whitespace-nowrap">
                              {hearing.decision_type || ""}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("caseDetail.courtCaseUnavailable", "Court case details unavailable.")}
        </p>
      )}
    </div>
  );
}
