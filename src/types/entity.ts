/* tslint:disable */
 
/**
/* This file was automatically generated from pydantic models by running pydantic2ts.
/* Do not modify it by hand - just update the pydantic models and then re-run the script
*/

/**
 * Source of the data.
 */
export type ProvenanceMethod = "human" | "llm" | "translation_service" | "imported";
/**
 * Election type: federal, provincial, local
 */
export type ElectionType = "federal" | "provincial" | "local" | "ward";
/**
 * Election position enumeration.
 */
export type ElectionPosition =
  | "federal_parliament"
  | "provincial_assembly"
  | "mayor"
  | "deputy_mayor"
  | "ward_chairperson"
  | "ward_member"
  | "dalit_female_member"
  | "female_member";
export type ContactType =
  | "EMAIL"
  | "PHONE"
  | "URL"
  | "TWITTER"
  | "FACEBOOK"
  | "INSTAGRAM"
  | "LINKEDIN"
  | "WHATSAPP"
  | "TELEGRAM"
  | "WECHAT"
  | "OTHER";
/**
 * Type of entity
 */
export type EntityType = "person" | "organization" | "location";
/**
 * Subtypes for entities with Nepali-specific classifications.
 *
 * Note: Person entities do not have subtypes in this system.
 *
 * Organization Subtypes:
 * - POLITICAL_PARTY: Registered political parties in Nepal (e.g., Nepali Congress, CPN-UML)
 * - GOVERNMENT_BODY: Government ministries, departments, and constitutional bodies
 * - NGO: Non-governmental organizations operating in Nepal
 * - INTERNATIONAL_ORG: International organizations with presence in Nepal
 *
 * Location Subtypes (Nepal's Administrative Hierarchy):
 * - PROVINCE: Nepal's 7 provinces (प्रदेश) - highest administrative division
 * - DISTRICT: Nepal's 77 districts (जिल्ला) - second-level administrative division
 * - METROPOLITAN_CITY: Mahanagarpalika (महानगरपालिका) - 6 cities with >300k population
 * - SUB_METROPOLITAN_CITY: Upamahanagarpalika (उपमहानगरपालिका) - cities with 100k-300k population
 * - MUNICIPALITY: Nagarpalika (नगरपालिका) - urban local bodies
 * - RURAL_MUNICIPALITY: Gaunpalika (गाउँपालिका) - rural local bodies
 * - WARD: Smallest administrative unit within municipalities
 * - CONSTITUENCY: Electoral constituencies for parliamentary elections
 */
export type EntitySubType =
  | "political_party"
  | "government_body"
  | "ngo"
  | "international_org"
  | "province"
  | "district"
  | "metropolitan_city"
  | "sub_metropolitan_city"
  | "municipality"
  | "rural_municipality"
  | "ward"
  | "constituency";
/**
 * Type of name
 */
export type NameKind = "PRIMARY" | "ALIAS" | "ALTERNATE" | "BIRTH_NAME";
export type VersionType = "ENTITY" | "RELATIONSHIP";
/**
 * Type of external identifier
 */
export type IdentifierScheme =
  | "wikipedia"
  | "wikidata"
  | "twitter"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "website"
  | "other";
/**
 * Picture type
 */
export type EntityPictureType = "thumb" | "full" | "wide";
/**
 * Types of government entities.
 */
export type GovernmentType = "federal" | "provincial" | "local" | "other" | "unknown";
/**
 * Types of location entities.
 */
export type LocationType =
  | "province"
  | "district"
  | "metropolitan_city"
  | "sub_metropolitan_city"
  | "municipality"
  | "rural_municipality"
  | "ward"
  | "constituency";
/**
 * Gender enumeration.
 */
export type Gender = "male" | "female" | "other";

/**
 * Address information.
 */
export interface Address {
  /**
   * Location identifier
   */
  location_id?: string | null;
  /**
   * Address description (v2)
   */
  description2?: LangText | null;
  /**
   * @deprecated
   * Address description (deprecated, use description2)
   */
  description?: string | null;
}
export interface LangText {
  /**
   * English or romanized Nepali
   */
  en?: LangTextValue | null;
  /**
   * Nepali (Devanagari)
   */
  ne?: LangTextValue | null;
}
/**
 * Text with provenance tracking.
 */
export interface LangTextValue {
  value: string;
  provenance?: ProvenanceMethod | null;
}
/**
 * Attribution with title and details.
 */
