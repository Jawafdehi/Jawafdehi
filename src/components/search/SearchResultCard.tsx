import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ArchiveSearchResult,
  BilingualText,
} from "@/types/search";
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

// Rich card for Jawafdehi cases: hydrates the thumbnail + subject/location
// entities + tags lazily from the case detail API (data not in the search index).
function CaseResultCard({ result }: Readonly<{ result: ArchiveSearchResult }>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const caseSlug = caseSlugFromUrl(result.url);
  const [imageFailed, setImageFailed] = useState(false);

  const { data: caseDetail, isFetching: isDetailLoading } = useQuery({
    queryKey: ["case", caseSlug],
    queryFn: () => getCaseById(caseSlug!),
    enabled: Boolean(caseSlug),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const caseImageUrl = caseDetail
    ? caseDetail.thumbnail_url || caseDetail.banner_url || null
    : null;
  const reserveImageSpace =
    Boolean(caseSlug) && (isDetailLoading || Boolean(caseImageUrl && !imageFailed));

  useEffect(() => setImageFailed(false), [caseImageUrl]);

  const tags = caseDetail?.tags ?? [];
  const metadata = caseDetail ? caseMetadata(caseDetail) : "";

  return (
    <ResultCardShell
      badge={resultLabel(result)}
      description={pickLang(result.snippet) || metadata}
      metadata={metadata}
      reserveImageSpace={reserveImageSpace}
      title={pickLang(result.title)}
      url={result.url}
      image={
        reserveImageSpace ? (
          caseImageUrl && !imageFailed ? (
            <img
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              decoding="async"
              loading="lazy"
              onError={() => setImageFailed(true)}
              src={caseImageUrl}
            />
          ) : (
            <Skeleton className="h-full w-full rounded-none" />
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
                className="relative z-10 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
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
  const description = pickLang(result.snippet) || simpleMetadata(result);
  return (
    <ResultCardShell
      badge={resultLabel(result)}
      description={description}
      metadata={simpleMetadata(result)}
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

// Subject + location entities from the hydrated case detail.
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
