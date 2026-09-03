import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { CaseCard } from "@/components/CaseCard";
import { CaseCardSkeleton } from "@/components/CaseCardSkeleton";
import { CourtCaseCard } from "@/components/CourtCaseCard";
import { MaterialCard } from "@/components/materials/MaterialCard";
import { Skeleton } from "@/components/ui/skeleton";
import { seriesBySource } from "@/data/material-series";
import { sourceKeyFor } from "@/lib/material-source-labels";
import {
  formatLedgerDate,
  pickLocalized,
  resolveMaterialDate,
  sourceFromMaterialUrl,
} from "@/lib/materials-landing";
import { SITE_URL } from "@/utils/seo";
import type {
  ArchiveSearchResult,
  BilingualText,
  CaseSearchCard,
  CaseSearchCardEntity,
} from "@/types/search";
import type { CaseDetail } from "@/types/jds";
import { getCaseById } from "@/services/jds-api";
import { cn } from "@/lib/utils";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { toggleArchiveSearchParam } from "@/utils/archive-search-params";
import { getSubjectEntities } from "@/utils/case-entities";
import { humanizeEntityType } from "@/utils/entity-helpers";

// Both the /search list and card views render the same components; `viewMode`
// only decides whether the shared <CaseCard> lays out horizontally (list) or as
// a vertical tile (card), and which chrome the generic (non-case) card uses.
export type SearchViewMode = "list" | "card";

// Auto-language: prefer English, fall back to Nepali (no toggle). Strips the HTML
// <em> highlight tags that snippets carry so we render plain text.
function pickLang(text: BilingualText | undefined): string {
  const value = text?.en || text?.ne || "";
  return value.replace(/<\/?em>/g, "");
}

// Per-type display label for the badge.
function resultLabel(result: ArchiveSearchResult): string {
  switch (result.type) {
    case "entity":
      return result.extra.type
        ? `Entity · ${humanizeEntityType(result.extra.type)}`
        : "Entity";
    case "material":
      return "Material";
    case "courtcase":
      return "Court case";
    case "case":
      return "Case";
    default:
      return result.type;
  }
}