export interface Attribution {
  title: LangText1;
  /**
   * Attribution details
   */
  details: LangText | null;
}
/**
 * Attribution title
 */
export interface LangText1 {
  /**
   * English or romanized Nepali
   */
  en?: LangTextValue | null;
  /**
   * Nepali (Devanagari)
   */
  ne?: LangTextValue | null;
}
export interface Author {
  /**
   * URL-friendly identifier for the author
   */
  slug: string;
  name?: string | null;
  id: string;
}
/**
 * Electoral candidacy record.
 */
export interface Candidacy {
  /**
   * Election year
   */
  election_year: number;
  election_type: ElectionType;
  /**
   * The full constituency mapping where the election took place. For federal/provincial elections, it will be an election constituency. For local elections, it will be the local area (village/municipality/etc). For ward elections, it will be the ward ID.
   */
  constituency_id: string;
  /**
   * Provincial Assembly Election Subdivision (A or B).
   */
  pa_subdivision?: string | null;
  /**
   * Position contested in the election.
   */
  position?: ElectionPosition | null;
  /**
   * Nepal Election Commission candidate ID
   */
  candidate_id: number;
  /**
   * Party entity ID
   */
  party_id?: string | null;
  /**
   * Number of votes received
   */
  votes_received?: number | null;
  /**
   * Whether candidate was elected
   */
  elected?: boolean | null;
  /**
   * Election symbol used
   */
  symbol?: ElectionSymbol | null;
}
/**
 * Election symbol information.
 */
export interface ElectionSymbol {
  symbol_name: LangText2;
  /**
   * Nepal Election Commission symbol ID
   */
  nec_id: number | null;
  /**
   * URL to symbol image
   */
  url?: string | null;
}
/**
 * Symbol name
 */
export interface LangText2 {
  /**
   * English or romanized Nepali
   */
  en?: LangTextValue | null;
  /**
   * Nepali (Devanagari)
   */
  ne?: LangTextValue | null;
}
export interface Contact {
  type: ContactType;
  value: string;
}
/**
 * Education record for a person.
 */
export interface Education {
  institution: LangText3;
  /**
   * Degree or qualification obtained
   */
  degree?: LangText | null;
  /**
   * Field of study
   */
  field?: LangText | null;
  /**
   * Year education started
   */
  start_year?: number | null;
  /**
   * Year education completed
   */
  end_year?: number | null;
}
/**
 * Name of the educational institution
 */
export interface LangText3 {
  /**
   * English or romanized Nepali
   */
  en?: LangTextValue | null;
  /**
   * Nepali (Devanagari)
   */
  ne?: LangTextValue | null;
}
/**
 * Electoral details for a person.
 */
export interface ElectoralDetails {
  /**
   * List of electoral candidacies
   */
  candidacies?: Candidacy[] | null;
}
/**
 * Base entity model. Cannot be instantiated directly - use Person, Organization, or Location.
 *
 * At least one name with kind='PRIMARY' should be provided for all entities.
 */
export interface Entity {
  /**
   * URL-friendly identifier for the entity
   */
  slug: string;
  type: EntityType;
  /**
   * Subtype classification for the entity
   */
  sub_type?: EntitySubType | null;
  /**
   * List of names associated with the entity
   */
  names: Name[];
  /**
   * List of misspelled or alternative name variations
   */
  misspelled_names?: Name[] | null;
  version_summary: VersionSummary;
  /**
   * Timestamp when the entity was created
   */
  created_at: string;
  /**
   * External identifiers for the entity
   */
  identifiers?: ExternalIdentifier[] | null;
  /**
   * Tags for categorizing the entity
   */
  tags?: string[] | null;
  /**
   * Additional attributes for the entity.
   */
  attributes?: {
    [k: string]: unknown;
  } | null;
  /**
   * Contact information for the entity
   */
  contacts?: Contact[] | null;
  /**
   * Brief description of the entity
   */
  short_description?: LangText | null;
  /**
   * Detailed description of the entity
   */
  description?: LangText | null;
  /**
   * Sources and attributions for the entity data
   */
  attributions?: Attribution[] | null;
  /**
   * Pictures associated with the entity
   */
  pictures?: EntityPicture[] | null;
  id: string;
}
/**
 * Represents a name with language and kind classification.
 */
export interface Name {
  kind: NameKind;
  /**
   * English/romanized name parts
   */
  en?: NameParts | null;
  /**
   * Nepali (Devanagari) name parts
   */
  ne?: NameParts | null;
}
/**
 * Name parts dictionary.
 */
