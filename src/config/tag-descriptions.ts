/**
 * Tag Descriptions
 * 
 * Human-readable descriptions for entity tags in both English and Nepali
 */

export interface TagDescription {
  en: string;
  ne: string;
}

export const TAG_DESCRIPTIONS: Record<string, TagDescription> = {
  // Federal Election 2082 Tags
  'federal-election-2082-candidate': {
    en: 'A candidate in Federal election, 2082 B.S.',
    ne: 'संघीय निर्वाचन, २०८२ बि.सं. मा उम्मेदवार',
  },
  'federal-election-2082-elected': {
    en: 'A winner in Federal election, 2082 B.S.',
    ne: 'संघीय निर्वाचन, २०८२ बि.सं. मा विजयी',
  },
  
  // Federal Election 2079 Tags
  'federal-election-2079-candidate': {
    en: 'A candidate in Federal election, 2079 B.S.',
    ne: 'संघीय निर्वाचन, २०७९ बि.सं. मा उम्मेदवार',
  },
  'federal-election-2079-elected': {
    en: 'A winner in Federal election, 2079 B.S.',
    ne: 'संघीय निर्वाचन, २०७९ बि.सं. मा विजयी',
  },
  
  // Provincial Election 2079 Tags
  'provincial-election-2079-candidate': {
    en: 'A candidate in Provincial election, 2079 B.S.',
    ne: 'प्रदेश निर्वाचन, २०७९ बि.सं. मा उम्मेदवार',
  },
  'provincial-election-2079-elected': {
    en: 'A winner in Provincial election, 2079 B.S.',
    ne: 'प्रदेश निर्वाचन, २०७९ बि.सं. मा विजयी',
  },
  
  // Local Election 2079 Tags
  'local-election-2079-candidate': {
    en: 'A candidate in Local election, 2079 B.S.',
    ne: 'स्थानीय निर्वाचन, २०७९ बि.सं. मा उम्मेदवार',
  },
  'local-election-2079-elected': {
    en: 'A winner in Local election, 2079 B.S.',
    ne: 'स्थानीय निर्वाचन, २०७९ बि.सं. मा विजयी',
  },
  
  // Federal Election 2074 Tags
  'federal-election-2074-candidate': {
    en: 'A candidate in Federal election, 2074 B.S.',
    ne: 'संघीय निर्वाचन, २०७४ बि.सं. मा उम्मेदवार',
  },
  'federal-election-2074-elected': {
    en: 'A winner in Federal election, 2074 B.S.',
    ne: 'संघीय निर्वाचन, २०७४ बि.सं. मा विजयी',
  },
  
  // Provincial Election 2074 Tags
  'provincial-election-2074-candidate': {
    en: 'A candidate in Provincial election, 2074 B.S.',
    ne: 'प्रदेश निर्वाचन, २०७४ बि.सं. मा उम्मेदवार',
  },
  'provincial-election-2074-elected': {
    en: 'A winner in Provincial election, 2074 B.S.',
    ne: 'प्रदेश निर्वाचन, २०७४ बि.सं. मा विजयी',
  },
  
  // Local Election 2074 Tags
  'local-election-2074-candidate': {
    en: 'A candidate in Local election, 2074 B.S.',
    ne: 'स्थानीय निर्वाचन, २०७४ बि.सं. मा उम्मेदवार',
  },
  'local-election-2074-elected': {
    en: 'A winner in Local election, 2074 B.S.',
    ne: 'स्थानीय निर्वाचन, २०७४ बि.सं. मा विजयी',
  },
  
  // Political Party Tags
  'political-party-member': {
    en: 'A member of a political party',
    ne: 'राजनीतिक दलको सदस्य',
  },
  'political-party-leader': {
    en: 'A leader of a political party',
    ne: 'राजनीतिक दलको नेता',
  },
  
  // Government Position Tags
  'government-official': {
    en: 'A government official with administrative responsibilities',
    ne: 'प्रशासनिक जिम्मेवारी भएको सरकारी अधिकारी',
  },
  'minister': {
    en: 'A government minister',
    ne: 'सरकारी मन्त्री',
  },
  'state-minister': {
    en: 'A state minister',
    ne: 'राज्य मन्त्री',
  },
  'secretary': {
    en: 'A government secretary',
    ne: 'सरकारी सचिव',
  },
  
  // Parliament Tags
  'member-of-parliament': {
    en: 'A member of the federal parliament',
    ne: 'संघीय संसदको सदस्य',
  },
  'provincial-assembly-member': {
    en: 'A member of a provincial assembly',
    ne: 'प्रदेश सभाको सदस्य',
  },
  
  // Local Government Tags
  'mayor': {
    en: 'A mayor of a municipality',
    ne: 'नगरपालिकाको मेयर',
  },
  'deputy-mayor': {
    en: 'A deputy mayor of a municipality',
    ne: 'नगरपालिकाको उपमेयर',
  },
  'ward-chairperson': {
    en: 'A chairperson of a ward',
    ne: 'वडाको अध्यक्ष',
  },
  
  // Entity Type Tags
  'person': {
    en: 'An individual person',
    ne: 'एक व्यक्तिगत व्यक्ति',
  },
  'organization': {
    en: 'An organizational body or institution',
    ne: 'संगठनात्मक निकाय वा संस्था',
  },
  'political-party': {
    en: 'A political party',
    ne: 'राजनीतिक दल',
  },
  'government-body': {
    en: 'A government body or institution',
    ne: 'सरकारी निकाय वा संस्था',
  },
};

/**
 * Get tag description in the specified language
 * Falls back to showing the tag key if no description is found
 */
export function getTagDescription(tag: string, language: 'en' | 'ne'): string {
  const description = TAG_DESCRIPTIONS[tag];
  
  if (description) {
    return description[language];
  }
  
  // Fallback: return the tag key formatted nicely
  return tag.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
