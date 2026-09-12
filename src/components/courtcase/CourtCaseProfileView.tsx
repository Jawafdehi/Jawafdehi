import { useId, useState } from "react";
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

const INITIAL_VISIBLE_PARTIES = 3;

type PartyRosterProps = {
  names: string[];
  emptyLabel: string;
};

function PartyRoster({ names, emptyLabel }: Readonly<PartyRosterProps>) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const listId = useId();
  const hasMore = names.length > INITIAL_VISIBLE_PARTIES;
  const visibleNames = isExpanded ? names : names.slice(0, INITIAL_VISIBLE_PARTIES);
  if (names.length === 0) {
    return <span className="text-base font-normal text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <div className="min-w-0">
      <ul id={listId} className="text-base font-medium leading-relaxed text-foreground sm:text-lg">
        {visibleNames.map((name, index) => (
          <li key={`${name}-${index}`} className="inline break-words">
            {index > 0 ? ", " : ""}
            <span>{name}</span>
          </li>
        ))}
      </ul>

      {hasMore ? (
        <button
          type="button"
          aria-controls={listId}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className="mt-2 inline-flex min-h-11 items-center rounded-md px-1 text-sm font-medium text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:text-primary/75 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {isExpanded
            ? t("courtCaseProfile.showLess", "Show less")
            : t("courtCaseProfile.showMore", {
                count: names.length - INITIAL_VISIBLE_PARTIES,
                defaultValue: `Show ${names.length - INITIAL_VISIBLE_PARTIES} more`,
              })}
        </button>
      ) : null}
    </div>
  );
}

type PartyPresentationProps = {
  plaintiffs: string[];
  defendants: string[];
};

function PartyPresentation({ plaintiffs, defendants }: Readonly<PartyPresentationProps>) {
  const { t } = useTranslation();
  const plaintiff = (
    <div className="min-w-0">
      <div className="mb-2 text-base font-medium text-muted-foreground sm:text-lg">
        {t("courtCaseProfile.labels.plaintiff", "Plaintiff")}
      </div>
      <PartyRoster
        names={plaintiffs}
        emptyLabel={t("courtCaseProfile.noParties", "No party recorded")}
      />
    </div>
  );
  const defendant = (
    <div className="min-w-0">
      <div className="mb-2 text-base font-medium text-muted-foreground sm:text-lg">
        {t("courtCaseProfile.labels.defendant", "Defendant")}
      </div>
      <PartyRoster
        names={defendants}
        emptyLabel={t("courtCaseProfile.noParties", "No party recorded")}
      />
    </div>
  );

  return <div className="space-y-7">{plaintiff}{defendant}</div>;
}

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