export interface NameParts {
  full: string;
  given?: string | null;
  middle?: string | null;
  family?: string | null;
  prefix?: string | null;
  suffix?: string | null;
}
/**
 * Summary of the latest version information
 */
export interface VersionSummary {
  /**
   * ID of the entity or relationship this version belongs to
   */
  entity_or_relationship_id: string;
  type: VersionType;
  version_number: number;
  author: Author;
  change_description: string;
  created_at: string;
  id: string;
}
/**
 * A normalized external identifier reference.
 */
export interface ExternalIdentifier {
  scheme: IdentifierScheme;
  /**
   * Name of the external identifier
   */
  name?: LangText | null;
  /**
   * Identifier value
   */
  value: string;
  /**
   * URL to the external resource
   */
  url?: string | null;
}
/**
 * Picture information for an entity.
 */
export interface EntityPicture {
  type: EntityPictureType;
  /**
   * Picture URL
   */
  url: string;
  /**
   * Picture width in pixels
   */
  width?: number | null;
  /**
   * Picture height in pixels
   */
  height?: number | null;
  /**
   * Picture description
   */
  description?: string | null;
}
/**
 * Government body organization.
 */
export interface GovernmentBody {
  /**
   * URL-friendly identifier for the entity
   */
  slug: string;
  /**
   * Entity type, always organization
   */
  type?: "organization";
  /**
   * Organization subtype, always government_body
   */
  sub_type?: "government_body";
  /**
   * List of names associated with the entity
   */
  names: Name[];
  /**
   * List of misspelled or alternative name variations
   */
  misspelled_names?: Name[] | null;
  version_summary: VersionSummary1;
  /**
   * Timestamp when the entity was created
   */
  created_at: string;
  /**
   * External identifiers for the entity
   */
  identifiers?: ExternalIdentifier[] | null;
  /**
   * Tags for categorizing the entity
   */
  tags?: string[] | null;
  /**
   * Additional attributes for the entity.
   */
  attributes?: {
    [k: string]: unknown;
  } | null;
  /**
   * Contact information for the entity
   */
  contacts?: Contact[] | null;
  /**
   * Brief description of the entity
   */
  short_description?: LangText | null;
  /**
   * Detailed description of the entity
   */
  description?: LangText | null;
  /**
   * Sources and attributions for the entity data
   */
  attributions?: Attribution[] | null;
  /**
   * Pictures associated with the entity
   */
  pictures?: EntityPicture[] | null;
  /**
   * Type of government (federal, provincial, local)
   */
  government_type?: GovernmentType | null;
  id: string;
}
/**
 * Summary of the latest version information
 */
export interface VersionSummary1 {
  /**
   * ID of the entity or relationship this version belongs to
   */
  entity_or_relationship_id: string;
  type: VersionType;
  version_number: number;
  author: Author;
  change_description: string;
  created_at: string;
  id: string;
}
/**
 * Location entity.
 */
export interface Location {
  /**
   * URL-friendly identifier for the entity
   */
  slug: string;
  /**
   * Entity type, always location
   */
  type?: "location";
  /**
   * Subtype classification for the entity
   */
  sub_type?: EntitySubType | null;
  /**
   * List of names associated with the entity
   */
  names: Name[];
  /**
   * List of misspelled or alternative name variations
   */
  misspelled_names?: Name[] | null;
  version_summary: VersionSummary2;
  /**
   * Timestamp when the entity was created
   */
  created_at: string;
  /**
   * External identifiers for the entity
   */
  identifiers?: ExternalIdentifier[] | null;
  /**
   * Tags for categorizing the entity
   */
  tags?: string[] | null;
  /**
   * Additional attributes for the entity.
   */
  attributes?: {
    [k: string]: unknown;
  } | null;
  /**
   * Contact information for the entity
   */
  contacts?: Contact[] | null;
  /**
   * Brief description of the entity
   */
  short_description?: LangText | null;
  /**
   * Detailed description of the entity
   */
  description?: LangText | null;
  /**
   * Sources and attributions for the entity data
   */
  attributions?: Attribution[] | null;
  /**
   * Pictures associated with the entity
   */
  pictures?: EntityPicture[] | null;
  /**
   * Entity ID of parent location
   */
  parent?: string | null;
  /**
   * Area in square kilometers
   */
  area?: number | null;
  /**
   * Latitude
   */
  lat?: number | null;
  /**
   * Longitude
   */
  lng?: number | null;
  id: string;
  /**
   * Type of location from subtype.
   */
  location_type: LocationType | null;
  /**
   * Administrative level in hierarchy.
   */
  administrative_level: number | null;
}
/**
 * Summary of the latest version information
 */
