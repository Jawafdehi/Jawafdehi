/**
 * NES Data Adapters
 * 
 * This module provides adapter functions to transform NES backend data
 * into UI-friendly formats, including merging evidence and sources.
 * 
 * References:
 * - Backend types: https://github.com/Jawafdehi/NepalEntityService-Tundikhel/blob/main/src/common/nes-types.ts
 */

import type { Entity, Attribution } from '@/types/nes';

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
 * @param entity - Entity object from NES backend
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
  // Attribution in NES has: title (LangText1) and details (LangText | null)
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
