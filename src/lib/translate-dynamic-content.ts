/**
 * Dynamic Content Translation Utilities
 * 
 * Handles translation of dynamic content from API that may not be in translation files
 */

import type { TFunction } from 'i18next';

/**
 * Common terms dictionary for translating dynamic content
 */
const COMMON_TERMS: Record<string, { en: string; ne: string }> = {
  // Election Types
  'federal': { en: 'Federal', ne: 'संघीय' },
  'provincial': { en: 'Provincial', ne: 'प्रदेश' },
  'local': { en: 'Local', ne: 'स्थानीय' },
  'ward': { en: 'Ward', ne: 'वडा' },
  
  // Positions
  'federal_parliament': { en: 'Federal Parliament', ne: 'संघीय संसद' },
  'member': { en: 'Member', ne: 'सदस्य' },
  'candidate': { en: 'Candidate', ne: 'उम्मेदवार' },
  'representative': { en: 'Representative', ne: 'प्रतिनिधि' },
  'minister': { en: 'Minister', ne: 'मन्त्री' },
  'secretary': { en: 'Secretary', ne: 'सचिव' },
  'director': { en: 'Director', ne: 'निर्देशक' },
  'chief': { en: 'Chief', ne: 'प्रमुख' },
  'president': { en: 'President', ne: 'अध्यक्ष' },
  'vice_president': { en: 'Vice President', ne: 'उपाध्यक्ष' },
  'chairperson': { en: 'Chairperson', ne: 'अध्यक्ष' },
  
  // Election Symbols
  'sun': { en: 'Sun', ne: 'सूर्य' },
  'bell': { en: 'Bell', ne: 'घण्टा' },
  'tree': { en: 'Tree', ne: 'रुख' },
  'plow': { en: 'Plow', ne: 'हलो' },
  'umbrella': { en: 'Umbrella', ne: 'छाता' },
  'star': { en: 'Star', ne: 'तारा' },
  'moon': { en: 'Moon', ne: 'चन्द्रमा' },
  'lotus': { en: 'Lotus', ne: 'कमल' },
  'hand': { en: 'Hand', ne: 'हात' },
  'flag': { en: 'Flag', ne: 'झण्डा' },
  
  // Organizations
  'parliament': { en: 'Parliament', ne: 'संसद' },
  'assembly': { en: 'Assembly', ne: 'सभा' },
  'council': { en: 'Council', ne: 'परिषद' },
  'committee': { en: 'Committee', ne: 'समिति' },
  'commission': { en: 'Commission', ne: 'आयोग' },
  'ministry': { en: 'Ministry', ne: 'मन्त्रालय' },
  'department': { en: 'Department', ne: 'विभाग' },
  'office': { en: 'Office', ne: 'कार्यालय' },
  
  // Entity types
  'person': { en: 'Person', ne: 'व्यक्ति' },
  'organization': { en: 'Organization', ne: 'संस्था' },
  'location': { en: 'Location', ne: 'स्थान' },
  'political_party': { en: 'Political Party', ne: 'राजनीतिक दल' },
  'government_body': { en: 'Government Body', ne: 'सरकारी निकाय' },
  'company': { en: 'Company', ne: 'कम्पनी' },
  'ngo': { en: 'NGO', ne: 'गैरसरकारी संस्था' },
  'ingo': { en: 'INGO', ne: 'अन्तर्राष्ट्रिय गैरसरकारी संस्था' },
  
  // Political parties
  'nepali_congress': { en: 'Nepali Congress', ne: 'नेपाली कांग्रेस' },
  'cpn_uml': { en: 'CPN-UML', ne: 'नेकपा एमाले' },
  'cpn_maoist_centre': { en: 'CPN (Maoist Centre)', ne: 'नेकपा (माओवादी केन्द्र)' },
  'rastriya_swatantra_party': { en: 'Rastriya Swatantra Party', ne: 'राष्ट्रिय स्वतन्त्र पार्टी' },
  'rastriya_prajatantra_party': { en: 'Rastriya Prajatantra Party', ne: 'राष्ट्रिय प्रजातन्त्र पार्टी' },
  'janata_samajwadi_party': { en: 'Janata Samajwadi Party', ne: 'जनता समाजवादी पार्टी' },
  'loktantrik_samajwadi_party': { en: 'Loktantrik Samajwadi Party', ne: 'लोकतान्त्रिक समाजवादी पार्टी' },
  
  // Common words
  'election': { en: 'Election', ne: 'निर्वाचन' },
  'elected': { en: 'Elected', ne: 'निर्वाचित' },
  'not_elected': { en: 'Not Elected', ne: 'निर्वाचित भएन' },
  'votes': { en: 'Votes', ne: 'मत' },
  'symbol': { en: 'Symbol', ne: 'चिन्ह' },
  
  // Case statuses
  'active': { en: 'Active', ne: 'सक्रिय' },
  'closed': { en: 'Closed', ne: 'बन्द' },
  'pending': { en: 'Pending', ne: 'विचाराधीन' },
  'under_review': { en: 'Under Review', ne: 'समीक्षाधीन' },
  'ongoing': { en: 'Ongoing', ne: 'चलिरहेको' },
  'resolved': { en: 'Resolved', ne: 'समाधान भएको' },
  'under_investigation': { en: 'Under Investigation', ne: 'अनुसन्धानमा' },
  
  // Case types
  'corruption': { en: 'Corruption', ne: 'भ्रष्टाचार' },
  'misconduct': { en: 'Misconduct', ne: 'दुर्व्यवहार' },
  'breach_of_trust': { en: 'Breach of Trust', ne: 'विश्वासको उल्लङ्घन' },
  'broken_promise': { en: 'Broken Promise', ne: 'भाँचिएको वाचा' },
  'promises': { en: 'Promises', ne: 'वाचा' },
  'media_trial': { en: 'Media Trial', ne: 'मिडिया ट्रायल' },
  'abuse_of_power': { en: 'Abuse of Power', ne: 'शक्तिको दुरुपयोग' },
  'embezzlement': { en: 'Embezzlement', ne: 'गबन' },
  'bribery': { en: 'Bribery', ne: 'रिश्वत' },
  'nepotism': { en: 'Nepotism', ne: 'भाईभतिजावाद' },
  'favoritism': { en: 'Favoritism', ne: 'पक्षपात' },
  'conflict_of_interest': { en: 'Conflict of Interest', ne: 'हितको द्वन्द्व' },
  'misappropriation': { en: 'Misappropriation', ne: 'दुरुपयोग' },
  
  // Common case-related terms
  'unknown': { en: 'Unknown', ne: 'अज्ञात' },
  'unknown_entity': { en: 'Unknown Entity', ne: 'अज्ञात संस्था' },
  'unknown_location': { en: 'Unknown Location', ne: 'अज्ञात स्थान' },
  'view_source': { en: 'View Source', ne: 'स्रोत हेर्नुहोस्' },
  'source': { en: 'Source', ne: 'स्रोत' },
  
  // Provinces
  'province_1': { en: 'Province 1', ne: 'प्रदेश १' },
  'province_2': { en: 'Province 2', ne: 'प्रदेश २' },
  'bagmati': { en: 'Bagmati', ne: 'बागमती' },
  'gandaki': { en: 'Gandaki', ne: 'गण्डकी' },
  'lumbini': { en: 'Lumbini', ne: 'लुम्बिनी' },
  'karnali': { en: 'Karnali', ne: 'कर्णाली' },
  'sudurpashchim': { en: 'Sudurpashchim', ne: 'सुदूरपश्चिम' },
  
  // Common locations
  'kathmandu': { en: 'Kathmandu', ne: 'काठमाडौं' },
  'pokhara': { en: 'Pokhara', ne: 'पोखरा' },
  'lalitpur': { en: 'Lalitpur', ne: 'ललितपुर' },
  'bhaktapur': { en: 'Bhaktapur', ne: 'भक्तपुर' },
  'biratnagar': { en: 'Biratnagar', ne: 'विराटनगर' },
  'birgunj': { en: 'Birgunj', ne: 'वीरगंज' },
  'dharan': { en: 'Dharan', ne: 'धरान' },
  'butwal': { en: 'Butwal', ne: 'बुटवल' },
  'hetauda': { en: 'Hetauda', ne: 'हेटौंडा' },
  'janakpur': { en: 'Janakpur', ne: 'जनकपुर' },
  'nepalgunj': { en: 'Nepalgunj', ne: 'नेपालगंज' },
  'dhangadhi': { en: 'Dhangadhi', ne: 'धनगढी' },
};

