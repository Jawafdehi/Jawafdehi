import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CalendarCheck,
  CalendarDays,
  ExternalLink,
  IdCard,
  Landmark,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CaseStatusBadge } from "@/components/CaseBadge";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourtCase, CourtCaseHearing } from "@/types/jds";
import { formatDateForLanguage, formatDate, convertToBS } from "@/utils/date";
import { formatBSString } from "@/utils/bs-calendar";
import { formatCourtName, courtStatusBadgeValue } from "@/utils/court-case-format";

// ── Parties Helper ───────────────────────────────────────────────────────

function getParties(courtCase?: CourtCase) {
  const plaintiffs: string[] = [];
  const defendants: string[] = [];

  if (!courtCase) return { plaintiffs, defendants };

  for (const entity of courtCase.entities ?? []) {
    const side = entity.side?.toLowerCase();
    if (side === "plaintiff" || side === "वादी") {
      plaintiffs.push(entity.name);
    } else if (side === "defendant" || side === "प्रतिवादी") {
      defendants.push(entity.name);
    }
  }

  if (plaintiffs.length === 0 && courtCase.plaintiff) {
    plaintiffs.push(courtCase.plaintiff);
  }
  if (defendants.length === 0 && courtCase.defendant) {
    defendants.push(courtCase.defendant);
  }

  return { plaintiffs, defendants };
}

// ── Activity Badge Helper ────────────────────────────────────────────────

function getActivityBadgeText(hearing: CourtCaseHearing): string {
  const dec = (hearing.decision_type || "").toLowerCase();
  const status = (hearing.case_status || "").toLowerCase();

  if (dec.includes("अन्तिम") || dec.includes("फैसला") || status.includes("फैसला")) {
    return "FINAL ORDER";
  }
  if (dec.includes("धरौटी") || dec.includes("थुनछेक")) {
    return "BAIL ORDER";
  }
  if (
    dec.includes("स्थगित") ||
    status.includes("स्थगित") ||
    dec.includes("नभ्याउने") ||
    status.includes("नभ्याउने") ||
    dec.includes("हेर्न नमिल्ने") ||
    status.includes("हेर्न नमिल्ने")
  ) {
    return "ADJOURNED";
  }
  if (dec.includes("आदेश") || status.includes("आदेश")) {
    return "ORDER";
  }
  if (hearing.case_status?.trim()) {
    return hearing.case_status.toUpperCase();
  }
  return "ORDER";
}

// ── Component Props ──────────────────────────────────────────────────────

export interface CourtCaseProfileViewProps {
  courtCase?: CourtCase;
  caseNumber: string;
  courtIdentifier: string;
  isLoading: boolean;
}