export interface VersionSummary2 {
  /**
   * ID of the entity or relationship this version belongs to
   */
  entity_or_relationship_id: string;
  type: VersionType;
  version_number: number;
  author: Author;
  change_description: string;
  created_at: string;
  id: string;
}
/**
 * Organization entity.
 */
export interface Organization {
  /**
   * URL-friendly identifier for the entity
   */
  slug: string;
  /**
   * Entity type, always organization
   */
  type?: "organization";
  /**
   * Subtype classification for the entity
   */
  sub_type?: EntitySubType | null;
  /**
   * List of names associated with the entity
   */
  names: Name[];
  /**
   * List of misspelled or alternative name variations
   */
  misspelled_names?: Name[] | null;
  version_summary: VersionSummary3;
  /**
   * Timestamp when the entity was created
   */
  created_at: string;
  /**
   * External identifiers for the entity
   */
  identifiers?: ExternalIdentifier[] | null;
  /**
   * Tags for categorizing the entity
   */
  tags?: string[] | null;
  /**
   * Additional attributes for the entity.
   */
  attributes?: {
    [k: string]: unknown;
  } | null;
  /**
   * Contact information for the entity
   */
  contacts?: Contact[] | null;
  /**
   * Brief description of the entity
   */
  short_description?: LangText | null;
  /**
   * Detailed description of the entity
   */
  description?: LangText | null;
  /**
   * Sources and attributions for the entity data
   */
  attributions?: Attribution[] | null;
  /**
   * Pictures associated with the entity
   */
  pictures?: EntityPicture[] | null;
  id: string;
}
/**
 * Summary of the latest version information
 */
export interface VersionSummary3 {
  /**
   * ID of the entity or relationship this version belongs to
   */
  entity_or_relationship_id: string;
  type: VersionType;
  version_number: number;
  author: Author;
  change_description: string;
  created_at: string;
  id: string;
}
/**
 * Political party symbol.
 */
export interface PartySymbol {
  name: LangText4;
}
/**
 * Symbol name
 */
export interface LangText4 {
  /**
   * English or romanized Nepali
   */
  en?: LangTextValue | null;
  /**
   * Nepali (Devanagari)
   */
  ne?: LangTextValue | null;
}
/**
 * Person entity. Note: Person entities do not have subtypes.
 */
export interface Person {
  /**
   * URL-friendly identifier for the entity
   */
  slug: string;
  /**
   * Entity type, always person
   */
  type?: "person";
  /**
   * Person entities do not have subtypes
   */
  sub_type?: null;
  /**
   * List of names associated with the entity
   */
  names: Name[];
  /**
   * List of misspelled or alternative name variations
   */
  misspelled_names?: Name[] | null;
  version_summary: VersionSummary4;
  /**
   * Timestamp when the entity was created
   */
  created_at: string;
  /**
   * External identifiers for the entity
   */
  identifiers?: ExternalIdentifier[] | null;
  /**
   * Tags for categorizing the entity
   */
  tags?: string[] | null;
  /**
   * Additional attributes for the entity.
   */
  attributes?: {
    [k: string]: unknown;
  } | null;
  /**
   * Contact information for the entity
   */
  contacts?: Contact[] | null;
  /**
   * Brief description of the entity
   */
  short_description?: LangText | null;
  /**
   * Detailed description of the entity
   */
  description?: LangText | null;
  /**
   * Sources and attributions for the entity data
   */
  attributions?: Attribution[] | null;
  /**
   * Pictures associated with the entity
   */
  pictures?: EntityPicture[] | null;
  /**
   * Personal details
   */
  personal_details?: PersonDetails | null;
  /**
   * Electoral details
   */
  electoral_details?: ElectoralDetails | null;
  id: string;
}
/**
 * Summary of the latest version information
 */
export interface VersionSummary4 {
  /**
   * ID of the entity or relationship this version belongs to
   */
  entity_or_relationship_id: string;
  type: VersionType;
  version_number: number;
  author: Author;
  change_description: string;
  created_at: string;
  id: string;
}
/**
 * Personal details for a person.
 */
