import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Share2 } from "lucide-react";
import { CaseStatusBadge, CaseTagBadge, CaseTypeBadge } from "@/components/CaseBadge";
import { Button } from "@/components/ui/button";
import { deriveCaseStatus, getCaseStatusLabelKey } from "@/lib/case-badges";
import { CASE_PLACEHOLDER_DARK_CLASS } from "@/lib/case-images";
import { useCaseImage } from "@/lib/use-case-image";
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
  // A real photograph gets a scrim and white text; the placeholder gets neither.
  const onDarkBackdrop = !isPlaceholder;
  const crumbHover = onDarkBackdrop ? "hover:text-white" : "hover:text-foreground";

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
      {/* Full-bleed hero. The image spans the viewport and the breadcrumb and
          title sit ON it, bottom-aligned, over a scrim — rather than the old
          half-width image with a navy panel pulled across it by lg:-ml-20. One
          wide image reads as a photograph of the case; a half-column one read as
          a decorative sidebar, and the negative margin meant the crop had to be
          chosen around the panel that covered its left edge.

          Heights are shorter than the old 560px because the image no longer has
          to fill a column beside the metadata: it is a band above it.

          The band's height is driven by its CONTENT with a per-breakpoint floor,
          not fixed. Case titles here are long Nepali sentences — the oxygen-plant
          case wraps to four lines on a phone — and against a fixed 256px band
          that text plus the breadcrumb covered all but a sliver of the
          photograph. A min-height keeps the intended proportions for a short
          title and lets a long one push the band taller instead of burying the
          image. The image is the background layer so it fills whatever height
          results. */}
      <div className="relative w-full overflow-hidden">
        <img
          src={imageSrc}
          srcSet={srcSet}
          // Full-bleed at every breakpoint, so the browser should pick by
          // viewport width alone.
          sizes="100vw"
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
          // No width/height attributes: the box is reserved by the content
          // column's min-height below, and with both dimensions set in CSS the
          // intrinsic aspect-ratio hint would do nothing anyway.
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center",
            isPlaceholder && CASE_PLACEHOLDER_DARK_CLASS,
          )}
        />

        {/* Scrim. Opaque at the bottom where the title sits and clear at the
            top, so the photograph is still legible as a photograph. Skipped on
            the placeholder, which is a near-flat light panel that needs no
            help — and which dark mode has already inverted. */}
        {!isPlaceholder && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/45 to-transparent"
          />
        )}

        <div className="relative">
          {/* pt-* is generous so a short title still sits low in the band rather
              than floating mid-image.

              lg:pl-24 clears the FloatingShareSidebar, which is `fixed left-4`
              and vertically centred, so on a short viewport its rail lands over
              the bottom of this hero and clipped the breadcrumb and the first
              characters of the title. The old half-width layout never collided
              with it because the text started at the midpoint. Below `lg` the
              rail is hidden, so the padding is not needed there. */}
          {/* The floor is a FRACTION OF THE VIEWPORT WIDTH, not a pixel height.
              The band is full-bleed, so a fixed height makes its aspect ratio a
              function of the window: at 1440px a 420px floor is 3.4:1, and
              because the image behind is object-cover, a 16:9 source then shows
              52% of its height and a 4:3 source 38% — the wider the screen, the
              more of the photograph is thrown away, which is the opposite of
              what a hero should do.

              Tying the floor to `vw` fixes the ratio instead of the height, so
              the crop is bounded at every width: ~1.7:1 on a phone, ~2.1:1 on a
              tablet, ~2.3:1 on a desktop. A 16:9 source keeps roughly three
              quarters of its height there rather than half.

              Capped at 680px so an ultra-wide monitor does not get a hero tall
              enough to bury the बिगो and the case dates below the fold. The cap
              does mean the ratio widens again past ~1550px, so a 4:3 source is
              still cropped hard on a 2560px screen — the remedy for that is a
              WIDER SOURCE, not a taller band: the 2.17:1 photograph on
              local-hydropower-claim keeps 93% of its height at 1440 and 70% at
              1920, where the 4:3 portrait keeps 56% and 42%.

              Still a MIN height, so the original reason it exists holds: a long
              Nepali title (four lines on a phone) pushes the band taller rather
              than being clipped. */}
          <div className="mx-auto flex min-h-[58vw] w-full max-w-8xl flex-col justify-end px-6 pb-6 pt-24 sm:min-h-[48vw] sm:px-10 sm:pb-8 sm:pt-32 lg:min-h-[min(44vw,680px)] lg:pl-24 lg:pt-40">
            <nav
              aria-label="breadcrumb"
              className={cn(
                "mb-3 flex min-w-0 items-center gap-2 text-xs font-medium",
                onDarkBackdrop
                  ? "text-white/70 drop-shadow"
                  : "text-muted-foreground",
              )}
            >
              <Link to="/" className={cn("shrink-0 transition-colors", crumbHover)}>
                {/* Translated defaults, not hardcoded English. The only
                    production caller (CaseDetail) passes NEITHER label, so
                    these ARE what renders — a Nepali reader was getting
                    "jawafdehi.org / case". Reuses the keys the header and the
                    nav already carry rather than adding near-duplicates. */}
                {homeLabel || t("header.title")}
              </Link>

              <span className="shrink-0 opacity-50">/</span>

              <Link to="/cases" className={cn("shrink-0 transition-colors", crumbHover)}>
                {casesLabel || t("nav.cases")}
              </Link>

              <span className="shrink-0 opacity-50">/</span>

              <span className="min-w-0 truncate opacity-90">{breadcrumbCase}</span>
            </nav>

            <h1
              className={cn(
                "max-w-4xl break-words font-bold tracking-tight",
                // On a photograph the text is white over the scrim. On the
                // placeholder there IS no scrim (it is a near-flat light panel
                // that a gradient would only muddy), so white-on-white would be
                // unreadable — use the normal foreground, which inverts with the
                // placeholder in dark mode.
                onDarkBackdrop
                  ? "text-white drop-shadow-lg"
                  : "text-foreground",
                titleSizeClass,
              )}
            >
              {title}
            </h1>
          </div>
        </div>
      </div>

      {/* Metadata below the hero, in the content column. */}
      <div className="mx-auto w-full max-w-8xl px-0 sm:px-6">
        <div className="grid grid-cols-1">
          <div className="relative z-10 flex flex-col justify-center">
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

                {/* The public byline: authors, first-published date and the
                    curated edit history (falling back to the deprecated free-text
                    public_notes on un-backfilled cases). On-screen counterpart to
                    the print-only block in CaseDetail; the banner is no-print, so
                    it renders on screen without duplicating in the PDF. */}
                <CaseByline
                  authors={caseData.authors}
                  publishDate={caseData.case_publish_date}
                  editHistory={caseData.public_edit_history}
                  markdown={caseData.public_notes}
                />
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
