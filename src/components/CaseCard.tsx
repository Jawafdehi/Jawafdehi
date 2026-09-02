import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type { TFunction } from "i18next";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaseStatusBadge, CaseTagBadge } from "@/components/CaseBadge";
import { getCaseStatusLabelKey } from "@/lib/case-badges";
import { Coins, MapPin, User } from "lucide-react";
import { entityPath } from "@/lib/entity-links";
import {
  CASE_PLACEHOLDER_DARK_CLASS,
  CASE_PLACEHOLDER_IMAGE,
  caseImageSources,
} from "@/lib/case-images";
import type { CaseImage } from "@/types/jds";
import { cn } from "@/lib/utils";
import { formatBigo } from "@/utils/number";

const nepaliDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

interface CaseCardProps {
  id: string;
  slug?: string | null; // URL-friendly slug for navigation
  title: string;
  entity: string;
  entityNames?: string[];
  location: string;
  status: "ongoing" | "resolved" | "under-investigation";
  tags?: string[];
  entityIds?: string[]; // NES entity @id IRIs (used to link to /entity/*)
  locationIds?: string[]; // NES entity @id IRIs (used to link to /entity/*)
  // The card image as a responsive ladder. Preferred over the two URL props
  // below, which are the fallback for cases that predate uploaded images.
  image?: CaseImage | null;
  thumbnailUrl?: string; // DEPRECATED bare URL
  bannerUrl?: string; // DEPRECATED bare URL, tried when the thumbnail fails
  // बिगो — the embezzled/irregular amount in NPR. Most cases carry none, so the
  // row is omitted rather than rendered as "Rs 0" (see BigoRow).
  bigo?: number | null;
  viewMode?: "grid" | "list";
  // When set, tags render as buttons that invoke this instead of plain badges —
  // the archive search uses it to toggle a tag as a URL refinement.
  onTagClick?: (tag: string) => void;
}

// i18next's `language` is typed as `string` but can be transiently undefined
// (e.g. before init, or in tests), so guard before calling string methods —
// an unguarded `.startsWith` here crashed card rendering across the search page.
function normalizeLanguage(language?: string | null): string {
  return typeof language === "string" ? language : "en";
}

function formatEntityCount(count: number, language?: string | null) {
  const lang = normalizeLanguage(language);
  if (!lang.startsWith("ne")) {
    return count.toString();
  }

  return count.toString().replace(/\d/g, (digit) => nepaliDigits[Number(digit)]);
}

function getEntitySummary(entity: string, entityNames: string[] | undefined, language: string | undefined, t: TFunction) {
  const lang = normalizeLanguage(language);
  const names = entityNames?.filter(Boolean) ?? entity.split(",").map((name) => name.trim()).filter(Boolean);
  const firstName = names[0] || entity;
  const remainingCount = Math.max(names.length - 1, 0);
  const countLabel = formatEntityCount(remainingCount, lang);

  if (remainingCount === 0) {
    return firstName;
  }

  if (lang.startsWith("ne")) {
    return t("caseCard.entitySummary.withOthersNepali", { name: firstName, count: remainingCount, countLabel });
  }

  return t("caseCard.entitySummary.withOthers", { count: remainingCount, name: firstName });
}

