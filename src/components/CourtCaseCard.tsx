import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  FileText,
  Landmark,
} from "lucide-react";
import { CaseStatusBadge } from "@/components/CaseBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { CourtCase, CourtCaseHearing } from "@/types/jds";
import { parseCourtCaseRef } from "@/utils/courtCaseRef";
import {
  courtStatusBadgeValue,
  courtTypeValue,
  formatCourtName,
  type CourtTypeValue,
} from "@/utils/court-case-format";
import { formatDateWithBS } from "@/utils/date";
import { cn } from "@/lib/utils";

// ── Court identifier parsing ──────────────────────────────────────────────

function parseCourtIdentifier(
  courtIdentifier: string,
  lang: string
): { courtName: string; caseNumber: string } {
  // Refs arrive as the canonical @id IRI or the legacy `<court>:<number>` form.
  const parts = parseCourtCaseRef(courtIdentifier);
  if (!parts) {
    return { courtName: formatCourtName(courtIdentifier, lang), caseNumber: "" };
  }

  const prefix = parts.court.toLowerCase();
  // IRIs carry the number lowercased; display it in its natural uppercase.
  const caseNumber = parts.caseNumber.toUpperCase();
  const courtName = formatCourtName(prefix, lang);

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
    return "border-success-strong/25 bg-success-strong/10 text-success-strong dark:border-success-strong/25 dark:bg-success-strong/10 dark:text-success-strong";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("progress") ||
    normalized.includes("विचाराधीन") ||
    normalized.includes("चालु") ||
    normalized.includes("ongoing")
  ) {
    return "border-border bg-muted text-foreground dark:border-border dark:bg-card dark:text-foreground";
  }

  return "border-alert-strong/25 bg-alert-strong/10 text-alert-strong dark:border-alert-strong/25 dark:bg-alert-strong/10 dark:text-alert-strong";
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

export interface CourtCaseCardProps {
  caseNumber?: string | null;
  court?: string | null;
  // The API's `court_type` for this case. Optional: absent on documents indexed
  // before the field existed, and `courtTypeValue` then derives the tier from
  // `court` instead.
  courtType?: string | null;
  registrationDate?: string | null;
  registrationDateBs?: string | null;
  status?: string | null;
  title: string;
  url: string;
  viewMode?: "card" | "list";
}

