/**
 * Merged Entity Model
 * Combines the Tundikhel entity schema with PAP requirements
 */

export interface MergedEntity {
  id: string;
  slug: string;
  type: string;
  subtype?: string;

  names: {
    PRIMARY?: string;
    NEPALI?: string;
    ALIAS?: string[];
  };

  identifiers?: {
    citizenship_no?: string;
    pan_no?: string;
    voter_id?: string;
    passport_no?: string;
    national_id?: string;
    other_ids?: Record<string, string>;
  };

  contacts?: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    province?: string;
    district?: string;
    municipality?: string;
    ward?: string;
  };

  descriptions?: {
    overview?: string;
    bio?: string;
    career?: string;
    details?: string;
  };

  attributes?: {
    gender?: string;
    dob_ad?: string;
    dob_bs?: string;
    age?: number;
    birth_place?: string;
    citizenship_place?: string;
    father_name?: string;
    mother_name?: string;
    spouse_name?: string;
    education?: string;
    occupation?: string;
    political_position?: string;
    corruption_risk?: string;
    photo_url?: string;
    cover_photo_url?: string;
    extra_attributes?: Record<string, unknown>;
  };

  electoral_details?: {
    candidacies?: Array<{
      election_year: number;
      election_type: string;
      constituency_id: string;
      candidate_id: number;
      position?: string;
      party_id?: string;
      votes_received?: number;
      elected?: boolean;
      pa_subdivision?: string;
    }>;
  };

  relationships?: MergedRelationship[];
  allegations?: MergedAllegation[];
  cases?: MergedCase[];

  evidence?: {
    documentary?: string[];
    sources?: string[];
    merged_references?: string[];
  };

  version_summary?: {
    version: number;
    created_at: string;
    updated_at: string;
    author_id: string;
  };
}

export interface MergedRelationship {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  start_date?: string;
  end_date?: string;
  attributes?: Record<string, unknown>;
}

export interface MergedAllegation {
  id: string;
  entity_id: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  date: string;
  evidence?: string[];
}

export interface MergedCase {
  id: string;
  entity_id: string;
  name: string;
  description: string;
  documents?: string[];
  timeline?: { date: string; event: string; description?: string }[];
  status: string;
}
