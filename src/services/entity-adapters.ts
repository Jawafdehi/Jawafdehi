/**
 * Entity Data Adapters
 *
 * This module provides adapter functions to transform entity backend data
 * into UI-friendly formats, including merging evidence and sources.
 *
 * References:
 * - Backend types: https://github.com/Jawafdehi/NepalEntityService-Tundikhel/blob/main/src/common/nes-types.ts
 */

import type { Entity, Attribution, Name, EntityType } from '@/types/entity';

// ============================================================================
// schema.org JSON-LD -> Entity adapter
// ============================================================================

// The v2 API serves entities as schema.org JSON-LD ({ "@id", "@type", name: {en, ne}, ... }),
// but the SPA's Entity model is the NES shape (names: Name[], pictures: [], contacts: [], ...).
// Without this adaptation, consumers that read entity.names (e.g. getPrimaryName) throw
// "Cannot read properties of undefined (reading 'find')" and take the whole case page down.
// Map the fields the UI actually reads (name -> names[], @id/@type -> type, empty arrays for the
// collections it iterates) and drop the rest of the schema.org payload, which the case/entity
// views don't consume.
type JsonLdName = string | { en?: string | null; ne?: string | null } | null | undefined;

interface EntityJsonLd {
  '@id'?: string;
  '@type'?: string;
  id?: string;
  name?: JsonLdName;
  description?: unknown;
  dateCreated?: string;
  [k: string]: unknown;
}

// schema.org `description` is usually a plain string, occasionally a { en, ne } object (whose
// values may themselves be strings or {value}). The SPA's LangText nests values as { en: { value } },
// so getDescription() reads `.en.value`; map both forms or descriptions render blank.
function toLangText(raw: unknown): Entity['description'] {
  const pick = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : (v as { value?: string } | null | undefined)?.value ?? undefined;
  if (typeof raw === 'string') return raw ? { en: { value: raw } } : null;
  if (raw && typeof raw === 'object') {
    const d = raw as { en?: unknown; ne?: unknown };
    const enVal = pick(d.en);
    const neVal = pick(d.ne);
    if (enVal || neVal) {
      return {
        ...(enVal ? { en: { value: enVal } } : {}),
        ...(neVal ? { ne: { value: neVal } } : {}),
      };
    }
  }
  return null;
}

