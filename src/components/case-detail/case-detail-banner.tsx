import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, Share2 } from "lucide-react";
import { CaseStatusBadge, CaseTagBadge, CaseTypeBadge } from "@/components/CaseBadge";
import { Button } from "@/components/ui/button";
import { deriveCaseStatus, getCaseStatusLabelKey } from "@/lib/case-badges";
import { CASE_PLACEHOLDER_DARK_CLASS } from "@/lib/case-images";
import { useCaseImage } from "@/lib/use-case-image";
import { cn } from "@/lib/utils";
import { entityPath } from "@/lib/entity-links";
import type { CaseDetail, JawafEntity } from "@/types/jds";
import type { Entity } from "@/types/entity";
import { caseStages } from "@/utils/case-stages";
import { getPrimaryName } from "@/utils/entity-helpers";
import { parseCourtCaseRef } from "@/utils/courtCaseRef";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { formatBigo } from "@/utils/number";
import { getCaseTypeLabelKey } from "@/utils/case-entities";
import { CaseByline } from "@/components/case-detail/case-byline";
import { CaseStageDates } from "@/components/case-detail/case-stage-dates";
import "./case-dossier.css";

interface CaseDetailBannerProps {
  caseData: CaseDetail;
  resolvedEntities: Record<string, Entity>;
  homeLabel?: string;
  casesLabel?: string;
  actions?: ReactNode;
  shareAction?: {
    label: string;
    onClick: () => void;
  };
}

const COURT_NAME_MAP: Record<string, { en: string; ne: string }> = {
  supreme: {
    en: "Supreme Court",
    ne: "सर्वोच्च अदालत",
  },
  special: {
    en: "Special Court",
    ne: "विशेष अदालत",
  },
};

function formatCourtCaseRef(courtCase: string, language: "en" | "ne") {
  // Refs arrive as the canonical @id IRI or the legacy `<court>:<number>` form.
  const parts = parseCourtCaseRef(courtCase);

  if (!parts) return null;

  const courtId = parts.court.toLowerCase();
  // IRIs carry the number lowercased; display it in its natural uppercase.
  const caseNumber = parts.caseNumber.toUpperCase();

  const courtName = COURT_NAME_MAP[courtId]?.[language] || courtId;

  return {
    courtId,
    courtName,
    caseNumber,
    href: `/courtcase/${courtId}/${encodeURIComponent(parts.caseNumber)}`,
    label: `${caseNumber} (${courtName})`,
  };
}