export const CaseCard = ({ id, slug, title, entity, entityNames, location, status, tags = [], entityIds, locationIds, image, thumbnailUrl, bannerUrl, bigo, viewMode = "grid", onTagClick }: CaseCardProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const entitySummary = getEntitySummary(entity, entityNames, i18n.language, t);

  // Slug-only navigation: never fall back to numeric id. The slug-only API
  // would 404 on /case/<numeric>, and the worker.ts edge redirect only fires
  // in production. Cards without a slug render as non-clickable — the missing
  // slug is a data signal that the row needs a backend backfill.
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
  const caseSlug = normalizedSlug && normalizedSlug.toLowerCase() !== "null" ? normalizedSlug : null;

  // Candidate images, best first: the uploaded rendition ladder, then the
  // deprecated thumbnail and banner URLs, then the shared placeholder
  // illustration the case detail banner also falls back to. Cases sometimes
  // carry a non-image thumbnail URL (an article/page link), so a load error must
  // fall through the rest before landing on the placeholder.
  const { candidates: imageCandidates, srcsetFor } = caseImageSources(
    image,
    thumbnailUrl,
    bannerUrl,
  );
  const [imageIndex, setImageIndex] = useState(0);

  // React reuses a card instance when a list re-sorts or refetches, so another
  // case's images can arrive on the component that already advanced past a
  // broken one. Without this the index survives and the card opens on a later
  // candidate — often the placeholder — instead of the new thumbnail.
  //
  // Keyed on the candidate list, not the raw props: a prop change that yields
  // the same list (whitespace, or a duplicate collapsing) must NOT discard an
  // error-advance, or the card would swing back to a URL known to fail.
  const candidateKey = imageCandidates.join("|");
  useEffect(() => {
    setImageIndex(0);
  }, [candidateKey]);

  // Clamped, not `?? placeholder`: if the placeholder itself fails to load,
  // advancing past it must not reset the card to a real URL that already failed.
  const imageSrc = imageCandidates[Math.min(imageIndex, imageCandidates.length - 1)];
  const isPlaceholder = imageSrc === CASE_PLACEHOLDER_IMAGE;

  // Handle image load errors by advancing to the next candidate.
  const handleImageError = () => {
    setImageIndex((i) => i + 1);
  };

  const statusLabel = t(getCaseStatusLabelKey(status));

  const handleCardClick = (e: React.MouseEvent) => {
    if (!caseSlug) return;
    // Only navigate if not clicking on an inner link
    if (!(e.target as HTMLElement).closest("a")) {
      navigate(`/case/${caseSlug}`);
    }
  };

  const cardLayout = viewMode === "list" ? "flex-col sm:flex-row h-auto" : "flex-col h-full";
  const articleLayout = viewMode === "list" ? "flex-col sm:flex-row" : "flex-col";
  const imageContainerClass = viewMode === "list" ? "h-48 sm:h-auto sm:w-1/3 shrink-0" : "h-52";

  return (
    <Card
      className={`group relative flex overflow-hidden rounded-3xl border border-border/60 bg-card shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_24px_50px_-24px_rgba(15,23,42,0.35)] focus-within:border-accent/40 cursor-pointer ${cardLayout}`}
      onClick={handleCardClick}
    >
      <article className={`flex h-full w-full ${articleLayout}`}>
        <div className={`relative overflow-hidden ${imageContainerClass}`}>
          <img
            src={imageSrc}
            // Only the uploaded ladder has a srcset, and it goes away if a load
            // error advances past it — see CaseImageSources.srcsetFor.
            srcSet={srcsetFor(imageSrc)}
            // The card box is a third of the row in list view and a grid column
            // otherwise; ~400px covers both, and the browser picks up from there.
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            // The placeholder illustration carries no information about this
            // case, so it stays out of the accessibility tree entirely rather
            // than announcing a thumbnail that does not exist.
            alt={isPlaceholder ? "" : t("caseCard.thumbnailAlt", { title })}
            loading="lazy"
            decoding="async"
            onError={handleImageError}
            className={cn(
              "h-full w-full object-cover",
              // Zoom-on-hover reads as "there is a photograph here"; it only
              // makes the placeholder illustration lurch.
              !isPlaceholder && "transition-transform duration-500 group-hover:scale-105",
              isPlaceholder && CASE_PLACEHOLDER_DARK_CLASS,
            )}
          />
          {/* Legibility scrim for the status badge over a real photograph. The
              placeholder is a near-flat light panel and needs no scrim — and in
              dark mode the inverted placeholder would tint it the wrong way. */}
          {!isPlaceholder && (
            // Main wrote this scrim as from-slate-950/30 via-slate-900/5; the
            // semantic equivalent is --foreground, which is the same near-black
            // in light and correctly inverts in dark. `white` is not a palette
            // name, so to-white/10 stays.
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-foreground/5 to-white/10" />
          )}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
            <CaseStatusBadge status={status} className="shrink-0">
              {statusLabel}
            </CaseStatusBadge>
          </div>
        </div>

        <div className="flex flex-1 flex-col bg-card min-w-0">
          <CardHeader className="space-y-2 px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
            <CaseCardTags tags={tags} onTagClick={onTagClick} />
            {/* NOTE: Dynamic case content (title, description, entity names) from Entity API
                remains in English until API-side i18n is implemented. See GitHub issue for i18n. */}
            <h3 className="line-clamp-2 text-lg font-semibold leading-8 text-foreground">
              {caseSlug ? (
                <Link
                  to={`/case/${caseSlug}`}
                  // Gradient-underline trick: a 2px accent line drawn by
                  // animating background-size, so it wraps correctly across
                  // the clamped two lines (a pseudo-element underline would
                  // only sit under the last line's box).
                  className="rounded-sm bg-gradient-to-r from-accent to-accent bg-[length:0%_2px] bg-left-bottom bg-no-repeat pb-0.5 outline-none transition-[background-size,color] duration-300 hover:text-primary group-hover:bg-[length:100%_2px] group-focus-within:bg-[length:100%_2px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {title}
                </Link>
              ) : (
                title
              )}
            </h3>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col px-4 pb-0 pt-4 sm:px-5">
            {/* No summary paragraph: the card leads with the title and the facts
                below it. The full description lives on the case detail page. */}
            <div className="mt-2 border-t border-border/70 pt-4">
              {/* This meta block is deliberately NOT branched on `viewMode` —
                  grid and list differ only in the outer layout, so every field
                  added here shows up in both /search views and on /cases. */}
              <div className="space-y-2 text-sm leading-5 text-muted-foreground">
                <EntityRow icon={User} label={entitySummary} title={entity} ids={entityIds} />
                <EntityRow icon={MapPin} label={location} ids={locationIds} />
                <BigoRow amount={bigo} />
              </div>
            </div>
          </CardContent>

          <CardFooter className="mt-auto px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            <Button variant="primary" asChild className="w-full rounded-2xl py-3" disabled={!caseSlug}>
              {caseSlug ? (
                <Link to={`/case/${caseSlug}`} onClick={(e) => e.stopPropagation()}>{t("common.viewDetails")}</Link>
              ) : (
                <span>{t("common.viewDetails")}</span>
              )}
            </Button>
          </CardFooter>
        </div>
      </article>
    </Card>
  );
};