// Prefer the type embedded in the IRI path (.../entity/<type>/<slug>) — it is exactly the SPA's
// EntityType enum — and fall back to the schema.org @type for anything unexpected.
function entityTypeFromJsonLd(iri: string, atType: string): EntityType {
  const fromIri = iri.match(/\/entity\/(person|organization|location)\//)?.[1];
  if (fromIri) return fromIri as EntityType;
  if (/organization/i.test(atType)) return 'organization';
  if (/place|location|city|country|state|administrativearea/i.test(atType)) return 'location';
  return 'person';
}

export function jsonLdToEntity(input: unknown): Entity {
  const raw = (input ?? {}) as EntityJsonLd;
  const iri = raw['@id'] ?? raw.id ?? '';
  const slug = iri.split('/').filter(Boolean).pop() ?? iri;
  const type = entityTypeFromJsonLd(iri, String(raw?.['@type'] ?? ''));

  const rawName = raw?.name;
  const en = typeof rawName === 'string' ? rawName : rawName?.en ?? undefined;
  const ne = typeof rawName === 'string' ? undefined : rawName?.ne ?? undefined;
  const names: Name[] =
    en || ne
      ? [{ kind: 'PRIMARY', ...(en ? { en: { full: en } } : {}), ...(ne ? { ne: { full: ne } } : {}) }]
      : [];

  const description = toLangText(raw.description);
  const createdAt = typeof raw.dateCreated === 'string' ? raw.dateCreated : '';

  // Empty collections keep the array-iterating consumers (pictures/contacts/...) safe. JSON-LD
  // carries no version history, so version_summary is a neutral placeholder (version 0, no author)
  // — filled rather than cast away so the Entity contract stays fully type-checked.
  return {
    id: iri,
    slug,
    type,
    names,
    pictures: [],
    contacts: [],
    identifiers: [],
    tags: [],
    attributions: [],
    sub_type: null,
    short_description: null,
    description,
    created_at: createdAt,
    version_summary: {
      entity_or_relationship_id: iri,
      type: 'ENTITY',
      version_number: 0,
      author: { slug: '', name: null, id: '' },
      change_description: '',
      created_at: createdAt,
      id: '',
    },
  };
}

// ============================================================================
// Evidence & Sources Types
// ============================================================================

export type SourceType = 
  | 'document'
  | 'article' 
  | 'photo'
  | 'video'
  | 'legal_record'
  | 'letter'
  | 'report'
  | 'website'
  | 'other';

export interface EvidenceAndSource {
  id: string;
  title: string;
  type: SourceType;
  description?: string;
  url?: string;
  file_name?: string;
  published_date?: string;
  added_by?: string;
  source_name?: string;
  notes?: string;
}

// ============================================================================
// Evidence & Sources Merger
// ============================================================================

/**
 * Merge documentary evidence and source references into a single list
 * 
 * This function combines:
 * 1. Entity attributions (from entity.attributions)
 * 2. Any future evidence fields (from entity.evidence if added to backend)
 * 
 * Into a unified "Evidence & Sources" list for UI display.
 * 
 * @param entity - Entity object from the entity backend
 * @returns Array of merged evidence and source items
 * 
 * @example
 * ```typescript
 * const entity = await getEntityById('some-slug');
 * const sources = mergeEvidenceAndSources(entity);
 * 
 * sources.forEach(source => {
 *   console.log(`${source.title} (${source.type})`);
 * });
 * ```
 */
export function mergeEvidenceAndSources(entity: Entity): EvidenceAndSource[] {
  const merged: EvidenceAndSource[] = [];
  
  // Process attributions (source references)
  // Attribution has: title (LangText1) and details (LangText | null)
  if (entity.attributions && entity.attributions.length > 0) {
    entity.attributions.forEach((attribution: Attribution, index: number) => {
      const source: EvidenceAndSource = {
        id: `attribution-${index}`,
        title: attribution.title?.en?.value || 
               attribution.title?.ne?.value || 
               'Unnamed Source',
        type: inferSourceType(attribution),
        description: attribution.details?.en?.value || 
                    attribution.details?.ne?.value,
      };
      
      merged.push(source);
    });
  }
  
  // TODO: When backend adds explicit evidence fields, process them here
  // Example:
  // if (entity.evidence && entity.evidence.length > 0) {
  //   entity.evidence.forEach((item, index) => {
  //     merged.push({
  //       id: `evidence-${index}`,
  //       title: item.title,
  //       type: item.type,
  //       ...
  //     });
  //   });
  // }
  
  return merged;
}

/**
 * Infer source type from attribution data
 * 
 * @param attribution - Attribution object
 * @returns Inferred source type
 */
function inferSourceType(attribution: Attribution): SourceType {
  const title = (attribution.title?.en?.value || attribution.title?.ne?.value || '').toLowerCase();
  const details = (attribution.details?.en?.value || attribution.details?.ne?.value || '').toLowerCase();
  
  // Infer from title or details
  if (title.includes('video') || details.includes('video')) return 'video';
  if (title.includes('photo') || title.includes('image') || details.includes('photo')) return 'photo';
  if (title.includes('article') || details.includes('article')) return 'article';
  if (title.includes('court') || title.includes('legal') || details.includes('legal')) return 'legal_record';
  if (title.includes('report') || details.includes('report')) return 'report';
  if (title.includes('letter') || details.includes('letter')) return 'letter';
  
  // Default to document
  return 'document';
}

/**
 * Format source type for display
 * 
 * @param type - Source type
 * @returns Formatted string
 */
export function formatSourceType(type: SourceType): string {
  const mapping: Record<SourceType, string> = {
    document: 'Document',
    article: 'Article',
    photo: 'Photo',
    video: 'Video',
    legal_record: 'Legal Record',
    letter: 'Letter',
    report: 'Report',
    website: 'Website',
    other: 'Other'
  };
  
  return mapping[type] || 'Unknown';
}

/**
 * Group sources by type
 * 
 * @param sources - Array of evidence and sources
 * @returns Sources grouped by type
 */
export function groupSourcesByType(
  sources: EvidenceAndSource[]
): Record<SourceType, EvidenceAndSource[]> {
  const grouped: Record<SourceType, EvidenceAndSource[]> = {
    document: [],
    article: [],
    photo: [],
    video: [],
    legal_record: [],
    letter: [],
    report: [],
    website: [],
    other: []
  };
  
  sources.forEach(source => {
    grouped[source.type].push(source);
  });
  
  return grouped;
}

/**
 * Sort sources by date (most recent first)
 * 
 * @param sources - Array of evidence and sources
 * @returns Sorted array
 */
export function sortSourcesByDate(sources: EvidenceAndSource[]): EvidenceAndSource[] {
  return [...sources].sort((a, b) => {
    if (!a.published_date) return 1;
    if (!b.published_date) return -1;
    return new Date(b.published_date).getTime() - new Date(a.published_date).getTime();
  });
}
