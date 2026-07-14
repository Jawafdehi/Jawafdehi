// Client-side validators for data-lake admin write forms. These mirror the backend
// contracts (shared/jawafdehi_shared/entities/ids.py) so the form can give
// immediate feedback; the backend remains the authority and re-validates.

// Canonical entity @id IRI: https://<host>/entity/<prefix>/<slug>
// prefix = lowercase/_/digit segments (up to 4) joined by '/'; slug = lowercase
// alnum, hyphen-separated. Mirrors ENTITY_IRI_RE (host kept liberal here — the
// backend enforces the canonical host).
const ENTITY_IRI_RE =
  /^https?:\/\/[^/]+\/entity\/[a-z0-9_]+(?:\/[a-z0-9_]+){0,3}\/[a-z0-9][a-z0-9-]*$/;

export function isValidEntityIri(value: string): boolean {
  return ENTITY_IRI_RE.test(value.trim());
}

// Canonical material @id IRI: https://<host>/material/<source>/<ident>
const MATERIAL_IRI_RE =
  /^https?:\/\/[^/]+\/material\/[a-z0-9_]+(?:\/[a-z0-9_]+){0,3}\/[^/]+$/;

export function isValidMaterialIri(value: string): boolean {
  return MATERIAL_IRI_RE.test(value.trim());
}

// Split a material @id IRI into its {source, ident} path components — the keys
// the PUT /api/materials/<source>/<ident> route expects. `source` may be
// multi-segment (e.g. "court"); `ident` is the final segment. Returns null for
// a non-material IRI.
export function parseMaterialIri(
  value: string,
): { source: string; ident: string } | null {
  const m = value.trim().match(/\/material\/(.+)$/);
  if (!m) return null;
  const path = m[1];
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash <= 0 || lastSlash === path.length - 1) return null;
  return { source: path.slice(0, lastSlash), ident: path.slice(lastSlash + 1) };
}

// Material_type tokens (Material.material_type values; see jsonld.py
// MaterialType). These pick the schema.org @type the backend derives — the
// create form sends material_type, not the raw @type.
export const MATERIAL_TYPES = [
  { token: "court_case", label: "Court case record" },
  { token: "court_order", label: "Court order / verdict" },
  { token: "manuscript", label: "Manuscript" },
  { token: "charge_sheet", label: "Charge sheet (अभियोगपत्र)" },
  { token: "press_release", label: "Press release (प्रेस विज्ञप्ति)" },
  { token: "legal_corpus", label: "Legal corpus (acts/laws)" },
  { token: "official_report", label: "Official report" },
  { token: "document", label: "Generic document" },
] as const;

// `jawafdehi:sourceType` values persisted on material JSON-LD docs (the keys of
// the backend's JAWAF_SOURCE_TYPE_TO_MATERIAL map, materials/jsonld.py). The
// key is a free extension field — the API doesn't validate it — so this list
// exists to keep the vocabulary from drifting in hand-edited docs.
export const MATERIAL_SOURCE_TYPES = [
  { token: "CIAA_PRESS_RELEASE", label: "CIAA press release" },
  { token: "AG_ABHIYOG_PATRA", label: "AG charge sheet (अभियोगपत्र)" },
  { token: "OAG_AUDIT_REPORT", label: "OAG audit report" },
  { token: "COURT_ORDER", label: "Court order / verdict" },
  { token: "COURT_FILING_OTHER", label: "Other court filing" },
  { token: "LAW_OR_BILL", label: "Law or bill" },
  { token: "NEWS", label: "News coverage" },
  { token: "SOCIAL_MEDIA", label: "Social media" },
  { token: "MISC", label: "Miscellaneous" },
] as const;

// Link roles for a material's associatedMedia entries (`jawafdehi:linkRole`) —
// the DocumentSource link-role vocabulary.
export const MATERIAL_LINK_ROLES = [
  "RAW",
  "PERMALINK",
  "MARKDOWN",
  "SOURCE_PAGE",
  "ALTERNATE",
] as const;
