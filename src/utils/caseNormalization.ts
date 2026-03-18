/**
 * Case Normalization Utilities
 * 
 * Handles normalization of case data between unified and legacy formats.
 * Ensures consistent data structure regardless of backend response format.
 */

import type { Case, JawafEntity, EntityRelationshipType } from '@/types/jds';

/**
 * Normalize a case to ensure consistent unified entities format.
 * 
 * Handles both unified format (entities array with type field) and legacy format
 * (separate alleged_entities and related_entities arrays).
 * 
 * @param caseData - Raw case data from API response
 * @returns Normalized case with unified entities format
 */
export function normalizeCase(caseData: Case): Case {
  // If case already has unified entities format, return as-is
  if (caseData.entities && caseData.entities.length > 0) {
    // Verify entities have proper type field
    const hasValidTypes = caseData.entities.every(entity => 
      entity.type && ['alleged', 'related', 'witness', 'opposition', 'victim'].includes(entity.type)
    );
    
    if (hasValidTypes) {
      return {
        ...caseData,
        // Ensure legacy fields are preserved for backward compatibility
        alleged_entities: caseData.alleged_entities || [],
        related_entities: caseData.related_entities || [],
      };
    }
  }
  
  // Handle legacy format - transform to unified format
  const unifiedEntities: JawafEntity[] = [];
  
  // Add alleged entities with type assignment
  if (caseData.alleged_entities && caseData.alleged_entities.length > 0) {
    const allegedWithType = caseData.alleged_entities.map(entity => ({
      ...entity,
      type: 'alleged' as EntityRelationshipType,
    }));
    unifiedEntities.push(...allegedWithType);
  }
  
  // Add related entities with type assignment
  if (caseData.related_entities && caseData.related_entities.length > 0) {
    const relatedWithType = caseData.related_entities.map(entity => ({
      ...entity,
      type: 'related' as EntityRelationshipType,
    }));
    unifiedEntities.push(...relatedWithType);
  }
  
  // Handle edge case: empty entities arrays
  const normalizedEntities = unifiedEntities.length > 0 ? unifiedEntities : [];
  
  return {
    ...caseData,
    entities: normalizedEntities,
    // Preserve legacy fields for backward compatibility
    alleged_entities: caseData.alleged_entities || [],
    related_entities: caseData.related_entities || [],
  };
}

/**
 * Check if a case uses the unified entities format.
 * 
 * @param caseData - Case data to check
 * @returns True if case uses unified format, false if legacy format
 */
export function isUnifiedFormat(caseData: Case): boolean {
  return !!(
    caseData.entities && 
    caseData.entities.length > 0 &&
    caseData.entities.every(entity => entity.type)
  );
}

/**
 * Check if a case uses the legacy entities format.
 * 
 * @param caseData - Case data to check
 * @returns True if case uses legacy format, false if unified format
 */
export function isLegacyFormat(caseData: Case): boolean {
  return !!(
    (caseData.alleged_entities && caseData.alleged_entities.length > 0) ||
    (caseData.related_entities && caseData.related_entities.length > 0)
  ) && (!caseData.entities || caseData.entities.length === 0);
}

/**
 * Get entities by relationship type from normalized case data.
 * 
 * @param caseData - Normalized case data
 * @param type - Entity relationship type to filter by
 * @returns Array of entities matching the specified type
 */
export function getEntitiesByType(caseData: Case, type: EntityRelationshipType): JawafEntity[] {
  const normalizedCase = normalizeCase(caseData);
  return normalizedCase.entities.filter(entity => entity.type === type);
}

/**
 * Get all alleged entities from a case (unified and legacy format support).
 * 
 * @param caseData - Case data (any format)
 * @returns Array of alleged entities
 */
export function getAllegedEntities(caseData: Case): JawafEntity[] {
  return getEntitiesByType(caseData, 'alleged');
}

/**
 * Get all related entities from a case (unified and legacy format support).
 * 
 * @param caseData - Case data (any format)
 * @returns Array of related entities
 */
export function getRelatedEntities(caseData: Case): JawafEntity[] {
  return getEntitiesByType(caseData, 'related');
}

/**
 * Get all non-location entities from a case (unified and legacy format support).
 * 
 * @param caseData - Case data (any format)
 * @returns Array of all non-location entities
 */
export function getAllNonLocationEntities(caseData: Case): JawafEntity[] {
  const normalizedCase = normalizeCase(caseData);
  return normalizedCase.entities;
}