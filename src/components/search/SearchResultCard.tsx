import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { CaseCard } from "@/components/CaseCard";
import { CaseCardSkeleton } from "@/components/CaseCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ArchiveSearchResult,
  BilingualText,
  CaseSearchCard,
  CaseSearchCardEntity,
} from "@/types/search";
import type { CaseDetail } from "@/types/jds";
import { getCaseById } from "@/services/jds-api";
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

// Result dispatcher. Case records render the shared <CaseCard> (the same
// component the /cases page uses) in either list or grid mode; every other
// record type falls back to a lightweight card with matching chrome.
export function SearchResultCard({
  result,
  viewMode = "list",
}: Readonly<{ result: ArchiveSearchResult; viewMode?: SearchViewMode }>) {
  if (result.type === "case") return <CaseResultCard result={result} viewMode={viewMode} />;
  return <GenericResultCard result={result} viewMode={viewMode} />;
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

// Non-case results (entity / material / court case): list uses the compact row
// shell, card uses the vertical grid tile. Neither hydrates relational data —
// the index carries none for these types.
function GenericResultCard({
  result,
  viewMode,
}: Readonly<{ result: ArchiveSearchResult; viewMode: SearchViewMode }>) {
  return viewMode === "card" ? <GenericGridCard result={result} /> : <SimpleResultCard result={result} />;
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
    // Search cards show the case summary (not the first allegation, which is what
    // the /cases grid leads with) so the result matches the query context. When
    // there's no summary, fall back to the matched snippet explaining WHY the
    // result matched.
    description: (card.short_description || pickLang(result.snippet) || "")
      .replace(/<[^>]*>/g, "")
      .substring(0, 200),
    entityIds: entityIds(subject),
    locationIds: entityIds(location),
    thumbnailUrl: card.thumbnail_url || undefined,
    bannerUrl: card.banner_url || undefined,
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
    description: (detail.short_description || pickLang(result.snippet) || "")
      .replace(/<[^>]*>/g, "")
      .substring(0, 200),
    entityIds: entityIds(subject),
    locationIds: entityIds(location),
    thumbnailUrl: detail.thumbnail_url || undefined,
    bannerUrl: detail.banner_url || undefined,
  };
}

// ---------------------------------------------------------------------------
// Generic (non-case) cards — list row + grid tile
// ---------------------------------------------------------------------------

// Lightweight list row for entity / material / courtcase: bilingual title +
// snippet + type badge.
function SimpleResultCard({ result }: Readonly<{ result: ArchiveSearchResult }>) {
  const title = formatSimpleTitle(result);
  const metadata = simpleMetadata(result);
  const snippet = pickLang(result.snippet);
  // When there's no snippet the description falls back to the metadata line; in
  // that case don't ALSO render metadata separately, or the card shows the same
  // text twice (e.g. "digitaldocument" / "digitaldocument").
  const description = snippet || metadata;
  return (
    <ResultCardShell
      badge={resultLabel(result)}
      description={description}
      metadata={snippet ? metadata : undefined}
      title={title}
      url={result.url}
    />
  );
}

// Shared row chrome for the generic list card.
function ResultCardShell({
  badge,
  title,
  description,
  metadata,
  url,
}: Readonly<{
  badge: string;
  title: string;
  description: string;
  metadata?: string;
  url: string;
}>) {
  return (
    <div className="group relative block overflow-hidden rounded-xl bg-card p-4 transition-colors hover:bg-muted/35 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <article className="relative z-10 flex min-h-20 items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge className="capitalize" variant="outline">
              {badge}
            </Badge>
          </div>
          <h2 className="break-words text-base font-bold leading-6 text-foreground group-hover:text-primary">
            <Link to={url} className="focus:outline-none">
              <span className="absolute inset-0" aria-hidden="true" />
              {title}
            </Link>
          </h2>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
          {metadata ? (
            <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
              {metadata}
            </p>
          ) : null}
        </div>
        <ArrowRight
          aria-hidden="true"
          className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
        />
      </article>
    </div>
  );
}

// Generic grid tile for entity / material / courtcase results (no relational
// hydration). Visual chrome is kept in step with <CaseCard>.
function GenericGridCard({ result }: Readonly<{ result: ArchiveSearchResult }>) {
  const { t } = useTranslation();
  const title = formatSimpleTitle(result);
  const metadata = simpleMetadata(result);
  const snippet = pickLang(result.snippet);
  const description = snippet || metadata;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card p-5 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_24px_50px_-24px_rgba(15,23,42,0.35)]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge className="capitalize" variant="outline">
          {resultLabel(result)}
        </Badge>
      </div>
      <h3 className="line-clamp-2 text-lg font-semibold leading-8 text-foreground group-hover:text-primary">
        <Link to={result.url} className="rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <span aria-hidden="true" className="absolute inset-0" />
          {title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {snippet && metadata ? (
        <p className="mt-3 truncate text-xs leading-5 text-muted-foreground">
          {metadata}
        </p>
      ) : null}
      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
        {t("common.view", "View")}
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
        />
      </div>
    </div>
  );
}

// Compact list-row skeleton (matches <ResultCardShell>). The card-view loading
// state reuses <CaseCardSkeleton> so it lines up with the reused <CaseCard>.
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

// Metadata line for the non-case types, derived from the search `extra` blob.
function simpleMetadata(result: ArchiveSearchResult): string {
  const parts: string[] = [];
  if (result.type === "courtcase") {
    if (result.extra.court) parts.push(humanize(result.extra.court));
    if (result.extra.case_number) parts.push(result.extra.case_number);
    if (result.extra.case_status) parts.push(humanize(result.extra.case_status));
  } else if (result.type === "material") {
    if (result.extra.type) parts.push(humanize(result.extra.type));
    if (result.extra.date) parts.push(result.extra.date);
  } else if (result.type === "entity") {
    if (result.extra.date) parts.push(result.extra.date);
  }
  return parts.join(" · ");
}

function humanize(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
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
