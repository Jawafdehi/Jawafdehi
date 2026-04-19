import { describe, it, expect } from 'vitest';

// Import the types and constants to test the function
type EvidenceGroup = 'primary' | 'legal' | 'secondary';

const PRIMARY_TYPES: readonly string[] = [
  'OFFICIAL_GOVERNMENT',
  'FINANCIAL_FORENSIC',
  'INTERNAL_CORPORATE',
  'INVESTIGATIVE_REPORT'
] as const;

const LEGAL_TYPES: readonly string[] = [
  'LEGAL_COURT_ORDER',
  'LEGAL_PROCEDURAL',
  'LEGISLATIVE_DOC'
] as const;

const SECONDARY_TYPES: readonly string[] = [
  'MEDIA_NEWS',
  'PUBLIC_COMPLAINT',
  'SOCIAL_MEDIA',
  'OTHER_VISUAL'
] as const;

/**
 * Classifies a document source into an evidentiary tier based on source_type.
 * 
 * @param sourceType - The source_type field from DocumentSource (can be null/undefined)
 * @returns The evidence group: 'primary', 'legal', or 'secondary'
 */
function getEvidenceGroup(sourceType: string | null | undefined): EvidenceGroup {
  if (!sourceType) return 'secondary';
  
  if (PRIMARY_TYPES.includes(sourceType)) return 'primary';
  if (LEGAL_TYPES.includes(sourceType)) return 'legal';
  if (SECONDARY_TYPES.includes(sourceType)) return 'secondary';
  
  // Unknown source_type defaults to secondary
  return 'secondary';
}

describe('getEvidenceGroup', () => {
  describe('Primary Types', () => {
    it('should classify OFFICIAL_GOVERNMENT as primary', () => {
      expect(getEvidenceGroup('OFFICIAL_GOVERNMENT')).toBe('primary');
    });

    it('should classify FINANCIAL_FORENSIC as primary', () => {
      expect(getEvidenceGroup('FINANCIAL_FORENSIC')).toBe('primary');
    });

    it('should classify INTERNAL_CORPORATE as primary', () => {
      expect(getEvidenceGroup('INTERNAL_CORPORATE')).toBe('primary');
    });

    it('should classify INVESTIGATIVE_REPORT as primary', () => {
      expect(getEvidenceGroup('INVESTIGATIVE_REPORT')).toBe('primary');
    });
  });

  describe('Legal Types', () => {
    it('should classify LEGAL_COURT_ORDER as legal', () => {
      expect(getEvidenceGroup('LEGAL_COURT_ORDER')).toBe('legal');
    });

    it('should classify LEGAL_PROCEDURAL as legal', () => {
      expect(getEvidenceGroup('LEGAL_PROCEDURAL')).toBe('legal');
    });

    it('should classify LEGISLATIVE_DOC as legal', () => {
      expect(getEvidenceGroup('LEGISLATIVE_DOC')).toBe('legal');
    });
  });

  describe('Secondary Types', () => {
    it('should classify MEDIA_NEWS as secondary', () => {
      expect(getEvidenceGroup('MEDIA_NEWS')).toBe('secondary');
    });

    it('should classify PUBLIC_COMPLAINT as secondary', () => {
      expect(getEvidenceGroup('PUBLIC_COMPLAINT')).toBe('secondary');
    });

    it('should classify SOCIAL_MEDIA as secondary', () => {
      expect(getEvidenceGroup('SOCIAL_MEDIA')).toBe('secondary');
    });

    it('should classify OTHER_VISUAL as secondary', () => {
      expect(getEvidenceGroup('OTHER_VISUAL')).toBe('secondary');
    });
  });

  describe('Edge Cases', () => {
    it('should default null to secondary', () => {
      expect(getEvidenceGroup(null)).toBe('secondary');
    });

    it('should default undefined to secondary', () => {
      expect(getEvidenceGroup(undefined)).toBe('secondary');
    });

    it('should default unknown type to secondary', () => {
      expect(getEvidenceGroup('UNKNOWN_TYPE')).toBe('secondary');
    });

    it('should default empty string to secondary', () => {
      expect(getEvidenceGroup('')).toBe('secondary');
    });
  });
});
