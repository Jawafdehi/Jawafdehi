import type { Entity, Name, Contact, LangText, ContactType } from '@/types/entity';

/**
 * Helper functions to work with entity data structures
 */

/**
 * Humanize a schema.org `@type` token into a readable label.
 *
 * Entity types arrive as raw schema.org tokens, sometimes comma-joined and/or
 * namespaced — e.g. "AdministrativeArea,jawafdehi:RuralMunicipality",
 * "EducationalOrganization", "jawafdehi:District". We pick the MOST SPECIFIC type
 * (the last token — the namespaced/jawafdehi-specific one is more descriptive than
 * the generic schema.org base), strip the namespace prefix, and split CamelCase.
 *
 * "AdministrativeArea,jawafdehi:RuralMunicipality" -> "Rural Municipality"
 * "EducationalOrganization"                          -> "Educational Organization"
 */
export const humanizeEntityType = (raw: string | null | undefined): string => {
  if (!raw) return 'Entity';
  const tokens = raw.split(',').map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return 'Entity';
  // Most specific token wins (the trailing one); drop any "namespace:" prefix.
  const specific = tokens[tokens.length - 1];
  const bare = specific.includes(':') ? specific.split(':').pop()! : specific;
  // Split CamelCase / PascalCase into spaced words.
  return bare
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
};

// Get primary name in specified language
export const getPrimaryName = (names: Name[], lang: 'en' | 'ne' = 'en'): string => {
  const primaryName = names?.find(n => n.kind === 'PRIMARY');
  if (!primaryName) return '';
  
  if (lang === 'ne' && primaryName.ne?.full) {
    return primaryName.ne.full;
  }
  
  return primaryName.en?.full || '';
};

// Get any name by kind
export const getNameByKind = (names: Name[], kind: string, lang: 'en' | 'ne' = 'en'): string => {
  const name = names?.find(n => n.kind === kind);
  if (!name) return '';
  
  if (lang === 'ne' && name.ne?.full) {
    return name.ne.full;
  }
  
  return name.en?.full || '';
};

// Get contact by type
export const getContactByType = (contacts: Contact[] | null | undefined, type: ContactType): string | null => {
  if (!contacts) return null;
  const contact = contacts.find(c => c.type === type);
  return contact?.value || null;
};

// Get email contact
export const getEmail = (contacts: Contact[] | null | undefined): string | null => {
  return getContactByType(contacts, 'EMAIL');
};

// Get phone contact
export const getPhone = (contacts: Contact[] | null | undefined): string | null => {
  return getContactByType(contacts, 'PHONE');
};

// Get website URL
export const getWebsite = (contacts: Contact[] | null | undefined): string | null => {
  return getContactByType(contacts, 'URL');
};

// Get description in specified language
export const getDescription = (description: LangText | null | undefined, lang: 'en' | 'ne' = 'en'): string => {
  if (!description) return '';
  
  return lang === 'ne' && description.ne?.value
    ? description.ne.value
    : description.en?.value || '';
};

// Get attribute value from entity
export const getAttribute = (entity: Entity, key: string): unknown => {
  return entity.attributes?.[key];
};

// Format entity type for display
export const formatEntityType = (type: string): string => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Format entity subtype for display
export const formatSubType = (subType: string | null | undefined): string => {
  if (!subType) return '';
  return subType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
