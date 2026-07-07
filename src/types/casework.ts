// Types for the Casework Review System portal (ported from the standalone
// casework SPA into the jawafdehi frontend). The review system is rule-centered:
// each review scores a case against editable Rules and rolls them up into
// per-category scores + an overall disposition.

export interface CaseworkUser {
  username: string;
  roles: string[];
  is_admin: boolean;
}

export type ReviewStatus = "pending" | "running" | "done" | "failed";
export type Disposition = "PASS" | "REVISE" | "REJECT";

// Which reviewer (LLM harness) graded a run, per tier. Gate rules use the
// premium tier, routine rules/narrative/source analysis the cheap tier, so a
// single review usually lists more than one entry.
export interface ReviewerInfo {
  tier: string;
  provider: string;
  model: string;
  calls: number;
}

export interface ReviewListItem {
  id: number;
  slug: string;
  status: ReviewStatus;
  stage: string;
  case_title: string;
  case_state: string;
  source_count: number;
  sources_converted: number;
  overall_score: number | null;
  disposition: Disposition | null;
  case_type: string;
  reviewers: ReviewerInfo[] | null;
  created_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

// One case with ALL of its review executions (newest first), from the grouped
// review list. The internal case_id is the grouping key and is not exposed.
export interface GroupedCase {
  slug: string;
  case_title: string;
  latest: ReviewListItem;
  executions: ReviewListItem[];
}

export interface RuleResult {
  key: string;
  title: string;
  category: string;
  kind: "deterministic" | "llm";
  condition_text: string;
  applies_to: string[];
  weight: number;
  is_gate: boolean;
  gate_min: number;
  gate_failed: boolean;
  score: number;
  confidence: "high" | "medium" | "low";
  variance: number;
  std: number;
  issues: string[];
  // Optional: reviews created before the notes channel won't carry this field.
  notes?: string[];
  suggestions: string[];
  rationale: string;
  description: string;
  good_examples: string;
  bad_examples: string;
}

export interface CategoryScore {
  category: string;
  score: number;
  rules: number;
}

export interface SourceSummary {
  title: string;
  source_type: string;
  conversion_status: string;
  conversion_note: string;
  markdown_chars: number;
  markdown: string;
  url: string[];
}

export interface ReviewResult {
  slug: string;
  title: string;
  state: string;
  case_type: { type: string; label: string; rationale: string };
  overall_score: number;
  disposition: Disposition;
  rules: RuleResult[];
  categories: CategoryScore[];
  gate_failures: { key: string; title: string; score: number; gate_min: number }[];
  gates_pass: boolean;
  narrative: string;
  // Informational, non-scoring notes (trivial / cosmetic findings) rolled up
  // across rules. Surfaced separately from issues so they don't read as gaps.
  info?: { rule: string; note: string }[];
  judge_error: string | null;
  llm_samples: number;
  thresholds: { pass: number; revise: number };
  model_id_used: string | null;
  source_summary: SourceSummary[];
}

export interface ReviewDetail extends ReviewListItem {
  error: string;
  result: ReviewResult | null;
  reviewers: ReviewerInfo[] | null;
  updated_at: string;
  started_at: string | null;
}

export interface CaseworkRule {
  id: number;
  key: string;
  title: string;
  category: string;
  description: string;
  good_examples: string;
  bad_examples: string;
  condition_text: string;
  applies_to: string[];
  kind: "deterministic" | "llm";
  detector: string;
  weight: number;
  is_gate: boolean;
  gate_min: number;
  enabled: boolean;
  order: number;
  updated_at: string;
}

export interface ReviewConfig {
  pass_threshold: number;
  revise_threshold: number;
  llm_samples: number;
  updated_at: string;
}

// DRF default pagination envelope (the jawafdehi-api paginates list endpoints).
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