/**
 * Normalize text for lookup (lowercase, replace spaces/underscores)
 */
function normalizeKey(text: string): string {
  return text.toLowerCase().replace(/[\s_-]+/g, '_');
}

/**
 * Translate dynamic text content based on current language
 */
export function translateDynamicText(text: string, currentLang: string): string {
  if (!text) return text;
  
  const normalized = normalizeKey(text);
  const translation = COMMON_TERMS[normalized];
  
  if (translation) {
    return currentLang === 'ne' ? translation.ne : translation.en;
  }
  
  // Try to translate word by word for compound terms
  const words = text.split(/[\s_-]+/);
  if (words.length > 1) {
    const translatedWords = words.map(word => {
      const wordNormalized = normalizeKey(word);
      const wordTranslation = COMMON_TERMS[wordNormalized];
      return wordTranslation 
        ? (currentLang === 'ne' ? wordTranslation.ne : wordTranslation.en)
        : word;
    });
    return translatedWords.join(' ');
  }
  
  // Return original if no translation found
  return text;
}

/**
 * Translate election type and year combination
 */
export function translateElectionYearType(year: string, type: string, t: TFunction, currentLang: string): string {
  // Try specific translation key first
  const yearTypeKey = `${year}${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()}`;
  const translationKey = `entityDetail.${yearTypeKey}`;
  const translated = t(translationKey, { defaultValue: '' });
  
  if (translated) {
    return translated;
  }
  
  // Fallback to dynamic translation
  const translatedType = translateDynamicText(type, currentLang);
  return `${year} ${translatedType}`;
}