// The slug a case URL ends with (``/case/<slug>``), used to hydrate the card.
function caseSlugFromUrl(url: string): string | undefined {
  const match = /\/case\/([^/?#]+)/.exec(url);
  return match?.[1];
}

// Result dispatcher. Case, court-case and material records each render their
// shared rich card; entities use the lightweight generic card.
export function SearchResultCard({
  result,
  viewMode = "list",
}: Readonly<{ result: ArchiveSearchResult; viewMode?: SearchViewMode }>) {
  if (result.type === "case") return <CaseResultCard result={result} viewMode={viewMode} />;
  if (result.type === "courtcase") {
    return <CourtCaseResultCard result={result} viewMode={viewMode} />;
  }
  if (result.type === "material") {
    return <MaterialResultCard result={result} viewMode={viewMode} />;
  }
  return <GenericResultCard result={result} viewMode={viewMode} />;
}

// Materials render the archive's shared document card (the /materials series
// rows), fed entirely from the index hit: the source token in the URL names the
// series (registry) or the publishing institution (long tail, same chain as
// RecentMaterialsCarousel), and the mixed-calendar `extra.date` resolves
// through the same BS-in-AD quirk handling as the /materials surfaces, so
// 2082-* dates render as BS in the reader's calendar instead of leaking raw.
//
// No download/source buttons here, unlike the series rows: those need the
// record's `associatedMedia`, which the search index does not carry, and
// hydrating it per row cost a detail GET for every hit on a 346k-record browse
// surface. The card links to the document, where the downloads live. Restoring
// them belongs with indexing the media onto material docs — the same
// denormalization cases already got (`result.card`).
function MaterialResultCard({
  result,
  viewMode,
}: Readonly<{ result: ArchiveSearchResult; viewMode: SearchViewMode }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const source = sourceFromMaterialUrl(result.url);
  const series = source ? seriesBySource(source) : undefined;
  const sourceLabel = series
    ? pickLocalized(series.name, language)
    : t(
        `dataQuality.materialsBySource.source.${sourceKeyFor(source ?? "")}`,
        source ?? "",
      );
  const dateLabel =
    formatLedgerDate(resolveMaterialDate(result.extra), language) ||
    t("materialsLanding.series.undated", "Undated");
  const title =
    pickLocalized(result.title, language) ||
    t("materialsLanding.recent.untitled", "Untitled document");
  // Snippets only arrive on text queries; pickLocalized strips the <em>
  // highlight markup they carry. Many press-release bodies open with the title
  // sentence, so a snippet that merely echoes the title — in either truncation
  // direction — adds nothing; drop it.
  const rawSnippet = pickLocalized(result.snippet, language);
  const snippet =
    rawSnippet.startsWith(title) || title.startsWith(rawSnippet)
      ? ""
      : rawSnippet;

  return (
    <MaterialCard
      title={title}
      href={result.url}
      metaLine={[sourceLabel, dateLabel].filter(Boolean).join(" · ")}
      description={snippet}
      shareUrl={`${SITE_URL}${result.url}`}
      viewMode={viewMode}
    />
  );
}

function CourtCaseResultCard({
  result,
  viewMode,
}: Readonly<{ result: ArchiveSearchResult; viewMode: SearchViewMode }>) {
  return (
    <CourtCaseCard
      caseNumber={result.extra.case_number}
      court={result.extra.court}
      courtType={result.extra.court_type}
      registrationDate={result.extra.date}
      registrationDateBs={result.extra.date_bs}
      status={result.extra.case_status}
      title={formatSimpleTitle(result)}
      url={result.url}
      viewMode={viewMode}
    />
  );
}

// Rich card for Jawafdehi cases, reusing <CaseCard> for full visual parity with
// /cases. New index docs carry `result.card`, so the card renders directly from
// OpenSearch; older docs fall back to one lazy detail fetch.
function CaseResultCard({
  result,
  viewMode,
}: Readonly<{ result: ArchiveSearchResult; viewMode: SearchViewMode }>) {
  const { i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const caseSlug = caseSlugFromUrl(result.url);
  const indexedCard = result.card;
  const caseCardViewMode = viewMode === "card" ? "grid" : "list";

  const { data: caseDetail, isFetching } = useQuery({
    queryKey: ["case", caseSlug],
    queryFn: () => getCaseById(caseSlug!),
    enabled: Boolean(caseSlug) && !indexedCard,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Clicking a tag on a search result card toggles it as a URL tag refinement.
  const handleTagClick = (tag: string) =>
    setSearchParams(toggleArchiveSearchParam(searchParams, "tags", tag));

  if (indexedCard) {
    return (
      <CaseCard
        viewMode={caseCardViewMode}
        onTagClick={handleTagClick}
        {...caseCardPropsFromCard(indexedCard, result, i18n.language)}
      />
    );
  }
  if (caseDetail) {
    return (
      <CaseCard
        viewMode={caseCardViewMode}
        onTagClick={handleTagClick}
        {...caseCardPropsFromDetail(caseDetail, result, i18n.language, caseSlug)}
      />
    );
  }
  // Only show the loading placeholder while the detail fetch is genuinely in
  // flight. If it settles with no data (e.g. the request failed), fall through
  // to the generic card instead of getting stuck on the skeleton forever.
  if (isFetching) {
    return viewMode === "card" ? <CaseCardSkeleton /> : <SearchResultCardSkeleton showTags />;
  }
  return <GenericResultCard result={result} viewMode={viewMode} />;
}

// ---------------------------------------------------------------------------
// Case → <CaseCard> prop mapping
// ---------------------------------------------------------------------------

type CaseCardStatus = "ongoing" | "resolved" | "under-investigation";

const CASE_STATUS_BADGE: Record<CaseSearchCard["status"], CaseCardStatus> = {
  ongoing: "ongoing",
  closed: "resolved",
  others: "under-investigation",
};

function entityNames(entities: readonly { display_name: string | null; nes_id: string | null }[]): string[] {
  return entities.map((e) => e.display_name || e.nes_id || "").filter(Boolean);
}

function entityIds(entities: readonly { nes_id: string | null }[]): string[] {
  return entities.map((e) => e.nes_id).filter((id): id is string => Boolean(id));
}

// Map the indexed case-card payload (the common path on new docs) onto <CaseCard>.
// `language` localizes the unknown-entity/location fallbacks the same way /cases does.
function caseCardPropsFromCard(card: CaseSearchCard, result: ArchiveSearchResult, language: string) {
  const subject = getSubjectEntities<CaseSearchCardEntity>(card.entities, (e) => e.type);
  const location = (card.entities || []).filter((e) => e.type === "location");
  const names = entityNames(subject);
  const locationList = entityNames(location);
  return {
    id: result.id,
    slug: card.slug || caseSlugFromUrl(result.url) || null,
    title: card.title || pickLang(result.title),
    entity: names.join(", ") || translateDynamicText("Unknown Entity", language),
    entityNames: names,
    location: locationList.join(", ") || translateDynamicText("Unknown Location", language),
    status: CASE_STATUS_BADGE[card.status] ?? "under-investigation",
    tags: card.tags || [],
    entityIds: entityIds(subject),
    locationIds: entityIds(location),
    image: card.thumbnail ?? null,
    thumbnailUrl: card.thumbnail_url || undefined,
    bannerUrl: card.banner_url || undefined,
    bigo: card.bigo,
  };
}

// Fallback for older indexed docs with no card payload: derive from case detail.
// Status is inferred from the case's date fields (same rule the cases list uses).
function caseCardPropsFromDetail(
  detail: CaseDetail,
  result: ArchiveSearchResult,
  language: string,
  fallbackSlug?: string,
) {
  const entities = detail.entities || [];
  const subject = getSubjectEntities(entities, (e) => e.type);
  const location = entities.filter((e) => e.type === "location");
  const names = entityNames(subject);
  const locationList = entityNames(location);
  const hasStart = Boolean(detail.case_start_date && detail.case_start_date.trim() !== "");
  const hasEnd = Boolean(detail.case_end_date && detail.case_end_date.trim() !== "");
  const status: CaseCardStatus = hasStart && !hasEnd ? "ongoing" : hasStart && hasEnd ? "resolved" : "under-investigation";
  return {
    id: result.id,
    slug: detail.slug || fallbackSlug || null,
    title: detail.title || pickLang(result.title),
    entity: names.join(", ") || translateDynamicText("Unknown Entity", language),
    entityNames: names,
    location: locationList.join(", ") || translateDynamicText("Unknown Location", language),
    status,
    tags: detail.tags || [],
    entityIds: entityIds(subject),
    locationIds: entityIds(location),
    image: detail.thumbnail ?? null,
    thumbnailUrl: detail.thumbnail_url || undefined,
    bannerUrl: detail.banner_url || undefined,
    // Kept in step with the indexed-card path above: the two mappings feed the
    // same <CaseCard>, so a field added to one must be added to both or a case
    // silently loses it on older docs that fall back to the detail fetch.
    bigo: detail.bigo,
  };
}

// ---------------------------------------------------------------------------
// Generic entity cards — one field set, two shells
// ---------------------------------------------------------------------------

// Single source of truth for WHAT a non-case result shows. Both view modes read
// this, so they cannot drift apart on fields again — only on the chrome around
// them. (They previously did: the grid tile `truncate`d the metadata line to one
// line while the list row wrapped it in full, hiding e.g. a court case's number
// and status behind an ellipsis in card view only.)
function genericResultFields(result: ArchiveSearchResult) {
  const metadata = simpleMetadata(result);
  const snippet = pickLang(result.snippet);
  return {
    badge: resultLabel(result),
    title: formatSimpleTitle(result),
    // When there's no snippet the description falls back to the metadata line; in
    // that case don't ALSO render metadata separately, or the card shows the same
    // text twice (e.g. "digitaldocument" / "digitaldocument").
    description: snippet || metadata,
    metadata: snippet ? metadata : "",
    url: result.url,
  };
}

// Entity (and any future untyped result). `viewMode` picks the shell — a
// compact row for list, a vertical tile for card — and nothing else: every
// field below renders in both modes at the same clamp limits.
function GenericResultCard({
  result,
  viewMode,
}: Readonly<{ result: ArchiveSearchResult; viewMode: SearchViewMode }>) {
  const { t } = useTranslation();
  const { badge, title, description, metadata, url } = genericResultFields(result);
  const isCard = viewMode === "card";

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden bg-card transition-all",
        isCard
          ? "h-full rounded-3xl border border-border/70 p-5 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_24px_50px_-24px_rgba(15,23,42,0.35)]"
          : "min-h-20 rounded-xl p-4 hover:bg-muted/35 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
      )}
    >
      <article className="flex min-w-0 flex-1 flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge className="capitalize" variant="outline">
            {badge}
          </Badge>
        </div>
        {/* h3 in both modes, matching <CaseCard>, so every result in the list sits
            at the same heading level instead of h2-for-generic / h3-for-case. */}
        <h3
          className={cn(
            "line-clamp-2 break-words font-semibold text-foreground group-hover:text-primary",
            isCard ? "text-lg leading-8" : "text-base leading-6",
          )}
        >
          <Link
            to={url}
            className="rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span aria-hidden="true" className="absolute inset-0" />
            {title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {/* Clamped, never truncated — see genericResultFields. */}
        {metadata ? (
          <p className="mt-3 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
            {metadata}
          </p>
        ) : null}
        {/* The list row used to carry a bare arrow with no accessible label. */}
        <div className="mt-auto flex items-center gap-1 pt-4 text-sm font-medium text-primary">
          {t("common.view", "View")}
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
          />
        </div>
      </article>
    </div>
  );
}

// Compact generic list-row skeleton. ArchiveSearch selects the dedicated case
// or court-case skeleton while one of those record types is active.
export function SearchResultCardSkeleton({
  showTags = false,
}: Readonly<{ showTags?: boolean }>) {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-xl bg-card p-4"
    >
      <div className="relative z-10 flex min-h-20 items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-4/5 max-w-xl" />
          <div className="mt-2 space-y-1.5">
            <Skeleton className="h-3.5 w-full max-w-2xl" />
            <Skeleton className="h-3.5 w-3/5 max-w-md" />
          </div>
          <Skeleton className="mt-3 h-3 w-2/5 max-w-xs" />
          {showTags ? (
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ) : null}
        </div>
        <Skeleton className="mt-2 h-4 w-4 shrink-0" />
      </div>
    </div>
  );
}

// Metadata line for the generic types, derived from the search `extra` blob.
// Materials no longer pass through here — they have their own card above.
function simpleMetadata(result: ArchiveSearchResult): string {
  if (result.type === "entity" && result.extra.date) return result.extra.date;
  return "";
}

// Entity locations carry an IRI-like title (``.../location/kathmandu``); show the
// last path segment, title-cased. Other types render the bilingual title as-is.
function formatSimpleTitle(result: ArchiveSearchResult): string {
  const raw = pickLang(result.title);
  if (result.type === "entity" && result.extra.type === "location" && raw) {
    const parts = raw.split("/");
    const name = parts[parts.length - 1];
    return name.charAt(0).toUpperCase() + name.slice(1).replaceAll("_", " ");
  }
  // Court cases may have only a Nepali (case-number) title — pickLang handles the
  // English-then-Nepali fallback already.
  return raw || result.id;
}
