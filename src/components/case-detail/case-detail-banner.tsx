import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, Share2 } from "@/components/icons";
import { CaseTagBadge, CaseTypeBadge } from "@/components/CaseBadge";
import { Button } from "@/components/ui/button";
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
  // Long Nepali titles run to three lines; the display size steps down with
  // length so a 140-character title is not a wall at 56px.
  const titleSizeClass =
    titleLength > 110
      ? "text-[1.75rem] sm:text-4xl lg:text-[2.5rem]"
      : titleLength > 70
        ? "text-[2rem] sm:text-[2.5rem] lg:text-5xl"
        : "text-4xl sm:text-5xl lg:text-[3.5rem]";

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

  const factLabelClass = "text-[15px] leading-6 text-muted-foreground";
  const factValueClass = "text-base leading-7 text-primary";
  const factLinkClass =
    "text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary";

  return (
    <section className="w-full text-foreground no-print">
      {/* The light hero every page now opens with: the trail, the case's type
          and tags as pills, the title in the display face, its one-line deck
          and the actions on the left; the case's picture as a framed card on
          the right. On a phone the picture follows the words. */}
      <div className="layout-container pt-8 md:pt-12 lg:pl-24 min-[1536px]:pl-8">
        <nav aria-label="breadcrumb" className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="shrink-0 rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {homeLabel || t("nav.home")}
          </Link>
          <span aria-hidden="true" className="shrink-0 opacity-50">/</span>
          <Link to="/search?type=case" className="shrink-0 rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {casesLabel || t("nav.cases")}
          </Link>
          <span aria-hidden="true" className="shrink-0 opacity-50">/</span>
          <span className="min-w-0 truncate text-primary/80">{breadcrumbCase}</span>
        </nav>

        <div className="mt-6 grid grid-cols-1 items-start gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {caseTypeLabel ? <CaseTypeBadge caseType={offenceType}>{caseTypeLabel}</CaseTypeBadge> : null}
              {caseData.tags.map((tag) => (
                <CaseTagBadge key={tag}>{translateDynamicText(tag, currentLang)}</CaseTagBadge>
              ))}
            </div>

            <h1
              className={cn(
                "font-home-display mt-5 w-full text-balance break-words text-primary [:root[lang=en]_&]:leading-[1.08]",
                titleSizeClass,
              )}
            >
              {title}
            </h1>

            {/* The short description: the one-line "what is this case" deck.
                Authored content, rendered as-is; a placeholder with no letters
                or digits in it (some cases carry a lone ".") is not a deck. */}
            {/[\p{L}\p{N}]/u.test(caseData.short_description ?? "") ? (
              <p className="mt-5 max-w-2xl break-words text-lg leading-8 text-muted-foreground">
                {caseData.short_description}
              </p>
            ) : null}

            {actions || shareAction ? (
              <div className="no-print mt-7 flex flex-wrap items-center gap-3 [&_a]:rounded-full [&_button]:rounded-full">
                {actions}
                {shareAction && (
                  <Button
                    type="button"
                    variant="outline"
                    className="hidden gap-2 border-border bg-background text-primary hover:bg-muted hover:text-primary active:scale-[0.97] sm:inline-flex"
                    onClick={shareAction.onClick}
                    aria-label={shareAction.label}
                  >
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                    <span>{shareAction.label}</span>
                  </Button>
                )}
              </div>
            ) : null}
          </div>

          <div className="min-w-0" data-testid="case-detail-hero">
            <img
              src={imageSrc}
              srcSet={srcSet}
              sizes="(min-width: 1024px) 30rem, 100vw"
              alt={isPlaceholder ? "" : title}
              loading="eager"
              {...{ fetchpriority: "high" }}
              decoding="async"
              onError={advanceImage}
              width={1400}
              height={788}
              className={cn(
                "block aspect-[16/9] h-auto w-full rounded-[20px] border border-border/70 object-cover",
                isPlaceholder && CASE_PLACEHOLDER_DARK_CLASS,
              )}
              data-testid="case-detail-hero-image"
            />
          </div>
        </div>
      </div>

      {/* The record: a hairline card of facts (where, how much, the court
          stages, the court files) beside who documented it. */}
      <div className="layout-container mt-10 md:mt-12 lg:pl-24 min-[1536px]:pl-8" data-testid="case-detail-metadata">
        <div className="case-dossier rounded-[24px] border border-border/70 bg-surface p-5 sm:p-7 lg:p-8">
          <div className="case-dossier-main" data-testid="case-dossier-main">
            <dl className="case-dossier-facts">
              <div>
                <dt className={factLabelClass}>{t("caseDetail.location")}</dt>
                <dd className={cn(factValueClass, "flex flex-wrap gap-x-3 gap-y-1")}>
                  {locationEntities.length > 0
                    ? locationEntities.map((entity, index) => {
                        const key = entity.nes_id ?? `${entity.display_name ?? "location"}-${index}`;
                        const to = entityPath(entity.nes_id);
                        return (
                          <span key={key}>
                            {to ? (
                              <Link to={to} className={factLinkClass}>
                                {getEntityDisplayName(entity)}
                              </Link>
                            ) : (
                              <span>{getEntityDisplayName(entity)}</span>
                            )}
                          </span>
                        );
                      })
                    : notAvailableLabel}
                </dd>
              </div>

              {caseData.bigo != null && caseData.bigo > 0 && (
                <div>
                  <dt className={factLabelClass}>{t("caseDetail.embezzledAmount")}</dt>
                  <dd className="font-mono text-base font-medium leading-7 tabular-nums text-accent">
                    {formatBigo(caseData.bigo)}
                  </dd>
                </div>
              )}
            </dl>

            {/* The stages, drawn as a horizontal rail. They live OUTSIDE
                `case-dossier-facts`, whose label column would squeeze the
                rail; out here it gets the full width and scrolls sideways.
                These are court registration and verdict dates, one pair per
                forum, not when the corruption happened. */}
            {stages.length > 0 && <CaseStageDates stages={stages} language={currentLang} />}

            {formattedCourtCases.length > 0 && (
              <div className="min-w-0">
                <p className={factLabelClass}>{t("caseDetail.courtCases")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {formattedCourtCases.map((courtCase) => (
                    <Link
                      key={courtCase.label}
                      to={courtCase.href}
                      aria-label={courtCase.label}
                      className="group inline-flex min-h-11 min-w-0 items-center gap-2.5 rounded-full bg-muted px-4 py-2 text-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100"
                    >
                      <span className="font-mono text-sm tabular-nums">{courtCase.caseNumber}</span>
                      <span className="text-sm text-muted-foreground">{courtCase.courtName}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
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
    </section>
  );
}