export function CaseDetailBanner({
  caseData,
  resolvedEntities,
  homeLabel,
  casesLabel,
  actions,
  shareAction,
}: CaseDetailBannerProps) {
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language;
  const normalizedLang = currentLang === "ne" ? "ne" : "en";
  const title = caseData.title;
  const titleLength = title.trim().length;
  const titleSizeClass =
    titleLength > 110
      ? "text-xl leading-snug sm:text-2xl md:text-3xl"
      : titleLength > 80
        ? "text-2xl leading-snug sm:text-3xl md:text-3xl"
        : "text-2xl sm:text-3xl md:text-4xl";

  // The hero image in preference order — the uploaded rendition ladder first,
  // then the deprecated banner/thumbnail URLs, then the placeholder — walking
  // the list on load error rather than jumping straight to the placeholder: a
  // case whose banner_url points at an article page should still get to try its
  // thumbnail before giving up. Shared with the card so the two cannot drift.
  const {
    src: imageSrc,
    srcSet,
    isPlaceholder,
    onError: advanceImage,
  } = useCaseImage(caseData.banner, [caseData.banner_url, caseData.thumbnail_url]);
  // The lifecycle is derived server-side and served as `status`; only our own
  // DRAFT/IN_REVIEW workflow states override it.
  const effectiveStatus = deriveCaseStatus(caseData.state, caseData.status);
  const statusLabel = t(getCaseStatusLabelKey(effectiveStatus));
  // A known case type localizes; an unknown/scraped one humanizes its raw value
  // rather than mislabelling (getCaseTypeLabelKey returns null when unknown).
  // `case_type` renamed to `offence_type`; both are served this release.
  const offenceType = caseData.offence_type || caseData.case_type;
  const caseTypeLabelKey = getCaseTypeLabelKey(offenceType);
  const caseTypeLabel = caseTypeLabelKey
    ? t(caseTypeLabelKey)
    : (offenceType || "").replaceAll("_", " ").replaceAll("-", " ");

  const stages = caseStages(caseData.dates);

  const notAvailableLabel = t("common.notAvailable");

  const locationEntities = useMemo(
    () => caseData.entities.filter((entity) => entity.type === "location"),
    [caseData.entities]
  );

  const formattedCourtCases = useMemo(() => {
    if (!caseData.court_cases?.length) return [];

    return caseData.court_cases
      .map((courtCase) => formatCourtCaseRef(courtCase, normalizedLang))
      .filter((courtCase): courtCase is NonNullable<ReturnType<typeof formatCourtCaseRef>> => Boolean(courtCase));
  }, [caseData.court_cases, normalizedLang]);

  // Prefer a linked court-case number, then the human-readable slug. Never fall
  // back to the raw DB primary key — that would leak an internal id into the
  // public breadcrumb (e.g. "jawafdehi.org / case / 11"). A published case always
  // has a slug; the generic label is a defensive last resort only.
  const breadcrumbCase =
    formattedCourtCases[0]?.caseNumber ||
    caseData.slug ||
    t("caseDetail.breadcrumbFallback", "Case");

  const getEntityDisplayName = (caseEntity: JawafEntity) => {
    const entity = caseEntity.nes_id
      ? resolvedEntities[caseEntity.nes_id]
      : null;

    const fallbackLang = normalizedLang === "ne" ? "en" : "ne";

    const displayName =
      (entity
        ? getPrimaryName(entity.names, normalizedLang) ||
        getPrimaryName(entity.names, fallbackLang)
        : "") ||
      caseEntity.display_name ||
      caseEntity.nes_id ||
      "Unknown";

    return translateDynamicText(displayName, currentLang);
  };

  const metaTitleClass = "mb-1 text-sm font-semibold leading-5 text-primary/60";
  const metaValueClass = "text-sm font-medium leading-6 text-primary md:text-base";
  const metaLinkClass =
    "font-semibold text-primary underline underline-offset-4 transition-colors hover:text-primary/80";

  return (
    <section className="w-full text-foreground no-print">
      {/* A contained, standalone photograph lets the title remain consistently
          readable even when a caseworker replaces the image with a light or
          high-contrast source. */}
      <div
        className="mx-auto w-full max-w-[1400px] px-6 pt-6 sm:px-12 lg:pl-24 lg:pr-10 min-[1536px]:pl-8"
        data-testid="case-detail-hero"
      >
        <img
          src={imageSrc}
          srcSet={srcSet}
          // The hero is capped at the same width as the page container, so do
          // not request a viewport-wide source on large displays.
          sizes="(min-width: 1400px) 1400px, 100vw"
          // The placeholder illustration says nothing about this case, so it
          // stays out of the accessibility tree instead of announcing a hero
          // image that does not exist. Same rule as CaseCard.
          alt={isPlaceholder ? "" : title}
          // The hero is the largest thing above the fold, so it is the LCP
          // element on this page: fetch it eagerly and at high priority rather
          // than letting it queue behind the rest.
          loading="eager"
          // Lowercase, via a spread. React only learned the camelCase
          // `fetchPriority` prop in 19; on 18 it warns "React does not
          // recognize the fetchPriority prop" and DROPS the attribute, so the
          // hint above never reached the DOM at all. React does pass an unknown
          // all-lowercase attribute straight through. Collapse this back to
          // `fetchPriority="high"` when the app is on React 19.
          {...{ fetchpriority: "high" }}
          decoding="async"
          onError={advanceImage}
          width={1400}
          height={788}
          className={cn(
            "block h-auto w-full rounded-lg object-contain",
            isPlaceholder && CASE_PLACEHOLDER_DARK_CLASS,
          )}
          data-testid="case-detail-hero-image"
        />
      </div>

      {/* The metadata shares the hero's centered page-width column. Its desktop
          inset clears the floating share rail until the container has its own
          wide-screen gutter. */}
      <div
        className="mx-auto w-full max-w-[1400px] px-0 sm:px-6 lg:px-0"
        data-testid="case-detail-metadata"
      >
        <div className="grid grid-cols-1">
          <div className="relative z-10 flex flex-col justify-center">
            <div className="px-6 py-6 text-sm lg:px-10 lg:py-7 lg:pl-24 min-[1536px]:pl-8">
              <nav
                aria-label="breadcrumb"
                className="mb-3 flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground"
              >
                <Link to="/" className="shrink-0 transition-colors hover:text-foreground">
                  {homeLabel || t("nav.home")}
                </Link>

                <span className="shrink-0 opacity-50">/</span>

                <Link to="/cases" className="shrink-0 transition-colors hover:text-foreground">
                  {casesLabel || t("nav.cases")}
                </Link>

                <span className="shrink-0 opacity-50">/</span>

                <span className="min-w-0 truncate opacity-90">{breadcrumbCase}</span>
              </nav>

              <h1
                className={cn(
                  "mb-6 w-full break-words font-bold tracking-tight text-foreground",
                  titleSizeClass,
                )}
              >
                {title}
              </h1>

              <div className="mb-5 flex flex-wrap items-center gap-2">
                <CaseStatusBadge status={effectiveStatus}>
                  {statusLabel}
                </CaseStatusBadge>

                {caseTypeLabel ? (
                  <CaseTypeBadge caseType={offenceType}>
                    {caseTypeLabel}
                  </CaseTypeBadge>
                ) : null}

                {caseData.tags.map((tag) => (
                  <CaseTagBadge key={tag}>
                    {translateDynamicText(tag, currentLang)}
                  </CaseTagBadge>
                ))}
              </div>

              {/* Short description as a lead/deck under the status badge — the
                  one-line "what is this case" summary at the top of the page.
                  Authored content, rendered as-is (like the title/description),
                  not run through the dynamic-text map. */}
              {caseData.short_description?.trim() ? (
                <p className="mb-5 w-full break-words text-base font-medium leading-relaxed text-primary/80 md:text-lg">
                  {caseData.short_description}
                </p>
              ) : null}

              <div className="case-dossier">
                <div className="case-dossier-main" data-testid="case-dossier-main">
                  <div className="case-dossier-facts">
                  <div>
                    <p className={metaTitleClass}>{t("caseDetail.location")}:</p>

                    <div className={cn(metaValueClass, "flex flex-wrap gap-x-3 gap-y-1")}>
                      {locationEntities.length > 0
                        ? locationEntities.map((entity, index) => {
                          // Entities are keyed/linked by their NES @id IRI; id-less
                          // binds render as plain text (no profile to link to).
                          const key = entity.nes_id ?? `${entity.display_name ?? "location"}-${index}`;
                          const to = entityPath(entity.nes_id);

                          return (
                            <span key={key}>
                              {to ? (
                                <Link to={to} className={metaLinkClass}>
                                  {getEntityDisplayName(entity)}
                                </Link>
                              ) : (
                                <span>{getEntityDisplayName(entity)}</span>
                              )}
                            </span>
                          );
                        })
                        : notAvailableLabel}
                    </div>
                  </div>

                  {/* One labelled row per stage. The single "मुद्दा मिति /
                      Case date" range this replaces read to the public as when
                      the corruption happened; these are court registration and
                      verdict dates, and there is one pair per forum. */}
                  <CaseStageDates stages={stages} language={currentLang} />

                  {caseData.bigo != null && caseData.bigo > 0 && (
                    <div>
                      <p className={metaTitleClass}>
                        {t("caseDetail.embezzledAmount")}:
                      </p>
                      <p className="text-sm font-semibold leading-6 text-accent md:text-base">
                        {formatBigo(caseData.bigo)}
                      </p>
                    </div>
                  )}

                  </div>
                  {formattedCourtCases.length > 0 && (
                    <div className="min-w-0">
                      <p className={metaTitleClass}>
                        {t("caseDetail.courtCases")}:
                      </p>
                      <div className="case-dossier-courts mt-3">
                        {formattedCourtCases.map((courtCase) => (
                          <Link
                            key={courtCase.label}
                            to={courtCase.href}
                            aria-label={courtCase.label}
                            className="group flex min-w-0 items-center justify-between gap-3 rounded-xl bg-muted/50 px-3.5 py-3 text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <span className="min-w-0">
                              <span className="block break-words text-sm font-semibold leading-5 group-hover:underline group-hover:underline-offset-4">{courtCase.caseNumber}</span>
                              <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground">{courtCase.courtName}</span>
                            </span>
                            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
              {actions || shareAction ? (
                <div className="flex flex-wrap items-center gap-3 no-print">
                  {actions}
                  {shareAction && (
                    <Button
                      type="button"
                      variant="outline"
                      className="hidden gap-2 border-primary/20 bg-background text-primary hover:bg-primary-surface/5 hover:text-primary sm:inline-flex"
                      onClick={shareAction.onClick}
                      aria-label={shareAction.label}
                    >
                      <Share2 className="h-4 w-4" aria-hidden="true" />
                      <span className="font-semibold">{shareAction.label}</span>
                    </Button>
                  )}
                </div>
              ) : null}
                </div>
                <div className="case-dossier-sidebar" data-testid="case-dossier-sidebar">
                  <CaseByline
                    authors={caseData.authors}
                    publishDate={caseData.case_publish_date}
                    editHistory={caseData.public_edit_history}
                    markdown={caseData.public_notes}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
