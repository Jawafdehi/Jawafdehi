import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { CaseCard } from "@/components/CaseCard";
import { CaseCardSkeleton } from "@/components/CaseCardSkeleton";
import { getCaseBadgeClassName } from "@/lib/case-badges";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ArchiveSearchResult,
  BilingualText,
  CaseSearchCard,
  CaseSearchCardEntity,
} from "@/types/search";
import type { CaseDetail } from "@/types/jds";
import { cn } from "@/lib/utils";
import { getCaseById } from "@/services/jds-api";
import { toggleArchiveSearchParam } from "@/utils/archive-search-params";
import { getSubjectEntities } from "@/utils/case-entities";
import { humanizeEntityType } from "@/utils/entity-helpers";

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

export function SearchResultCard({ result }: Readonly<{ result: ArchiveSearchResult }>) {
  if (result.type === "case") return <CaseResultCard result={result} />;
  return <SimpleResultCard result={result} />;
}

// Rich card for Jawafdehi cases. New index docs carry `result.card`, so the card
// renders directly from OpenSearch; older docs fall back to one lazy detail fetch.
function CaseResultCard({ result }: Readonly<{ result: ArchiveSearchResult }>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const caseSlug = caseSlugFromUrl(result.url);
  const [imageFailed, setImageFailed] = useState(false);
  const indexedCard = result.card;

  const { data: caseDetail, isFetching: isDetailLoading } = useQuery({
    queryKey: ["case", caseSlug],
    queryFn: () => getCaseById(caseSlug!),
    enabled: Boolean(caseSlug) && !indexedCard,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const caseImageUrl = indexedCard
    ? indexedCard.thumbnail_url || indexedCard.banner_url || null
    : caseDetail
      ? caseDetail.thumbnail_url || caseDetail.banner_url || null
      : null;
  // Case cards always reserve the image rail (uniform layout): skeleton while
  // hydrating old docs, gradient placeholder when the case has no image.
  const reserveImageSpace = Boolean(caseSlug);
  const showCaseImage = Boolean(caseImageUrl && !imageFailed);

  useEffect(() => setImageFailed(false), [caseImageUrl]);

  const tags = indexedCard?.tags ?? caseDetail?.tags ?? [];
  const metadata = indexedCard ? cardMetadata(indexedCard) : caseDetail ? caseMetadata(caseDetail) : "";
  const title = indexedCard?.title || pickLang(result.title);
  const description = indexedCard?.short_description || pickLang(result.snippet) || metadata;

  return (
    <ResultCardShell
      badge={resultLabel(result)}
      description={description}
      metadata={metadata}
      reserveImageSpace={reserveImageSpace}
      title={title}
      url={result.url}
      image={
        reserveImageSpace ? (
          isDetailLoading ? (
            <Skeleton className="h-full w-full rounded-none" />
          ) : showCaseImage ? (
            <img
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              decoding="async"
              loading="lazy"
              onError={() => setImageFailed(true)}
              src={caseImageUrl}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-100 via-slate-200 to-slate-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800" />
          )
        ) : null
      }
      tags={
        tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={(e) => {
                  e.preventDefault();
                  setSearchParams(
                    toggleArchiveSearchParam(searchParams, "tags", tag),
                  );
                }}
                className={getCaseBadgeClassName(
                  "tag",
                  undefined,
                  "relative z-10 px-2.5 py-0.5 text-[10px] transition-colors",
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null
      }
    />
  );
}

// Lightweight card for entity / material / courtcase: bilingual title + snippet +
// type badge. No relational hydration (the index carries no relationship data).
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
      reserveImageSpace={false}
      title={title}
      url={result.url}
    />
  );
}

// Shared card chrome used by every result type.
function ResultCardShell({
  badge,
  title,
  description,
  metadata,
  url,
  image,
  tags,
  reserveImageSpace,
}: Readonly<{
  badge: string;
  title: string;
  description: string;
  metadata?: string;
  url: string;
  image?: ReactNode;
  tags?: ReactNode;
  reserveImageSpace: boolean;
}>) {
  return (
    <div className="group relative block overflow-hidden rounded-xl border bg-card p-4 transition-colors hover:border-primary/35 hover:bg-muted/35 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {reserveImageSpace ? (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 hidden w-64 overflow-hidden sm:block lg:w-72"
        >
          {image}
          <div className="absolute inset-y-0 right-0 w-2/5 bg-gradient-to-r from-transparent to-card" />
          <div className="absolute inset-0 bg-gradient-to-b from-card/5 to-card/10" />
        </div>
      ) : null}

      <article
        className={cn(
          "relative z-10 flex min-h-20 items-start gap-3 transition-[padding] duration-200",
          reserveImageSpace && "sm:pl-64 lg:pl-72",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge className="capitalize" variant="outline">
              {badge}
            </Badge>
          </div>
          <h2 className="truncate text-base font-bold leading-6 text-foreground group-hover:text-primary">
            <Link to={url} className="focus:outline-none">
              <span className="absolute inset-0" aria-hidden="true" />
              {title}
            </Link>
          </h2>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
          {metadata ? (
            <p className="mt-2 truncate text-xs leading-5 text-muted-foreground">
              {metadata}
            </p>
          ) : null}
          {tags}
        </div>
        <ArrowRight
          aria-hidden="true"
          className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
        />
      </article>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card (grid) view — mirrors the list-view components above but lays each result
// out as a vertical card. Case results reuse the shared <CaseCard> (same
// component the /cases page renders); the other record types fall back to a
// lightweight card with matching chrome.
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
function caseCardPropsFromCard(card: CaseSearchCard, result: ArchiveSearchResult) {
  const subject = getSubjectEntities<CaseSearchCardEntity>(card.entities, (e) => e.type);
  const location = (card.entities || []).filter((e) => e.type === "location");
  const names = entityNames(subject);
  const locationList = entityNames(location);
  return {
    id: result.id,
    slug: card.slug || caseSlugFromUrl(result.url) || null,
    title: card.title || pickLang(result.title),
    entity: names.join(", ") || "Unknown entity",
    entityNames: names,
    location: locationList.join(", ") || "Unknown location",
    status: CASE_STATUS_BADGE[card.status] ?? "under-investigation",
    tags: card.tags || [],
    description: (card.short_description || "").replace(/<[^>]*>/g, "").substring(0, 200),
    allegations: card.key_allegations || [],
    entityIds: entityIds(subject),
    locationIds: entityIds(location),
    thumbnailUrl: card.thumbnail_url || undefined,
    bannerUrl: card.banner_url || undefined,
  };
}

// Fallback for older indexed docs with no card payload: derive from case detail.
// Status is inferred from the case's date fields (same rule the cases list uses).
function caseCardPropsFromDetail(detail: CaseDetail, result: ArchiveSearchResult, fallbackSlug?: string) {
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
    entity: names.join(", ") || "Unknown entity",
    entityNames: names,
    location: locationList.join(", ") || "Unknown location",
    status,
    tags: detail.tags || [],
    description: (detail.short_description || "").replace(/<[^>]*>/g, "").substring(0, 200),
    allegations: detail.key_allegations || [],
    entityIds: entityIds(subject),
    locationIds: entityIds(location),
    thumbnailUrl: detail.thumbnail_url || undefined,
    bannerUrl: detail.banner_url || undefined,
  };
}

export function SearchResultGridCard({ result }: Readonly<{ result: ArchiveSearchResult }>) {
  if (result.type === "case") return <CaseGridCard result={result} />;
  return <GenericGridCard result={result} />;
}

// Case grid card: renders the reused <CaseCard> in grid mode. Uses the indexed
// card payload directly when present, else lazily hydrates from the detail API
// (the same query the list card uses, so the fetch is shared/cached).
function CaseGridCard({ result }: Readonly<{ result: ArchiveSearchResult }>) {
  const caseSlug = caseSlugFromUrl(result.url);
  const indexedCard = result.card;

  const { data: caseDetail, isFetching } = useQuery({
    queryKey: ["case", caseSlug],
    queryFn: () => getCaseById(caseSlug!),
    enabled: Boolean(caseSlug) && !indexedCard,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (indexedCard) {
    return <CaseCard viewMode="grid" {...caseCardPropsFromCard(indexedCard, result)} />;
  }
  if (caseDetail) {
    return <CaseCard viewMode="grid" {...caseCardPropsFromDetail(caseDetail, result, caseSlug)} />;
  }
  if (isFetching || caseSlug) return <CaseCardSkeleton />;
  // No slug to hydrate from — degrade gracefully to the generic card.
  return <GenericGridCard result={result} />;
}

// Generic grid card for entity / material / courtcase results (no relational
// hydration). Visual chrome is kept in step with <CaseCard>.
function GenericGridCard({ result }: Readonly<{ result: ArchiveSearchResult }>) {
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
      <h2 className="line-clamp-2 text-lg font-semibold leading-8 text-foreground group-hover:text-primary">
        <Link to={result.url} className="rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <span aria-hidden="true" className="absolute inset-0" />
          {title}
        </Link>
      </h2>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {snippet && metadata ? (
        <p className="mt-3 truncate text-xs leading-5 text-muted-foreground">
          {metadata}
        </p>
      ) : null}
      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
        View
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
        />
      </div>
    </div>
  );
}

export function SearchResultCardSkeleton({
  showTags = false,
}: Readonly<{ showTags?: boolean }>) {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-xl border bg-card p-4"
    >
      {showTags ? (
        <div className="absolute inset-y-0 left-0 hidden w-64 overflow-hidden sm:block lg:w-72">
          <Skeleton className="h-full w-full rounded-none" />
          <div className="absolute inset-y-0 right-0 w-2/5 bg-gradient-to-r from-transparent to-card" />
        </div>
      ) : null}
      <div
        className={cn(
          "relative z-10 flex min-h-20 items-start gap-3",
          showTags && "sm:pl-64 lg:pl-72",
        )}
      >
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

// Subject + location entities from the indexed case-card payload.
function cardMetadata(card: CaseSearchCard): string {
  const entities = card.entities || [];
  const [primaryEntity] = getSubjectEntities(entities, (e) => e.type);
  const location = entities.find((entity) => entity.type === "location");
  return [entityName(primaryEntity), entityName(location)]
    .filter(Boolean)
    .join(" · ");
}

// Subject + location entities from the hydrated case detail fallback.
function caseMetadata(detail: import("@/types/jds").CaseDetail): string {
  const entities = detail.entities || [];
  const [primaryEntity] = getSubjectEntities(entities, (e) => e.type);
  const location = entities.find((entity) => entity.type === "location");
  return [entityName(primaryEntity), entityName(location)]
    .filter(Boolean)
    .join(" · ");
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

function entityName(entity?: { display_name: string | null; nes_id: string | null }) {
  return entity?.display_name || entity?.nes_id || "";
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