/**
 * Translate position/role text
 */
export function translatePosition(position: string, t: TFunction, currentLang: string): string {
  // Try translation key first
  const normalized = normalizeKey(position);
  const translationKey = `entityDetail.${normalized}`;
  const translated = t(translationKey, { defaultValue: '' });
  
  if (translated) {
    return translated;
  }
  
  // Fallback to dynamic translation
  return translateDynamicText(position, currentLang);
}

/**
 * Translate symbol name
 */
export function translateSymbolName(symbolName: unknown, t: TFunction, currentLang: string): string {
  if (!symbolName) return '';
  
  let value = '';
  
  // Handle plain string inputs
  if (typeof symbolName === 'string') {
    value = symbolName;
  } else {
    // Extract the value from LangText structure
    const symbolObj = symbolName as { en?: { value?: string }; ne?: { value?: string } };
    const enValue = symbolObj.en?.value;
    const neValue = symbolObj.ne?.value;
    
    // If we have the value in current language, use it
    if (currentLang === 'ne' && neValue) {
      return neValue;
    }
    if (currentLang === 'en' && enValue) {
      return enValue;
    }
    
    // Otherwise get the available value
    value = enValue || neValue || '';
  }
  
  // If no value found, return empty string
  if (!value) return '';
  
  // Try specific translation keys first
  if (value.toLowerCase().includes('bell')) {
    if (value.toLowerCase().includes('circle')) {
      return t('entityDetail.bellInsideCircle');
    }
    return t('entityDetail.bell');
  }
  
  // Fallback to dynamic translation
  return translateDynamicText(value, currentLang);
}

/**
 * Add new term to the dictionary (for future extensibility)
 */
export function addTranslationTerm(key: string, en: string, ne: string): void {
  const normalized = normalizeKey(key);
  COMMON_TERMS[normalized] = { en, ne };
}