export interface PersonDetails {
  /**
   * Birth date (may be partial, e.g., year only)
   */
  birth_date?: string | null;
  /**
   * Place of birth
   */
  birth_place?: Address | null;
  /**
   * Citizenship place, usually district
   */
  citizenship_place?: Address | null;
  /**
   * Gender
   */
  gender?: Gender | null;
  /**
   * Current address
   */
  address?: Address | null;
  /**
   * Father's name
   */
  father_name?: LangText | null;
  /**
   * Mother's name
   */
  mother_name?: LangText | null;
  /**
   * Spouse's name
   */
  spouse_name?: LangText | null;
  /**
   * Educational background
   */
  education?: Education[] | null;
  /**
   * Professional positions held
   */
  positions?: Position[] | null;
}
/**
 * Position or role held by a person.
 */
export interface Position {
  title: LangText5;
  /**
   * Organization or company name
   */
  organization?: LangText | null;
  /**
   * Start date of the position
   */
  start_date?: string | null;
  /**
   * End date of the position
   */
  end_date?: string | null;
  /**
   * Description of the position
   */
  description?: string | null;
}
/**
 * Job title or position name
 */
export interface LangText5 {
  /**
   * English or romanized Nepali
   */
  en?: LangTextValue | null;
  /**
   * Nepali (Devanagari)
   */
  ne?: LangTextValue | null;
}
/**
 * Political party organization.
 *
 * Note: party_chief is a temporary field for storing party leadership as text.
 * Use relationships to properly link party members and leadership roles.
 */
export interface PoliticalParty {
  /**
   * URL-friendly identifier for the entity
   */
  slug: string;
  /**
   * Entity type, always organization
   */
  type?: "organization";
  /**
   * Organization subtype, always political_party
   */
  sub_type?: "political_party";
  /**
   * List of names associated with the entity
   */
  names: Name[];
  /**
   * List of misspelled or alternative name variations
   */
  misspelled_names?: Name[] | null;
  version_summary: VersionSummary5;
  /**
   * Timestamp when the entity was created
   */
  created_at: string;
  /**
   * External identifiers for the entity
   */
  identifiers?: ExternalIdentifier[] | null;
  /**
   * Tags for categorizing the entity
   */
  tags?: string[] | null;
  /**
   * Additional attributes for the entity.
   */
  attributes?: {
    [k: string]: unknown;
  } | null;
  /**
   * Contact information for the entity
   */
  contacts?: Contact[] | null;
  /**
   * Brief description of the entity
   */
  short_description?: LangText | null;
  /**
   * Detailed description of the entity
   */
  description?: LangText | null;
  /**
   * Sources and attributions for the entity data
   */
  attributions?: Attribution[] | null;
  /**
   * Pictures associated with the entity
   */
  pictures?: EntityPicture[] | null;
  /**
   * Party headquarters address
   */
  address?: Address | null;
  /**
   * Party chief or main official
   */
  party_chief?: LangText | null;
  /**
   * Party registration date
   */
  registration_date?: string | null;
  /**
   * Party electoral symbol
   */
  symbol?: PartySymbol | null;
  id: string;
}
/**
 * Summary of the latest version information
 */
export interface VersionSummary5 {
  /**
   * ID of the entity or relationship this version belongs to
   */
  entity_or_relationship_id: string;
  type: VersionType;
  version_number: number;
  author: Author;
  change_description: string;
  created_at: string;
  id: string;
}
export interface Relationship {
  source_entity_id: string;
  target_entity_id: string;
  type: "AFFILIATED_WITH" | "EMPLOYED_BY" | "MEMBER_OF" | "PARENT_OF" | "CHILD_OF" | "SUPERVISES" | "LOCATED_IN";
  start_date?: string | null;
  end_date?: string | null;
  attributes?: {
    [k: string]: unknown;
  } | null;
  /**
   * Summary of the latest version information
   */
  version_summary?: VersionSummary6 | null;
  created_at?: string | null;
  /**
   * Sources and attributions for the relationship data
   */
  attributions?: string[] | null;
  id: string;
}
export interface VersionSummary6 {
  /**
   * ID of the entity or relationship this version belongs to
   */
  entity_or_relationship_id: string;
  type: VersionType;
  version_number: number;
  author: Author;
  change_description: string;
  created_at: string;
  id: string;
}
export interface Version {
  /**
   * ID of the entity or relationship this version belongs to
   */
  entity_or_relationship_id: string;
  type: VersionType;
  version_number: number;
  author: Author;
  change_description: string;
  created_at: string;
  snapshot?: {
    [k: string]: unknown;
  } | null;
  id: string;
}
export interface CursorPage {
  has_more: boolean;
  offset?: number;
  count: number;
}
