import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { CourtCase, CourtCaseHearing } from "@/types/jds";
import { parseCourtCaseRef } from "@/utils/courtCaseRef";
import { formatDateWithBS } from "@/utils/date";
import { cn } from "@/lib/utils";

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
  // Refs arrive as the canonical @id IRI or the legacy `<court>:<number>` form.
  const parts = parseCourtCaseRef(courtIdentifier);
  if (!parts) {
    return { courtName: courtIdentifier, caseNumber: "" };
  }

  const prefix = parts.court.toLowerCase();
  // IRIs carry the number lowercased; display it in its natural uppercase.
  const caseNumber = parts.caseNumber.toUpperCase();

  let courtName: string;
  if (lang === "ne" && COURT_NAMES_NE[prefix]) {
    courtName = COURT_NAMES_NE[prefix];
  } else {
    courtName = COURT_NAMES_EN[prefix] ?? parts.court;
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

  // `entities` is only populated on the assembled "full" court case; the core
  // shape used on the case-detail page omits it. Default to [] so the string
  // plaintiff/defendant fallback below still renders instead of crashing.
  for (const entity of courtCase.entities ?? []) {
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

function getStatusTone(status: string | null | undefined) {
  const normalized = status?.toLowerCase() || "";

  if (
    normalized.includes("फैसला") ||
    normalized.includes("faisala") ||
    normalized.includes("decision") ||
    normalized.includes("decided") ||
    normalized.includes("verdict")
  ) {
    return "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("progress") ||
    normalized.includes("विचाराधीन") ||
    normalized.includes("चालु") ||
    normalized.includes("ongoing")
  ) {
    return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
  }

  return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200";
}

function getLatestCourtUpdate(courtCase: CourtCase) {
  if (courtCase.verdict_date_ad) {
    return {
      type: courtCase.case_status || "Faisala",
      fallbackKey: "caseDetail.courtFaisala",
      date: formatDateWithBS(courtCase.verdict_date_ad, "PP", courtCase.verdict_date_bs),
    };
  }

  // `hearings` is absent on the core shape used on the case-detail page.
  const latestHearing = [...(courtCase.hearings ?? [])]
    .filter((hearing) => hearing.hearing_date_ad)
    .sort((a, b) => b.hearing_date_ad.localeCompare(a.hearing_date_ad))[0];

  if (latestHearing) {
    return {
      type: latestHearing.decision_type || latestHearing.case_status || "Hearing",
      fallbackKey: "caseDetail.courtHearing",
      date: formatDateWithBS(latestHearing.hearing_date_ad, "PP", latestHearing.hearing_date_bs),
    };
  }

  if (courtCase.registration_date_ad) {
    return {
      type: "",
      fallbackKey: "caseDetail.courtRegistered",
      date: formatDateWithBS(courtCase.registration_date_ad, "PP", courtCase.registration_date_bs),
    };
  }

  return null;
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

// The /courtcase/* detail path for a court-case ref — @id IRI or
// `<court>:<case_number>` (or null if the id is in neither form).
function courtCaseDetailPath(courtCaseId: string): string | null {
  const parts = parseCourtCaseRef(courtCaseId);
  if (!parts) return null;
  return `/courtcase/${parts.court}/${encodeURIComponent(parts.caseNumber)}`;
}

export function CourtCaseCard({ courtCaseId, courtCase, isLoading, linkToDetail }: CourtCaseCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const { courtName, caseNumber } = parseCourtIdentifier(courtCaseId, lang);
  const detailPath = linkToDetail ? courtCaseDetailPath(courtCaseId) : null;
  const lastUpdate = courtCase ? getLatestCourtUpdate(courtCase) : null;

  const headerText = (
    <span className="break-words">
      {caseNumber ? `${caseNumber} (${courtName})` : courtName}
    </span>
  );

  return (
    <div className="rounded-lg border border-border p-4">
      {/* Court name + case number header (links to the detail page when asked). */}
      <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {detailPath ? (
            <Link
              to={detailPath}
              className="inline-flex min-w-0 flex-wrap items-center gap-1.5 text-base font-semibold leading-6 text-primary underline underline-offset-4 transition-colors hover:text-primary/75 md:text-lg"
            >
              {headerText}
            </Link>
          ) : (
            <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5 text-base font-semibold leading-6 text-primary md:text-lg">
              {headerText}
            </span>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-end">
          {lastUpdate && (
            <p className="max-w-md text-left text-sm leading-5 text-primary/60">
              <span className="font-medium text-primary/70">
                {t("caseDetail.courtLastUpdate", "Last update")}:
              </span>{" "}
              {lastUpdate.type || t(lastUpdate.fallbackKey)} - {lastUpdate.date}
            </p>
          )}

          {courtCase?.case_status && (
            <Badge
              variant="outline"
              className={cn("w-fit rounded-full px-3 py-1 text-xs font-semibold", getStatusTone(courtCase.case_status))}
            >
              {courtCase.case_status}
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : courtCase ? (
        <div className="space-y-3">
          {/* Metadata row */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-base font-normal leading-[1.7] text-primary/75 break-words">
            {courtCase.case_type && (
              <span className="break-words">
                <span className="font-medium text-primary/90">{t("caseDetail.courtCaseType", "Case Type")}:</span>{" "}
                {courtCase.case_type}
              </span>
            )}
            {courtCase.category && (
              <span className="break-words">
                <span className="font-medium text-primary/90">{t("caseDetail.courtCategory", "Category")}:</span>{" "}
                {courtCase.category}
              </span>
            )}
            {courtCase.registration_date_ad && (
              <span className="break-words">
                <span className="font-medium text-primary/90">{t("caseDetail.courtRegistered", "Registered")}:</span>{" "}
                {formatDateWithBS(courtCase.registration_date_ad, "PP", courtCase.registration_date_bs)}
              </span>
            )}
            {courtCase.verdict_date_ad && (
              <span className="break-words">
                <span className="font-medium text-primary/90">{t("caseDetail.courtVerdictDate", "Faisala date")}:</span>{" "}
                {formatDateWithBS(courtCase.verdict_date_ad, "PP", courtCase.verdict_date_bs)}
              </span>
            )}
          </div>

          {/* Parties row */}
          {(() => {
            const { plaintiffs, defendants } = getPartiesByRole(courtCase);
            if (plaintiffs.length === 0 && defendants.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-base font-normal leading-[1.7] text-primary/75 break-words">
                {plaintiffs.length > 0 && (
                  <span className="break-words">
                    <span className="font-medium text-primary/90">{t("caseDetail.courtPlaintiff", "Plaintiff")}:</span>{" "}
                    {plaintiffs.join(", ")}
                  </span>
                )}
                {defendants.length > 0 && (
                  <span className="break-words">
                    <span className="font-medium text-primary/90">{t("caseDetail.courtDefendant", "Defendant")}:</span>{" "}
                    {defendants.join(", ")}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Hearings collapsible — absent on the core shape (case-detail page). */}
          {(courtCase.hearings?.length ?? 0) > 0 && (
            <Collapsible className="mt-3">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                >
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                  {t("caseDetail.courtHearings", "Hearings")} ({courtCase.hearings?.length ?? 0})
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="table-scroll-wrapper overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="whitespace-nowrap px-3 py-2.5 text-left text-sm font-semibold text-primary/90">
                          {t("caseDetail.courtHearingDate", "सुनवाइ मिती")}
                        </th>
                        <th className="px-3 py-2.5 text-left text-sm font-semibold text-primary/90">
                          {t("caseDetail.courtHearingJudges", "Judges")}
                        </th>
                        <th className="whitespace-nowrap px-3 py-2.5 text-left text-sm font-semibold text-primary/90">
                          {t("caseDetail.courtHearingStatus", "Status")}
                        </th>
                        <th className="whitespace-nowrap px-3 py-2.5 text-left text-sm font-semibold text-primary/90">
                          {t("caseDetail.courtHearingDecision", "Decision")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(courtCase.hearings ?? [])]
                        .sort((a, b) => a.hearing_date_ad.localeCompare(b.hearing_date_ad))
                        .map((hearing: CourtCaseHearing) => (
                          <tr key={hearing.id} className="border-b border-border/50 last:border-0">
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-normal leading-relaxed text-primary/75">
                              {formatDateWithBS(hearing.hearing_date_ad)}
                            </td>
                            <td className="px-3 py-2.5 text-sm font-normal leading-relaxed text-primary/75">
                              {hearing.judge_names
                                ? hearing.judge_names.split("\n").map((line, i, arr) => (
                                    <span key={i}>
                                      {line}
                                      {i < arr.length - 1 && <br />}
                                    </span>
                                  ))
                                : null}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-normal leading-relaxed text-primary/75">
                              {hearing.case_status}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-normal leading-relaxed text-primary/75">
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