function displayCourtStatus(status: string) {
  const spaced = status.replace(/[_-]+/g, " ").trim();
  if (spaced !== spaced.toUpperCase()) return spaced;
  return spaced
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

// The top-down wash encodes the COURT TIER. It used to encode the case status,
// which duplicated the status pill sitting on top of it while telling the
// reader nothing about which court they were looking at.
//
// Colours are the `--court-*` reds and browns (see src/index.css for how that
// ladder was picked and measured). Note they are deliberately NOT the
// success/alert tokens the pill uses, so wash and pill can no longer be
// confused for each other.
//
// THE ALPHA RISES WITH TIER, and that is doing real work rather than decorating.
// A tint is alpha-diluted against a near-white card, so at one flat alpha the
// four collapse: at the old flat 0.09 the closest pair measured deltaE00 2.4 in
// normal vision and 0.5 under red-green colour blindness — invisible. Raising
// alpha as the colour darkens restores the lightness ladder that dilution
// destroys.
//
// These values were searched, not guessed, against two hard constraints: the
// card title must hold AA on the deepest wash (4.56:1 here, floor 4.5, which is
// what caps supreme at 0.36), and District/High must be unmistakable — that
// pair was the reported failure. Result: District/High 13.5 deltaE00 (up from
// 6.2), worst pair overall 7.4, worst under red-green colour blindness 5.3.
//
// This is still the honest ceiling for a tint; undiluted these four separate by
// 13.8 and 8.9. Re-measure before retuning any of these numbers — raising a
// single alpha trades directly against the title contrast above it.
const COURT_TYPE_GRADIENTS: Record<CourtTypeValue, string> = {
  district:
    "[background-image:linear-gradient(to_bottom,hsl(var(--court-district)/0.18)_0%,transparent_44%)]",
  high: "[background-image:linear-gradient(to_bottom,hsl(var(--court-high)/0.28)_0%,transparent_44%)]",
  special:
    "[background-image:linear-gradient(to_bottom,hsl(var(--court-special)/0.30)_0%,transparent_44%)]",
  supreme:
    "[background-image:linear-gradient(to_bottom,hsl(var(--court-supreme)/0.36)_0%,transparent_44%)]",
};

function courtTypeGradientClass(courtType: CourtTypeValue | null) {
  return courtType ? COURT_TYPE_GRADIENTS[courtType] : "";
}

export function CourtCaseCard({
  caseNumber,
  court,
  courtType,
  registrationDate,
  registrationDateBs,
  status,
  title,
  url,
  viewMode = "card",
}: Readonly<CourtCaseCardProps>) {
  const { t, i18n } = useTranslation();
  const isCard = viewMode === "card";
  const language =
    typeof i18n.language === "string" ? i18n.language : "en";
  const courtName = formatCourtName(court, language);
  const registered =
    language.startsWith("ne") && registrationDateBs
      ? registrationDateBs
      : registrationDate || registrationDateBs || "";
  const viewCaseLabel = t("courtCaseDetail.viewCase", "View case");
  const statusBadgeValue = status ? courtStatusBadgeValue(status) : null;
  const courtTier = courtTypeValue(court, courtType);

  return (
    <Link
      aria-label={`${viewCaseLabel}: ${title}`}
      className={cn(
        "group block h-full bg-card shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] ring-1 ring-border/40 transition-[transform,box-shadow,background-color] duration-200 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none",
        courtTypeGradientClass(courtTier),
        isCard
          // The floor used to be 17rem/19rem, which is 272-304px, against a
          // court case whose content measures 150-210px. That left 72-80px of
          // dead air above the "view case" row on every card with no status
          // pill, because `mt-auto` pins that row to a bottom the content never
          // reaches. It does NOT need to be tall to keep the grid tidy: the
          // cards are grid items with `h-full` and the default `stretch`, so
          // every card in a row already matches the tallest one in that row.
          // The floor only has to stop a sparse card collapsing into a stub.
          ? "min-h-[13rem] rounded-2xl p-4 motion-safe:hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(15,23,42,0.35)] sm:rounded-3xl sm:p-5 xl:p-6"
          : "min-h-40 rounded-2xl p-4 hover:bg-muted/20 sm:p-5",
      )}
      to={url}
    >
      <article className="flex h-full min-w-0 flex-col">
        {status ? (
          <div>
            <CaseStatusBadge
              className="max-w-full"
              status={statusBadgeValue}
            >
              <span className="truncate">{displayCourtStatus(status)}</span>
            </CaseStatusBadge>
          </div>
        ) : null}

        <h3
          className={cn(
            "break-words text-pretty font-semibold text-primary",
            status ? "mt-4 sm:mt-5" : "mt-1",
            isCard
              ? "line-clamp-3 text-lg leading-6 sm:text-xl sm:leading-7"
              : "line-clamp-2 text-base leading-5",
          )}
        >
          {title}
        </h3>

        <div
          className={cn(
            "space-y-3 text-sm leading-5 text-muted-foreground",
            isCard ? "mt-5 sm:mt-6" : "mt-5 lg:grid lg:grid-cols-3 lg:gap-5 lg:space-y-0",
          )}
        >
          {caseNumber ? (
            <div className="flex min-w-0 items-center gap-2.5 text-foreground sm:gap-3">
              <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-primary/80" />
              <span className="min-w-0 break-words font-medium [overflow-wrap:anywhere]" translate="no">
                {caseNumber}
              </span>
            </div>
          ) : null}
          {courtName ? (
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <Landmark aria-hidden="true" className="h-5 w-5 shrink-0 text-primary/80" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{courtName}</span>
            </div>
          ) : null}
          {registered ? (
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-primary/80" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                {t("caseDetail.courtRegistered", "Registered")}: {registered}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-end gap-2 pt-5 text-sm font-semibold text-success-strong sm:pt-6">
          {viewCaseLabel}
          <ArrowRight
            aria-hidden="true"
            className="h-5 w-5 transition-transform group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
          />
        </div>
      </article>
    </Link>
  );
}

export function CourtCaseCardSkeleton({
  viewMode = "card",
}: Readonly<{ viewMode?: "card" | "list" }>) {
  const isCard = viewMode === "card";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-full flex-col bg-card shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] ring-1 ring-border/40",
        isCard
          // Tracks the live card's floor (see the note there) so the grid does
          // not jump when the skeleton is swapped out for real results.
          ? "min-h-[13rem] rounded-2xl p-4 sm:rounded-3xl sm:p-5 xl:p-6"
          : "min-h-40 rounded-2xl p-4 sm:p-5",
      )}
      data-court-case-card-skeleton=""
    >
      <Skeleton className="h-7 w-28 rounded-full" />
      <div className="mt-4 space-y-2 sm:mt-5">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
      </div>
      <div
        className={cn(
          "mt-5 space-y-3 sm:mt-6",
          !isCard && "lg:grid lg:grid-cols-3 lg:gap-5 lg:space-y-0",
        )}
      >
        {["w-28", "w-36", "w-40"].map((width) => (
          <div className="flex items-center gap-2.5 sm:gap-3" key={width}>
            <Skeleton className="h-5 w-5 shrink-0 rounded-md" />
            <Skeleton className={cn("h-4", width)} />
          </div>
        ))}
      </div>
      <div className="mt-auto flex justify-end pt-5 sm:pt-6">
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  );
}

interface CourtCaseDetailsProps {
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

export function CourtCaseDetails({ courtCaseId, courtCase, isLoading, linkToDetail }: CourtCaseDetailsProps) {
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
          <div className="font-paragraph flex flex-wrap gap-x-5 gap-y-1 break-words">
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
              <div className="font-paragraph flex flex-wrap gap-x-5 gap-y-1 break-words">
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

          {/* Hearings collapsible — absent on the core shape (case-detail page).
              Expanded by default on the court-case detail page (where the card is
              the whole page, i.e. no linkToDetail); collapsed when embedded as a
              related-case card so a list of cards stays compact. */}
          {(courtCase.hearings?.length ?? 0) > 0 && (
            <Collapsible className="mt-3" defaultOpen={!linkToDetail}>
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