function CaseCardTags({ tags, onTagClick }: Readonly<{ tags: string[]; onTagClick?: (tag: string) => void }>) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-1">
      {tags.slice(0, 2).map((tag) =>
        onTagClick ? (
          // Clickable tag → search refinement. stopPropagation so it doesn't
          // trigger the card's navigate-to-detail click.
          <button
            key={tag}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTagClick(tag);
            }}
            className="relative z-10 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <CaseTagBadge className="px-2.5 py-0.5">{tag}</CaseTagBadge>
          </button>
        ) : (
          <CaseTagBadge key={tag} className="px-2.5 py-0.5">
            {tag}
          </CaseTagBadge>
        ),
      )}
      {tags.length > 2 && (
        <CaseTagBadge className="px-2 py-0.5">
          +{tags.length - 2}
        </CaseTagBadge>
      )}
    </div>
  );
}

// बिगो row. Guarded on `> 0`, not just non-null: the API sends 0 for cases where
// no amount applies, and `formatBigo(0)` is the literal string "Rs 0" — showing
// that would assert a finding the case does not make. Formatting matches the case
// detail page (`caseDetail.embezzledAmount`) so the same figure reads identically
// on the card and on the record it links to.
function BigoRow({ amount }: Readonly<{ amount?: number | null }>) {
  const { t } = useTranslation();
  if (amount == null || amount <= 0) return null;
  return (
    <div className="flex min-w-0 items-center">
      <Coins className="mr-2 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      {/* The label truncates, the amount never does: `formatBigo` output is short
          and bounded ("Rs 2.49 Kharab" at the widest), and it is the part worth
          reading — clamping the whole row would eat the figure, not the label. */}
      <span className="min-w-0 truncate">{t("caseCard.bigo")}:</span>
      <span className="ml-1 shrink-0 font-semibold text-accent">
        {formatBigo(amount)}
      </span>
    </div>
  );
}

function EntityRow({ icon: Icon, label, title, ids }: Readonly<{ icon: typeof User; label: string; title?: string; ids?: string[] }>) {
  const to = ids && ids.length > 0 ? entityPath(ids[0]) : null;
  return (
    <div className="flex min-w-0 items-center">
      <Icon className="mr-2 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      {to ? (
        <Link
          to={to}
          className="block min-w-0 truncate rounded-sm py-1 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          title={title}
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </Link>
      ) : (
        <span className="block min-w-0 truncate" title={title}>
          {label}
        </span>
      )}
    </div>
  );
}
