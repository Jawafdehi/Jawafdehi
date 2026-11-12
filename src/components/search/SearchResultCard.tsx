import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Calendar, Landmark, Library } from "@/components/icons";
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
  materialTypeForSchemaClass,
  materialTypeForSource,
} from "@/lib/material-series-labels";
import { materialTypeKeyFor } from "@/lib/material-type-labels";
import {
  renderSnippetHighlights,
  renderTextHighlights,
} from "@/lib/search-highlight";
import {
  formatLedgerDate,
  pickLocalized,
  pickLocalizedRaw,
  resolveMaterialDate,
  sourceFromMaterialUrl,
} from "@/lib/materials-landing";
import { SITE_URL } from "@/utils/seo";
import type { ArchiveSearchResult, BilingualText } from "@/types/search";
import { getCaseById } from "@/services/jds-api";
import { cn } from "@/lib/utils";
import {
  caseCardPropsFromCaseDetail,
  caseCardPropsFromSearchResult,
} from "@/lib/case-card-props";
import { toggleArchiveSearchParam } from "@/utils/archive-search-params";
import { entityKindFor, humanizeEntityType } from "@/utils/entity-helpers";
import { EntityIdentity } from "@/components/EntityIdentity";
import { entityImageUrl } from "@/lib/entity-jsonld";
import { http } from "@/services/http";

// Both the /search list and card views render the same components; `viewMode`
// only decides whether the shared <CaseCard> lays out horizontally (list) or as
// a vertical tile (card), and which chrome the generic (non-case) card uses.
export type SearchViewMode = "list" | "card";

// Auto-language: prefer English, fall back to Nepali (no toggle). Strips the HTML
// <em> highlight tags that snippets carry so we render plain text.
// Search highlights arrive as <em> marks; the cards render plain text.
const stripHighlight = (value: string) => value.replace(/<\/?em>/g, "");

function pickLang(text: BilingualText | undefined): string {
  return stripHighlight(text?.en || text?.ne || "");
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
// shared rich card; entities get the avatar card.
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
  if (result.type === "entity") return <EntityResultCard result={result} viewMode={viewMode} />;
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
  // The query text, for highlighting the fields the API does not mark up.
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const source = sourceFromMaterialUrl(result.url);
  // The KIND is required alongside the source: one source token can carry
  // several shelves, and 210 of the 228 `official_report` documents are not
  // annual reports. Absent on materials from corpora that classify nothing.
  const series = source
    ? seriesBySource(source, result.extra?.dataset_bucket)
    : undefined;
  // Every material names its series. A curated-registry source keeps its
  // editorial name ("CIAA press releases" — it also has a browsable
  // ?series= page); every other source resolves to its collection's document
  // type, from the source map, falling back to the schema.org class the index
  // always carries. Both read from one label catalogue, so nothing here
  // invents copy.
  const materialType =
    (source ? materialTypeForSource(source) : null) ??
    materialTypeForSchemaClass(result.extra.type);
  const seriesName = series
    ? pickLocalized(series.name, language)
    : t(
        `dataQuality.materialsByType.type.${materialTypeKeyFor(materialType)}`,
        // Last resort for a catalogue gap: the type token read plainly, so a
        // missing entry degrades the wording rather than dropping the line.
        materialType.replaceAll("_", " "),
      );
  const dateLabel =
    formatLedgerDate(resolveMaterialDate(result.extra), language) ||
    t("materialsLanding.series.undated", "Undated");
  // The publishing office — the catalogue's "creator", a different axis from
  // the series: CIAA owns two series (press releases AND annual reports), and
  // one series spans several offices (press releases come from CIAA, CIB and
  // DMLI). Neither line implies the other, so the card carries both.
  const officeLabel = t(
    `dataQuality.materialsBySource.source.${sourceKeyFor(source ?? "")}`,
    source ?? "",
  );
  const title =
    pickLocalized(result.title, language) ||
    t("materialsLanding.recent.untitled", "Untitled document");
  // Snippets only arrive on text queries; pickLocalized strips the <em>
  // highlight markup they carry. Many press-release bodies open with the title
  // sentence, so a snippet that merely echoes the title — in either truncation
  // direction — adds nothing; drop it.
  const rawSnippet = pickLocalized(result.snippet, language);
  const isTitleEcho =
    rawSnippet.startsWith(title) || title.startsWith(rawSnippet);

  const metaRows = [
    {
      icon: Library,
      label: t("archiveSearch.materialSeries", "Series"),
      value: renderTextHighlights(seriesName, query),
    },
    {
      icon: Landmark,
      label: t("archiveSearch.materialSource", "Source"),
      value: renderTextHighlights(officeLabel, query),
    },
    {
      icon: Calendar,
      label: t("archiveSearch.materialDate", "Date"),
      value: dateLabel,
    },
  ].filter((row) => Boolean(row.value));

  return (
    <MaterialCard
      title={title}
      titleNode={renderTextHighlights(title, query)}
      href={result.url}
      metaRows={metaRows}
      // The API marks the snippet's matches itself, including stemmed and
      // fuzzy hits, so those are rendered as given rather than re-guessed.
      description={
        isTitleEcho
          ? undefined
          : renderSnippetHighlights(pickLocalizedRaw(result.snippet, language))
      }
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
      // Absent on documents indexed before the indexer carried parties, so
      // both of these are routinely undefined — the card drops the row rather
      // than showing an empty one.
      defendant={result.extra.parties?.defendant}
      plaintiff={result.extra.parties?.plaintiff}
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
        {...caseCardPropsFromSearchResult(result, i18n.language)}
      />
    );
  }
  if (caseDetail) {
    return (
      <CaseCard
        viewMode={caseCardViewMode}
        onTagClick={handleTagClick}
        {...caseCardPropsFromCaseDetail(caseDetail, result, i18n.language, caseSlug)}
      />
    );
  }
  // Only show the loading placeholder while the detail fetch is genuinely in
  // flight. If it settles with no data (e.g. the request failed), fall through
  // to the generic card instead of getting stuck on the skeleton forever.
  if (isFetching) {
    return viewMode === "card" ? <CaseCardSkeleton /> : <SearchResultCardSkeleton />;
  }
  return <GenericResultCard result={result} viewMode={viewMode} />;
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
          ? "h-full rounded-2xl border border-border/70 bg-surface p-5 duration-200 hover:border-border hover:bg-muted/30"
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
            "line-clamp-2 break-words font-normal text-primary",
            isCard ? "text-[17px] leading-6" : "text-base leading-6",
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

