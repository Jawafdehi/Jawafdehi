import { describe, it, expect } from 'vitest';
import {
  isCourtCaseRef,
  courtRefCandidates,
  parseCourtCaseRef,
} from './courtCaseRef';

describe('isCourtCaseRef', () => {
  it('matches bare court case numbers', () => {
    expect(isCourtCaseRef('081-CR-0116')).toBe(true);
    expect(isCourtCaseRef('81-cr-116')).toBe(true);
  });

  it('rejects slugs, numeric ids, and malformed values', () => {
    expect(isCourtCaseRef('case-081-cr-0090-389ad1')).toBe(false);
    expect(isCourtCaseRef('438')).toBe(false);
    expect(isCourtCaseRef('special:081-CR-0116')).toBe(false);
    expect(isCourtCaseRef('93-068-0194')).toBe(false); // numeric middle segment
    expect(isCourtCaseRef(undefined)).toBe(false);
  });
});

describe('courtRefCandidates', () => {
  it('probes special before supreme', () => {
    expect(courtRefCandidates('081-CR-0116')).toEqual([
      'special:081-CR-0116',
      'supreme:081-CR-0116',
    ]);
  });
});

describe('parseCourtCaseRef', () => {
  it('parses canonical @id IRIs', () => {
    expect(
      parseCourtCaseRef('https://jawafdehi.org/courtcase/special/080-cr-0111'),
    ).toEqual({ court: 'special', caseNumber: '080-cr-0111' });
    expect(
      parseCourtCaseRef('https://jawafdehi.org/courtcase/supreme/078-wc-0123/'),
    ).toEqual({ court: 'supreme', caseNumber: '078-wc-0123' });
  });

  it('rejects the retired colon spelling (IRIs are the only format)', () => {
    expect(parseCourtCaseRef('special:081-CR-0116')).toBeNull();
    expect(parseCourtCaseRef('supreme:078-WC-0123')).toBeNull();
  });

  it('rejects non-court refs', () => {
    expect(parseCourtCaseRef(undefined)).toBeNull();
    expect(parseCourtCaseRef('')).toBeNull();
    expect(parseCourtCaseRef('081-CR-0116')).toBeNull();
    expect(parseCourtCaseRef('special:')).toBeNull();
    expect(parseCourtCaseRef('https://jawafdehi.org/entity/person/foo')).toBeNull();
  });

  it('fails closed on malformed input instead of throwing', () => {
    // Lone % in an IRI segment would make decodeURIComponent throw URIError.
    expect(
      parseCourtCaseRef('https://jawafdehi.org/courtcase/special/080%-cr'),
    ).toBeNull();
  });
});


