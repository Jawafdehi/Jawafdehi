// Case → <CaseCard> prop mapping, shared by every surface that renders a case
// tile from search data: the /search results list and the home page's featured
// grid. Both used to keep their own copy of this mapping and they drifted — the
// home copy never passed `bigo`, so featured cards silently dropped the बिगो row
// that the same card showed on /search. One mapper means a field added for one
// surface cannot go missing on the other.
import type {
  ArchiveSearchResult,
  BilingualText,
  CaseSearchCard,
  CaseSearchCardEntity,
} from "@/types/search";
import type { CaseDetail } from "@/types/jds";
import { getSubjectEntities } from "@/utils/case-entities";
import { translateDynamicText } from "@/lib/translate-dynamic-content";

/** The badge vocabulary every case-tile surface shares. Exported so the card
 * and the featured spotlight cannot hold two different versions of it. */
export type CaseCardStatus =
  | "ongoing"
  | "resolved"
  | "under-investigation"
  | "withdrawn"
  | "dormant";

// Two vocabularies land here. The search index still stores the old three
// values (`ongoing`/`closed`/`others`) so deployed cards keep working; the case
// API serves the six-value lifecycle. `withdrawn` and `dormant` pass through as
// themselves — neither is "resolved", because nobody decided them.
const CASE_STATUS_BADGE: Record<string, CaseCardStatus> = {
  ongoing: "ongoing",
  closed: "resolved",
  concluded: "resolved",
  others: "under-investigation",
  under_investigation: "under-investigation",
  withdrawn: "withdrawn",
  dormant: "dormant",
};

function mapCaseStatus(status: string | null | undefined): CaseCardStatus {
  return (status && CASE_STATUS_BADGE[status]) || "under-investigation";
}

// Titles come off the index carrying <em> highlight marks, and occasionally
// other markup; the cards render plain text, so strip tags outright.
function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function pickText(text: BilingualText | undefined): string {
  return stripTags(text?.en || text?.ne || "");
}

export function caseSlugFromUrl(url: string): string | null {
  const match = /\/case\/([^/?#]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

type NamedEntity = { display_name: string | null; nes_id: string | null };

// A nameless entity is dropped rather than rendered as a placeholder row: the
// joined string falls back to "Unknown Entity" only when nothing at all is named.
function entityNames(entities: readonly NamedEntity[]): string[] {
  return entities.map((e) => e.display_name || e.nes_id || "").filter(Boolean);
}

function entityIds(entities: readonly { nes_id: string | null }[]): string[] {
  return entities.map((e) => e.nes_id).filter((id): id is string => Boolean(id));
}

// The subject/location split both mappings below share.
function splitEntities<T extends NamedEntity & { type?: string | null }>(
  entities: readonly T[],
  language: string,
) {
  const subject = getSubjectEntities<T>(entities, (e) => e.type);
  const location = entities.filter((e) => e.type === "location");
  const names = entityNames(subject);
  const locations = entityNames(location);
  return {
    entity: names.join(", ") || translateDynamicText("Unknown Entity", language),
    entityNames: names,
    location: locations.join(", ") || translateDynamicText("Unknown Location", language),
    entityIds: entityIds(subject),
    locationIds: entityIds(location),
  };
}

/**
 * Map a case search result onto <CaseCard> props.
 *
 * The `card` payload is denormalized into the index doc, so this is the common
 * path. It is optional, not just nullable: docs indexed before the field
 * existed carry no `card` at all, and those fall back to the case status on
 * `extra` and to the slug parsed out of the result URL.
 */
export function caseCardPropsFromSearchResult(
  result: ArchiveSearchResult,
  language: string,
) {
  const card = result.card;
  return {
    id: result.id,
    slug: card?.slug || caseSlugFromUrl(result.url),
    title: card?.title || pickText(result.title) || result.id,
    status: mapCaseStatus(card?.status || result.extra.case_status),
    tags: card?.tags || [],
    image: card?.thumbnail ?? null,
    thumbnailUrl: card?.thumbnail_url || undefined,
    bannerUrl: card?.banner_url || undefined,
    bigo: card?.bigo,
    ...splitEntities<CaseSearchCardEntity>(card?.entities ?? [], language),
  };
}

/**
 * Fallback for older indexed docs with no `card` payload: derive the same props
 * from a fetched case detail. The lifecycle is read off the API's own `status`
 * — it is derived server-side from the case's stages, and a case running
 * several dockets has no single end date the client could infer it from.
 *
 * Kept in step with {@link caseCardPropsFromSearchResult} — the two feed the
 * same <CaseCard>, so a field added to one must be added to both or a case
 * silently loses it on whichever path it happens to take.
 */
export function caseCardPropsFromCaseDetail(
  detail: CaseDetail,
  result: ArchiveSearchResult,
  language: string,
  fallbackSlug?: string,
) {
  return {
    id: result.id,
    slug: detail.slug || fallbackSlug || null,
    title: detail.title || pickText(result.title),
    status: mapCaseStatus(detail.status),
    tags: detail.tags || [],
    image: detail.thumbnail ?? null,
    thumbnailUrl: detail.thumbnail_url || undefined,
    bannerUrl: detail.banner_url || undefined,
    bigo: detail.bigo,
    ...splitEntities(detail.entities || [], language),
  };
}