// ---------------------------------------------------------------------------
// Entity hits — avatar, name, supporting line
// ---------------------------------------------------------------------------

const GENERIC_KIND_LABELS = new Set(["Entity", "Person", "Organization", "Place", "Location", "Administrative Area"]);

// The directory pattern: a leading avatar, the name as the headline, and one
// muted supporting line. No type pill and no "View" footer — the glyph shows the
// kind at a glance, the caption says it in words, and the whole card is the link.
function EntityResultCard({
  result,
  viewMode,
}: Readonly<{ result: ArchiveSearchResult; viewMode: SearchViewMode }>) {
  const { t } = useTranslation();
  const isCard = viewMode === "card";
  const kind = entityKindFor(result.extra.type);
  const title = formatSimpleTitle(result);
  // pickLang shows the English name when there is one, so the Nepali spelling is
  // the alternate. Place-kind hits are NOT exempt: they carry real bilingual
  // names in the index ("Banke"/"बाँके", "Nepal"/"नेपाल"), and dropping the
  // second script on a Nepali-first site loses the more useful of the two. Only
  // the legacy `extra.type === "location"` documents ever held an IRI in the
  // title, and formatSimpleTitle already unwraps those.
  const { en, ne } = result.title;
  const alternate = en && ne && en !== ne ? stripHighlight(ne) : null;
  // Generic kinds are localised; a specific subtype ("District", "Government
  // Organization") is shown as the index names it, since only the three kinds
  // have translations.
  const humanized = humanizeEntityType(result.extra.type);
  const kindLabel = GENERIC_KIND_LABELS.has(humanized) ? t(`entityDetail.${kind}`) : humanized;
  const supporting = [kindLabel, simpleMetadata(result)].filter(Boolean).join(" · ");
  const image = useEntityImage(result, kind);

  return (
    // A white card on a hairline, left-aligned: the avatar, then the name in
    // a light 17px and one grey line of what it is. The search page's cards
    // share this shell (materials and court cases read the same way), so a
    // results grid is one family whatever the tab.
    <article
      className={cn(
        "group relative flex overflow-hidden border border-border/70 bg-surface transition-colors duration-200 hover:border-border hover:bg-muted/30 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        isCard
          ? "h-full flex-row items-start gap-4 rounded-2xl p-5 sm:min-h-[7.5rem]"
          : "min-h-20 flex-row items-center gap-4 rounded-xl p-4",
      )}
    >
      <EntityIdentity
        kind={kind}
        src={image}
        layout="row"
        nameAs="h3"
        nameClassName="text-[17px] font-normal leading-6"
        alternate={alternate}
        name={
          <Link
            to={result.url}
            className="rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span aria-hidden="true" className="absolute inset-0" />
            {title}
          </Link>
        }
      >
        <p className="mt-1.5 break-words text-sm leading-5 text-muted-foreground">{supporting}</p>
      </EntityIdentity>
    </article>
  );
}

// The entity's picture, for the avatar. The search index does not carry it yet,
// so a person or organisation card reads the record itself — under the SAME
// query key as the entity page, so opening the card then renders from cache.
// Places never have a picture and skip the request; so does any hit whose index
// document already names one.
function useEntityImage(result: ArchiveSearchResult, kind: ReturnType<typeof entityKindFor>) {
  const tail = result.url.startsWith("/entity/") ? result.url.slice("/entity/".length) : "";
  const fromIndex = result.extra.image;
  const { data } = useQuery({
    queryKey: ["entity-record", tail],
    queryFn: async () => (await http.get<Record<string, unknown>>(`/api/entities/${tail}`)).data,
    enabled: !fromIndex && Boolean(tail) && kind !== "location",
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  return fromIndex ?? entityImageUrl(data);
}

// The entity tab's card while it loads: the same white hairline card as
// EntityResultCard, the round avatar, a name and one grey line.
export function EntityResultCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-row items-start gap-4 rounded-2xl border border-border/70 bg-surface p-5 sm:min-h-[7.5rem]"
    >
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2 pt-1">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

// The documents tab's row while it loads: the material card's white hairline
// box, a title, the series / source / date rows with their icons, and the
// share button's slot at the top right.
export function SearchResultCardSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-2xl border border-border/70 bg-surface p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="ml-auto h-5 w-5 shrink-0 rounded-full" />
      </div>
      <div className="mt-4 space-y-2.5">
        {["w-32", "w-56", "w-36"].map((width) => (
          <div key={width} className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
            <Skeleton className={`h-3.5 ${width}`} />
          </div>
        ))}
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