function getActivityBadgeText(
  hearing: CourtCaseHearing,
  translate: (key: string, defaultValue: string) => string,
): string {
  const dec = (hearing.decision_type || "").toLowerCase();
  const status = (hearing.case_status || "").toLowerCase();

  if (dec.includes("अन्तिम") || dec.includes("फैसला") || status.includes("फैसला")) {
    return translate("courtCaseProfile.activity.finalOrder", "Final order");
  }
  if (dec.includes("धरौटी") || dec.includes("थुनछेक")) {
    return translate("courtCaseProfile.activity.bailOrder", "Bail order");
  }
  if (
    dec.includes("स्थगित") ||
    status.includes("स्थगित") ||
    dec.includes("नभ्याउने") ||
    status.includes("नभ्याउने") ||
    dec.includes("हेर्न नमिल्ने") ||
    status.includes("हेर्न नमिल्ने")
  ) {
    return translate("courtCaseProfile.activity.adjourned", "Adjourned");
  }
  if (dec.includes("आदेश") || status.includes("आदेश")) {
    return translate("courtCaseProfile.activity.order", "Order");
  }
  if (hearing.case_status?.trim()) {
    return hearing.case_status.toUpperCase();
  }
  return translate("courtCaseProfile.activity.order", "Order");
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
  const { t, i18n } = useTranslation();

  if (isLoading) {
    return <CourtCaseProfileSkeleton />;
  }

  const language = typeof i18n.language === "string" ? i18n.language : "en";
  const displayTitle = courtCase?.case_type || caseNumber || t("courtCaseProfile.fallbackTitle", "Court case");
  // Language is required, not optional: `formatCourtName` defaults to "en", so
  // omitting it rendered "Kathmandu District Court" on the Nepali site instead
  // of "Kathmandu जिल्ला अदालत".
  const courtName = formatCourtName(
    courtCase?.court_identifier || courtIdentifier,
    language,
  );

  // Court records are Nepal-first regardless of the interface language. Passing
  // "ne" makes the BS date primary and leaves AD as a parenthesised reference.
  const registered = courtCase?.registration_date_ad
    ? formatDateForLanguage(
        courtCase.registration_date_ad,
        "PP",
        courtCase.registration_date_bs,
        "ne",
      )
    : null;

  const decision = courtCase?.verdict_date_ad
    ? formatDateForLanguage(
        courtCase.verdict_date_ad,
        "PP",
        courtCase.verdict_date_bs,
        "ne",
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
      <section id="case-summary" aria-labelledby="case-summary-heading" className="scroll-mt-28">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 id="case-summary-heading" className="font-page-title max-w-4xl text-pretty">
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

        <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {t("courtCaseProfile.summary", "Case summary")}
        </h2>

        <div className="mt-7 space-y-4 text-base">
          <div className="flex items-start gap-4">
            <div className="flex w-40 shrink-0 items-center gap-2.5 pt-0.5 text-sm text-muted-foreground sm:w-48 sm:text-base">
              <IdCard className="h-[1.125rem] w-[1.125rem] shrink-0 text-muted-foreground/80" aria-hidden="true" />
              <span>{t("courtCaseProfile.labels.caseNumber", "Case number")}</span>
            </div>
            <div className="min-w-0 break-words text-base font-semibold text-foreground sm:text-lg" translate="no">
              {caseNumber}
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex w-40 shrink-0 items-center gap-2.5 pt-0.5 text-sm text-muted-foreground sm:w-48 sm:text-base">
              <Landmark className="h-[1.125rem] w-[1.125rem] shrink-0 text-muted-foreground/80" aria-hidden="true" />
              <span>{t("courtCaseProfile.labels.court", "Court")}</span>
            </div>
            <div className="min-w-0 break-words text-base font-medium text-foreground sm:text-lg">
              {courtName}
            </div>
          </div>

          {registered ? (
            <div className="flex items-start gap-4">
              <div className="flex w-40 shrink-0 items-center gap-2.5 pt-0.5 text-sm text-muted-foreground sm:w-48 sm:text-base">
                <CalendarCheck className="h-[1.125rem] w-[1.125rem] shrink-0 text-muted-foreground/80" aria-hidden="true" />
                <span>{t("courtCaseProfile.labels.registered", "Registered")}</span>
              </div>
              <div className="min-w-0 break-words text-base font-medium text-foreground sm:text-lg">
                {registered.primary}
                {registered.secondary ? ` (${registered.secondary})` : ""}
              </div>
            </div>
          ) : null}

          {decision ? (
            <div className="flex items-start gap-4">
              <div className="flex w-40 shrink-0 items-center gap-2.5 pt-0.5 text-sm text-muted-foreground sm:w-48 sm:text-base">
                <CalendarDays className="h-[1.125rem] w-[1.125rem] shrink-0 text-muted-foreground/80" aria-hidden="true" />
                <span>{t("courtCaseProfile.labels.decisionDate", "Decision date")}</span>
              </div>
              <div className="min-w-0 break-words text-base font-medium text-foreground sm:text-lg">
                {decision.primary}
                {decision.secondary ? ` (${decision.secondary})` : ""}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section id="parties" aria-labelledby="parties-heading" className="scroll-mt-28">
        <h2
          id="parties-heading"
          className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          {t("courtCaseProfile.parties", "Parties")}
        </h2>

        <div className="mt-7">
          <PartyPresentation plaintiffs={plaintiffs} defendants={defendants} />
        </div>
      </section>

      <section id="activity" aria-labelledby="activity-heading" className="scroll-mt-28">
        <h2
          id="activity-heading"
          className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          {t("courtCaseProfile.activity.heading", "Case activity")}
        </h2>

        {hearings.length > 0 ? (
          <div className="relative mt-7 pl-1">
            {hearings.map((hearing, idx) => {
              const badgeText = getActivityBadgeText(hearing, t);
              const dateAd = hearing.hearing_date_ad
                ? formatDate(hearing.hearing_date_ad, "PP")
                : "—";
              const dateBs =
                formatBSString(hearing.hearing_date_bs) ||
                (hearing.hearing_date_ad
                  ? convertToBS(hearing.hearing_date_ad)?.formatted
                  : null);
              const primaryDate = dateBs || dateAd;
              const secondaryDate = dateBs ? dateAd : null;
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
                        {primaryDate}
                      </div>
                      {secondaryDate && (
                        <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          {secondaryDate}
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
                            {t("courtCaseProfile.activity.judge", "Judge")}
                          </div>
                          <div className="text-base sm:text-lg font-medium text-foreground mt-0.5 whitespace-pre-line leading-relaxed">
                            {hearing.judge_names}
                          </div>
                        </div>
                      )}

                      {hearing.decision_type && (
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                            {t("courtCaseProfile.activity.order", "Order")}
                          </div>
                          <div className="text-base sm:text-lg font-medium text-foreground mt-0.5 leading-relaxed">
                            {hearing.decision_type}
                          </div>
                        </div>
                      )}

                      {hearing.remarks && (
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                            {t("courtCaseProfile.activity.remarks", "Remarks")}
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
            {t("courtCaseProfile.activity.empty", "No hearings or activity recorded yet for this court case.")}
          </p>
        )}
      </section>

      <section id="source" aria-labelledby="source-heading" className="scroll-mt-28">
        <h2
          id="source-heading"
          className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          {t("courtCaseProfile.source.heading", "Source")}
        </h2>

        <div className="flex flex-col gap-3 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              {t("courtCaseProfile.source.title", "Jawafdehi Governance Archive")}
            </h3>
            <p className="mt-1 max-w-lg text-sm sm:text-base leading-relaxed text-muted-foreground">
              {t("courtCaseProfile.source.description", "Court listings, hearings and orders harvested from Nepal's public court records.")}
            </p>
          </div>

          {sourceUrl ? (
            <Link
              to={sourceUrl}
              className="inline-flex items-center gap-1.5 text-sm sm:text-base font-medium text-foreground hover:text-primary transition-colors shrink-0"
            >
              <span>{t("courtCaseProfile.source.view", "View source")}</span>
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
