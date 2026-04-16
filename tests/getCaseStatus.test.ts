import { describe, it, expect } from 'vitest';

/**
 * Categorizes a case based on its date fields
 * @param caseItem - The case object with date fields
 * @returns Status category: 'ongoing' | 'closed' | 'others'
 */
function getCaseStatus(caseItem: { case_start_date: string | null; case_end_date: string | null }): 'ongoing' | 'closed' | 'others' {
  const { case_start_date, case_end_date } = caseItem;
  
  // Safely handle null, undefined, and empty strings
  const hasStartDate = case_start_date && case_start_date.trim() !== '';
  const hasEndDate = case_end_date && case_end_date.trim() !== '';
  
  if (hasStartDate && !hasEndDate) {
    return 'ongoing';
  }
  
  if (hasStartDate && hasEndDate) {
    return 'closed';
  }
  
  return 'others';
}

describe('getCaseStatus', () => {
  it('should return "ongoing" when case has start_date but no end_date', () => {
    const caseItem = {
      case_start_date: '2024-01-15',
      case_end_date: null
    };
    expect(getCaseStatus(caseItem)).toBe('ongoing');
  });

  it('should return "closed" when case has both start_date and end_date', () => {
    const caseItem = {
      case_start_date: '2024-01-15',
      case_end_date: '2024-06-30'
    };
    expect(getCaseStatus(caseItem)).toBe('closed');
  });

  it('should return "others" when case has no start_date', () => {
    const caseItem = {
      case_start_date: null,
      case_end_date: null
    };
    expect(getCaseStatus(caseItem)).toBe('others');
  });

  it('should return "others" when case has end_date but no start_date', () => {
    const caseItem = {
      case_start_date: null,
      case_end_date: '2024-06-30'
    };
    expect(getCaseStatus(caseItem)).toBe('others');
  });

  it('should treat empty string as null for start_date', () => {
    const caseItem = {
      case_start_date: '',
      case_end_date: null
    };
    expect(getCaseStatus(caseItem)).toBe('others');
  });

  it('should treat empty string as null for end_date', () => {
    const caseItem = {
      case_start_date: '2024-01-15',
      case_end_date: ''
    };
    expect(getCaseStatus(caseItem)).toBe('ongoing');
  });

  it('should handle whitespace-only strings', () => {
    const caseItem = {
      case_start_date: '   ',
      case_end_date: '   '
    };
    expect(getCaseStatus(caseItem)).toBe('others');
  });
});