export function CourtCaseProfileView({
  courtCase,
  caseNumber,
  courtIdentifier,
  isLoading,
}: Readonly<CourtCaseProfileViewProps>) {
  // Ahead of the isLoading early return: a hook must not sit behind a branch.
  const { i18n } = useTranslation();

  if (isLoading) {
    return <CourtCaseProfileSkeleton />;
  }

  const language = typeof i18n.language === "string" ? i18n.language : "en";
  const displayTitle = courtCase?.case_type || caseNumber || "Court case";
  // Language is required, not optional: `formatCourtName` defaults to "en", so
  // omitting it rendered "Kathmandu District Court" on the Nepali site instead
  // of "Kathmandu जिल्ला अदालत".
  const courtName = formatCourtName(
    courtCase?.court_identifier || courtIdentifier,
    language,
  );

  // `formatDateForLanguage`, not `formatDateWithBS`: the latter always emits
  // "AD | BS" in that order, which puts the Gregorian date first on a
  // Nepali-first page. This returns the active language's calendar as
  // `primary` with the other as `secondary`, matching how case-byline renders
  // the same pair.
  const registered = courtCase?.registration_date_ad
    ? formatDateForLanguage(
        courtCase.registration_date_ad,
        "PP",
        courtCase.registration_date_bs,
        language,
      )
    : null;

  const decision = courtCase?.verdict_date_ad
    ? formatDateForLanguage(
        courtCase.verdict_date_ad,
        "PP",
        courtCase.verdict_date_bs,
        language,
      )
    : null;

  const { plaintiffs, defendants } = getParties(courtCase);

  const hearings = [...(courtCase?.hearings ?? [])].sort((a, b) => {
    if (!a.hearing_date_ad && !b.hearing_date_ad) return 0;
    if (!a.hearing_date_ad) return 1;
    if (!b.hearing_date_ad) return -1;
    return b.hearing_date_ad.localeCompare(a.hearing_date_ad);
  });

  const sourceUrl = courtCase?.material_id
    ? courtCase.material_id.includes("/material/")
      ? courtCase.material_id.slice(courtCase.material_id.indexOf("/material/"))
      : courtCase.material_id
    : null;

  return (
    <article className="space-y-10 text-foreground">
      {/* ── Top Header: Title + Status Pill ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-page-title text-pretty">
          {displayTitle}
        </h1>

        {courtCase?.case_status ? (
          <div className="shrink-0 pt-1">
            <CaseStatusBadge status={courtStatusBadgeValue(courtCase.case_status)}>
              {courtCase.case_status}
            </CaseStatusBadge>
          </div>
        ) : null}
      </div>

      {/* ── Metadata Key-Value List ── */}
      <div className="space-y-4 text-base">
        {/* Case number */}
        <div className="flex items-start gap-4">
          <div className="flex w-40 sm:w-48 items-center gap-2.5 text-muted-foreground shrink-0 pt-0.5 text-sm sm:text-base">
            <IdCard className="h-[1.125rem] w-[1.125rem] text-muted-foreground/80 shrink-0" aria-hidden="true" />
            <span>Case number</span>
          </div>
          <div className="text-base sm:text-lg font-semibold text-foreground min-w-0 break-words" translate="no">
            {caseNumber}
          </div>
        </div>

        {/* Court */}
        <div className="flex items-start gap-4">
          <div className="flex w-40 sm:w-48 items-center gap-2.5 text-muted-foreground shrink-0 pt-0.5 text-sm sm:text-base">
            <Landmark className="h-[1.125rem] w-[1.125rem] text-muted-foreground/80 shrink-0" aria-hidden="true" />
            <span>Court</span>
          </div>
          <div className="text-base sm:text-lg font-medium text-foreground min-w-0 break-words">
            {courtName}
          </div>
        </div>

        {/* Registered */}
        {registered && (
          <div className="flex items-start gap-4">
            <div className="flex w-40 sm:w-48 items-center gap-2.5 text-muted-foreground shrink-0 pt-0.5 text-sm sm:text-base">
              <CalendarCheck className="h-[1.125rem] w-[1.125rem] text-muted-foreground/80 shrink-0" aria-hidden="true" />
              <span>Registered</span>
            </div>
            <div className="text-base sm:text-lg font-medium text-foreground min-w-0 break-words">
              {registered.primary}
              {registered.secondary ? ` (${registered.secondary})` : ""}
            </div>
          </div>
        )}

        {/* Decision date (if available) */}
        {decision && (
          <div className="flex items-start gap-4">
            <div className="flex w-40 sm:w-48 items-center gap-2.5 text-muted-foreground shrink-0 pt-0.5 text-sm sm:text-base">
              <CalendarDays className="h-[1.125rem] w-[1.125rem] text-muted-foreground/80 shrink-0" aria-hidden="true" />
              <span>Decision date</span>
            </div>
            <div className="text-base sm:text-lg font-medium text-foreground min-w-0 break-words">
              {decision.primary}
              {decision.secondary ? ` (${decision.secondary})` : ""}
            </div>
          </div>
        )}
      </div>

      {/* ── PARTIES Section ── */}
      <section aria-labelledby="parties-heading" className="pt-3">
        <h2
          id="parties-heading"
          className="font-eyebrow font-eyebrow-display text-muted-foreground uppercase mb-4"
        >
          Parties
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6">
          {/* Plaintiff */}
          <div>
            <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
              Plaintiff
            </div>
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-snug break-words">
              {plaintiffs.length > 0 ? (
                plaintiffs.map((name, i) => (
                  <div key={i} className={i > 0 ? "mt-1.5 text-base sm:text-lg font-medium" : ""}>
                    {name}
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground font-normal text-base">—</span>
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex justify-center my-1 md:my-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/80 text-xs font-semibold text-muted-foreground ring-1 ring-border/60">
              VS
            </div>
          </div>

          {/* Defendant */}
          <div>
            <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
              Defendant
            </div>
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-snug break-words">
              {defendants.length > 0 ? (
                defendants.map((name, i) => (
                  <div key={i} className={i > 0 ? "mt-1.5 text-base sm:text-lg font-medium" : ""}>
                    {name}
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground font-normal text-base">—</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── CASE ACTIVITY Section ── */}
      <section aria-labelledby="activity-heading" className="pt-3">
        <h2
          id="activity-heading"
          className="font-eyebrow font-eyebrow-display text-muted-foreground uppercase mb-6"
        >
          Case Activity
        </h2>

        {hearings.length > 0 ? (
          <div className="relative pl-1">
            {hearings.map((hearing, idx) => {
              const badgeText = getActivityBadgeText(hearing);
              const dateAd = hearing.hearing_date_ad
                ? formatDate(hearing.hearing_date_ad, "PP")
                : "—";
              const dateBs =
                formatBSString(hearing.hearing_date_bs) ||
                (hearing.hearing_date_ad
                  ? convertToBS(hearing.hearing_date_ad)?.formatted
                  : null);
              const isLast = idx === hearings.length - 1;

              return (
                <div key={hearing.id ?? idx} className="relative flex gap-5 pb-8 last:pb-2">
                  {/* Vertical connecting timeline line */}
                  {!isLast && (
                    <div
                      className="absolute left-[5px] top-3 bottom-0 w-[2px] bg-border/60"
                      aria-hidden="true"
                    />
                  )}

                  {/* Dot */}
                  <div className="relative z-10 mt-1.5 flex h-3 w-3 shrink-0 items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-success-strong ring-4 ring-background" />
                  </div>

                  {/* Hearing Content: Date + Activity card */}
                  <div className="flex flex-1 flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 min-w-0">
                    {/* Date Block */}
                    <div className="w-40 shrink-0">
                      <div className="text-base sm:text-lg font-semibold text-foreground">
                        {dateAd}
                      </div>
                      {dateBs && (
                        <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          {dateBs}
                        </div>
                      )}
                    </div>

                    {/* Order & Judge Details */}
                    <div className="flex-1 min-w-0 space-y-3.5">
                      <div>
                        <Badge
                          variant="accent"
                          className="border-accent/20 text-xs font-semibold uppercase tracking-wide"
                        >
                          {badgeText}
                        </Badge>
                      </div>

                      {hearing.judge_names && (
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                            Judge
                          </div>
                          <div className="text-base sm:text-lg font-medium text-foreground mt-0.5 whitespace-pre-line leading-relaxed">
                            {hearing.judge_names}
                          </div>
                        </div>
                      )}

                      {hearing.decision_type && (
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                            Order
                          </div>
                          <div className="text-base sm:text-lg font-medium text-foreground mt-0.5 leading-relaxed">
                            {hearing.decision_type}
                          </div>
                        </div>
                      )}

                      {hearing.remarks && (
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                            Remarks
                          </div>
                          <div className="text-sm sm:text-base text-muted-foreground mt-0.5 leading-relaxed">
                            {hearing.remarks}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm sm:text-base text-muted-foreground">
            No hearings or activity recorded yet for this court case.
          </p>
        )}
      </section>

      {/* ── SOURCE Section ── */}
      <section aria-labelledby="source-heading" className="pt-3">
        <h2
          id="source-heading"
          className="font-eyebrow font-eyebrow-display text-muted-foreground uppercase mb-3"
        >
          Source
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              Jawafdehi Governance Archive
            </h3>
            <p className="mt-1 max-w-lg text-sm sm:text-base leading-relaxed text-muted-foreground">
              Court listings, hearings and orders harvested from Nepal&apos;s public court records.
            </p>
          </div>

          {sourceUrl ? (
            <Link
              to={sourceUrl}
              className="inline-flex items-center gap-1.5 text-sm sm:text-base font-medium text-foreground hover:text-primary transition-colors shrink-0"
            >
              <span>View source</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </section>
    </article>
  );
}

export function CourtCaseProfileSkeleton() {
  return (
    <div className="space-y-12" data-testid="court-case-skeleton">
      {/* Title & Status badge */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Skeleton className="h-10 w-3/4 max-w-md sm:h-12" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Metadata Rows */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex w-40 sm:w-48 items-center gap-2.5">
              <Skeleton className="h-[1.125rem] w-[1.125rem] rounded-sm" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-52" />
          </div>
        ))}
      </div>

      {/* Parties */}
      <div className="space-y-4 pt-3">
        <Skeleton className="h-3.5 w-20" />
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-7 w-3/4" />
          </div>
          <div className="flex justify-center">
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-7 w-3/4" />
          </div>
        </div>
      </div>

      {/* Case Activity */}
      <div className="space-y-6 pt-3">
        <Skeleton className="h-3.5 w-28" />
        <div className="flex gap-5">
          <Skeleton className="h-3 w-3 rounded-full mt-1.5" />
          <div className="flex flex-1 flex-col sm:flex-row gap-4 sm:gap-8">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2.5 flex-1">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-64" />
            </div>
          </div>
        </div>
      </div>

      {/* Source */}
      <div className="space-y-3 pt-3">
        <Skeleton className="h-3.5 w-16" />
        <div className="flex justify-between items-center">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}
