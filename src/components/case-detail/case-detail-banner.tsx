import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Share2 } from "lucide-react";
import { CaseStatusBadge, CaseTagBadge, CaseTypeBadge } from "@/components/CaseBadge";
import { Button } from "@/components/ui/button";
import { deriveCaseStatus, getCaseStatusLabelKey } from "@/lib/case-badges";
import { cn } from "@/lib/utils";
import { entityPath } from "@/lib/entity-links";
import type { CaseDetail, JawafEntity } from "@/types/jds";
import type { Entity } from "@/types/entity";
import { formatCaseDateRangeForLanguage } from "@/utils/date";
import { getPrimaryName } from "@/utils/entity-helpers";
import { parseCourtCaseRef } from "@/utils/courtCaseRef";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { formatBigo } from "@/utils/number";
import { getCaseTypeLabelKey } from "@/utils/case-entities";
import { CaseByline } from "@/components/case-detail/case-byline";

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

const PLACEHOLDER_IMAGE = "/assets/placeholder.png";

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

function isValidCaseImage(url?: string | null) {
  const trimmedUrl = url?.trim();

  return Boolean(trimmedUrl) && !trimmedUrl?.includes("/admin/");
}

function getCaseBannerSrc(caseData: CaseDetail) {
  if (isValidCaseImage(caseData.banner_url)) {
    return caseData.banner_url!.trim();
  }

  if (isValidCaseImage(caseData.thumbnail_url)) {
    return caseData.thumbnail_url!.trim();
  }

  return PLACEHOLDER_IMAGE;
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

  const bannerSrc = getCaseBannerSrc(caseData);
  const [imageSrc, setImageSrc] = useState(bannerSrc);

  useEffect(() => {
    setImageSrc(bannerSrc);
  }, [bannerSrc]);

  // Derive the chip from state + end date so a concluded case (one with a
  // `case_end_date`) no longer reads "Ongoing".
  const effectiveStatus = deriveCaseStatus(caseData.state, caseData.case_end_date);
  const statusLabel = t(getCaseStatusLabelKey(effectiveStatus));
  // A known case type localizes; an unknown/scraped one humanizes its raw value
  // rather than mislabelling (getCaseTypeLabelKey returns null when unknown).
  const caseTypeLabelKey = getCaseTypeLabelKey(caseData.case_type);
  const caseTypeLabel = caseTypeLabelKey
    ? t(caseTypeLabelKey)
    : (caseData.case_type || "").replaceAll("_", " ").replaceAll("-", " ");

  const dateRange = formatCaseDateRangeForLanguage(
    caseData.case_start_date,
    caseData.case_end_date,
    t("cases.status.ongoing"),
    currentLang
  );

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
      <div className="mx-auto w-full max-w-8xl px-0 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <img
            src={imageSrc}
            alt={title}
            onError={() => {
              if (imageSrc !== PLACEHOLDER_IMAGE) {
                setImageSrc(PLACEHOLDER_IMAGE);
              }
            }}
            className={cn(
              "order-2 h-52 w-full object-cover object-top sm:h-[440px] lg:order-none lg:h-[520px] xl:h-[560px]",
              // placeholder.png is 98% #F5F5F5, so on the dark page it renders as
              // a white slab. invert + hue-rotate flips its lightness while
              // restoring the hue, which turns it into a dark panel with the
              // illustration intact. Applied ONLY to the placeholder — real case
              // photographs must never be inverted.
              imageSrc === PLACEHOLDER_IMAGE && "dark:invert dark:hue-rotate-180",
            )}
          />

          {/* relative z-10: the image above carries a CSS filter in dark mode,
              which gives it its own stacking context. Without an explicit layer
              here it would paint over this panel and clip the 80px that
              lg:-ml-20 pulls across it. */}
          <div className="relative z-10 order-1 flex flex-col justify-center py-0 lg:order-none lg:py-10">
            <div className="bg-primary-surface px-6 py-5 text-white lg:-ml-20 lg:px-10">
              <nav
                aria-label="breadcrumb"
                className="mb-3 flex min-w-0 items-center gap-2 text-xs font-medium text-white/70"
              >
                <Link
                  to="/"
                  className="shrink-0 transition-colors hover:text-white"
                >
                  {homeLabel || "jawafdehi.org"}
                </Link>

                <span className="shrink-0 text-white/40">/</span>

                <Link
                  to="/cases"
                  className="shrink-0 transition-colors hover:text-white"
                >
                  {casesLabel || "case"}
                </Link>

                <span className="shrink-0 text-white/40">/</span>

                <span className="min-w-0 truncate text-white/80">{breadcrumbCase}</span>
              </nav>

              <h1 className={cn("max-w-4xl break-words font-bold tracking-tight text-bg", titleSizeClass)}>
                {title}
              </h1>
            </div>

            <div className="px-6 py-6 text-sm lg:px-10 lg:py-7">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <CaseStatusBadge status={effectiveStatus}>
                  {statusLabel}
                </CaseStatusBadge>

                {caseTypeLabel ? (
                  <CaseTypeBadge caseType={caseData.case_type}>
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
                <p className="mb-5 max-w-3xl text-base font-medium leading-relaxed text-primary/80 md:text-lg">
                  {caseData.short_description}
                </p>
              ) : null}

              <div className="space-y-2">
                <div>
                  <p className={metaTitleClass}>{t("caseDetail.location")}:</p>

                  <div className={metaValueClass}>
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
                            {index < locationEntities.length - 1 && ", "}
                          </span>
                        );
                      })
                      : notAvailableLabel}
                  </div>
                </div>

                <div>
                  <p className={metaTitleClass}>{t("caseDetail.period")}:</p>
                  <div className={metaValueClass}>
                    <p>{dateRange.primary}</p>
                    {dateRange.secondary && (
                      <p className="text-sm font-normal leading-6 text-primary/65">
                        ({dateRange.secondary})
                      </p>
                    )}
                  </div>
                </div>

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

                {formattedCourtCases.length > 0 && (
                  <div>
                    <p className={metaTitleClass}>
                      {t("caseDetail.courtCases")}:
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {formattedCourtCases.map((courtCase) => (
                        <Link
                          key={courtCase.label}
                          to={courtCase.href}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold leading-6 text-primary underline underline-offset-4 transition-colors hover:text-primary/75"
                        >
                          <span>{courtCase.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Public caseworker-authored attribution + edit-history byline
                    (Case.public_notes). On-screen counterpart to the print-only
                    block in CaseDetail; the banner is no-print, so it renders on
                    screen without duplicating in the PDF. Empty = nothing shown. */}
                <CaseByline markdown={caseData.public_notes} />
              </div>

              {actions || shareAction ? (
                <div className="mt-5 flex flex-wrap items-center gap-3 no-print">
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
          </div>
        </div>
      </div>
    </section>
  );
}
