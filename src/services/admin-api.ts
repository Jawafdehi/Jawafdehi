// Admin panel API client.
//
// Every client (this one plus api.ts, jds-api.ts, cms-api.ts, search-api.ts)
// now shares ONE axios instance (./http) pointed at the CONSOLIDATED monolith on
// ONE host under a SINGLE unified `/api` root — the former per-service prefixes
// (`/api/nes`, `/api/ngm`) were hard-cut. Each resource lives at its own path:
//
//     /api/entities...     entities (JSON-LD read/write + reindex)
//     /api/courtcases...   court cases (composite-key read/write)
//     /api/courts, /api/firms, /api/materials   data-lake records
//     /api/cases                 Jawafdehi cases (evidence references materials)
//
// Entity TEXT SEARCH is the one exception to "one resource, one path": it goes
// to /api/search/ (OpenSearch), not /api/entities?query= — see
// searchEntitiesUnified below for why.
//
// Auth is OIDC/Zitadel only (DRF token auth was dropped in the monolith): every
// request carries `Authorization: Bearer <access>` from the shared oidc.ts.
import { http as client, API_BASE_URL, extractErrorMessage } from "./http";

import type { ArchiveSearchResponse, ArchiveSearchResult } from "@/types/search";

// Note: axios lowercases response header keys, so `res.headers.etag` is the
// ETag the backend sends as `ETag`. CORS must expose it — the dev proxy is
// same-origin so it's visible; cross-origin prod relies on
// Access-Control-Expose-Headers including ETag.

// Back-compat re-exports: callers (and dev-auth.ts) import these names. The
// client, base-URL resolution, and error extraction now live in http.ts (one
// unified client for the whole app).
export const ADMIN_API_BASE_URL = API_BASE_URL;
export const adminErrorMessage = extractErrorMessage;

// ---------------------------------------------------------------------------
// Entities (JSON-LD documents keyed by @id IRI)
// ---------------------------------------------------------------------------

// A stored entity is a raw schema.org JSON-LD document; we only type the
// keys the admin list/detail views read. Everything else rides along in [k].
export interface EntityRecord {
  "@id": string;
  "@type"?: string | string[];
  name?: string | { ne?: string; en?: string };
  [k: string]: unknown;
}

export interface EntityListResponse {
  entities: EntityRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListEntitiesParams {
  query?: string;
  entity_type?: string;
  entity_prefix?: string;
  keywords?: string;
  limit?: number;
  offset?: number;
}

// A unified-search hit carries only id/title/type, not the stored JSON-LD doc.
// Project it onto the EntityRecord shape the list and the picker read.
function entityFromSearchHit(hit: ArchiveSearchResult): EntityRecord {
  const type = hit.extra?.type;
  const name: { ne?: string; en?: string } = {};
  if (hit.title?.en) name.en = hit.title.en;
  if (hit.title?.ne) name.ne = hit.title.ne;
  return {
    "@id": hit.id,
    // The index joins a multi-valued @type with commas; split it back so a hit
    // renders the same type badge as a direct /api/entities read.
    ...(type ? { "@type": type.includes(",") ? type.split(",") : type } : {}),
    name,
  };
}

// Text search goes to the OpenSearch-backed unified endpoint, NOT to
// /api/entities?query=. That endpoint has no search backend: it scores the
// query in Python over only the first 5000 rows ordered by IRI
// (MAX_SEARCH_CANDIDATES, entities/persistence.py). `person/` sorts after
// `court/`, `document/`, `event/` and `organization/`, and prod NES holds
// ~162.8k of ~185k entities under `person/` — so essentially no person is ever
// inside that window. Searching a real name returned nothing, or unrelated
// substring noise ("Rabi Lamichhane" -> Embassy of Saudi A-RABI-A), which broke
// both browsing and linking a person to a case. The backend's own casework
// client already routes around this the same way (casework/common/api.py).
// The unified endpoint's hard ceiling: page_size above this is a 400, not a clamp.
const SEARCH_MAX_PAGE_SIZE = 50;

async function searchEntitiesUnified(
  params: ListEntitiesParams,
): Promise<EntityListResponse> {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  // /api/search/ addresses results by page and rejects page_size > 50 with a
  // 400, so it cannot serve an arbitrary (offset, limit) window directly. Read
  // the whole pages that cover the window and slice it out of them: flooring to
  // the nearest page start would silently answer a different question, and
  // asking for a page as wide as the window would just fail above 50.
  const firstPage = Math.floor(offset / SEARCH_MAX_PAGE_SIZE) + 1;
  const skip = offset % SEARCH_MAX_PAGE_SIZE;
  const pageCount = Math.max(
    1,
    Math.ceil((skip + limit) / SEARCH_MAX_PAGE_SIZE),
  );

  const fetchPage = async (page: number) => {
    const search = new URLSearchParams({
      q: params.query ?? "",
      type: "entity",
      lang: "both",
      page_size: String(SEARCH_MAX_PAGE_SIZE),
      page: String(page),
    });
    if (params.entity_type) search.set("entity_type", params.entity_type);
    const { data } = await client.get<ArchiveSearchResponse>(
      `/api/search/?${search.toString()}`,
    );
    return data;
  };

  // Usually one request: the admin list pages by 50, and the picker asks for
  // fewer than that from offset 0.
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) => fetchPage(firstPage + i)),
  );
  const window = pages
    .flatMap((page) => page?.results ?? [])
    .slice(skip, skip + limit);
  return {
    entities: window.map(entityFromSearchHit),
    // A real corpus-wide count. /api/entities?query= reports len(page) instead.
    total: pages[0]?.count ?? window.length,
    limit,
    offset,
  };
}

export async function listEntities(
  params: ListEntitiesParams = {},
): Promise<EntityListResponse> {
  // Normalize once, so both routes see the same query: a padded query must not
  // reach either endpoint untrimmed, and a whitespace-only one is no query at
  // all (drop the key rather than send `query=`, which would filter on "").
  const query = params.query?.trim();
  const normalized: ListEntitiesParams = { ...params };
  if (query) normalized.query = query;
  else delete normalized.query;
  // Unfiltered browsing stays on /api/entities: with no query there is nothing
  // to rank, and it gives a true total over a stable IRI order. `entity_prefix`
  // is not an /api/search/ facet, and /api/entities pushes it into SQL *before*
  // the 5000-row cap, so a prefix-scoped query is served correctly there too.
  if (query && !normalized.entity_prefix) {
    return searchEntitiesUnified(normalized);
  }
  const { data } = await client.get<EntityListResponse>("/api/entities", {
    params: normalized,
  });
  return data;
}

// Entity picker for the case relationship editor (F3): searches entities
// and returns the raw hits (each has an @id + name).
export async function searchEntities(
  query: string,
  limit = 20,
): Promise<EntityRecord[]> {
  const { entities } = await listEntities({ query, limit });
  return entities ?? [];
}

// Encode a `<prefix>/<slug>` ref for the detail routes. The backend's _REF
// route matches a path WITH literal slashes (it splits prefix/slug on the final
// "/"), so we must NOT percent-encode the separators — encode each segment but
// keep the slashes. (encodeURIComponent on the whole ref would turn "/" into
// "%2F", which Django/WSGI mishandles and the ref parser wouldn't split.)
function encodeRef(ref: string): string {
  return ref.split("/").map(encodeURIComponent).join("/");
}

// Detail by ref: a bare `<prefix>/<slug>` path or a url-encoded @id IRI.
export async function getEntity(ref: string): Promise<EntityRecord> {
  const { data } = await client.get<EntityRecord>(
    `/api/entities/${encodeRef(ref)}`,
  );
  return data;
}

// CREATE accepts the backend "authoring shape": identity keys (prefix/slug/type)
// plus the bilingual name and any free-form schema.org / jawafdehi: properties,
// which are copied through verbatim. (A full JSON-LD doc with @id is also
// accepted by the backend, but the form always sends the authoring shape.)
export interface CreateEntityPayload {
  prefix: string;
  slug: string;
  type: string | string[];
  name: string | { ne?: string; en?: string };
  change_description?: string;
  // Free-form schema.org / jawafdehi: properties (description, sameAs, etc.).
  [k: string]: unknown;
}

export async function createEntity(
  payload: CreateEntityPayload,
): Promise<EntityRecord> {
  const { data } = await client.post<EntityRecord>("/api/entities", payload);
  return data;
}

// An RFC-6902 JSON Patch operation. The backend rejects ops targeting the
// immutable paths /@id, /@type, /@context, /jawafdehi:version.
export interface PatchOp {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
  from?: string;
}

// EDIT is an RFC-6902 patch: PATCH /api/entities/{ref} with { patch_ops }.
export async function patchEntity(
  ref: string,
  patchOps: PatchOp[],
  changeDescription?: string,
): Promise<EntityRecord> {
  const { data } = await client.patch<EntityRecord>(
    `/api/entities/${encodeRef(ref)}`,
    { patch_ops: patchOps, change_description: changeDescription },
  );
  return data;
}

export async function getEntityVersions(ref: string): Promise<{
  versions: unknown[];
  total: number;
}> {
  const { data } = await client.get(
    `/api/entities/${encodeRef(ref)}/versions`,
  );
  return data;
}

export async function listEntityPrefixes(): Promise<{ prefixes: string[] }> {
  const { data } = await client.get("/api/entity_prefixes");
  return data;
}

// Trigger an OpenSearch reindex (admin only). Returns whatever the job emits.
export async function reindexEntities(): Promise<unknown> {
  const { data } = await client.post("/api/admin/reindex", {});
  return data;
}

// Soft-delete an entity (backend flips it to removed; returns 204 No Content).
export async function deleteEntity(ref: string): Promise<void> {
  await client.delete(`/api/entities/${encodeRef(ref)}`);
}

// ---------------------------------------------------------------------------
// Data Lake — courts + materials (read-mostly; ingestion is bulk)
// ---------------------------------------------------------------------------

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function listCourtCases<T = Record<string, unknown>>(
  params: Record<string, unknown> = {},
): Promise<Paginated<T>> {
  const { data } = await client.get<Paginated<T>>("/api/courtcases/", { params });
  return data;
}

export async function listCourts<T = Record<string, unknown>>(
  params: Record<string, unknown> = {},
): Promise<Paginated<T>> {
  // /api/courts/ has `pagination_class = None` (small fixed set, ~97 rows), so it
  // returns a BARE ARRAY — not a { count, next, results } envelope. Normalize it
  // to the paginated shape the generic admin ResourceTable expects (it reads
  // .results/.count/.next). Without this, res.results is undefined → the courts
  // table renders zero rows even though courts exist (ADMIN-8).
  const { data } = await client.get<T[] | Paginated<T>>("/api/courts/", { params });
  // Defensive: an empty/absent body (network anomaly, 204-ish) would otherwise
  // propagate as a null envelope and crash ResourceTable on `res.results`.
  if (!data) {
    return { count: 0, next: null, previous: null, results: [] };
  }
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return data;
}

export async function listBlacklistedFirms<T = Record<string, unknown>>(
  params: Record<string, unknown> = {},
): Promise<Paginated<T>> {
  const { data } = await client.get<Paginated<T>>("/api/firms/", { params });
  return data;
}

// --- Court-case write surface (data-lake role) --------------------------
// Composite natural key is (court, case_number); create posts to the list root,
// update uses the composite path. `nes_id`, when set, must be a canonical
// entity @id IRI (backend returns 400 otherwise).
export interface CourtCaseWrite {
  case_number: string;
  court_identifier: string;
  registration_date_bs?: string | null;
  registration_date_ad?: string | null;
  case_type?: string | null;
  case_status?: string | null;
  plaintiff?: string | null;
  defendant?: string | null;
  nes_id?: string | null;
  extra_data?: Record<string, unknown> | null;
  document_sources?: unknown[] | null;
}

export async function getCourtCase<T = Record<string, unknown>>(
  court: string,
  caseNumber: string,
): Promise<T> {
  const { data } = await client.get<T>(
    `/api/courtcases/${encodeURIComponent(court)}/${encodeURIComponent(caseNumber)}`,
  );
  return data;
}

export async function createCourtCase<T = Record<string, unknown>>(
  payload: CourtCaseWrite,
): Promise<T> {
  const { data } = await client.post<T>("/api/courtcases/", payload);
  return data;
}

export async function updateCourtCase<T = Record<string, unknown>>(
  court: string,
  caseNumber: string,
  payload: Partial<CourtCaseWrite>,
): Promise<T> {
  const { data } = await client.patch<T>(
    `/api/courtcases/${encodeURIComponent(court)}/${encodeURIComponent(caseNumber)}`,
    payload,
  );
  return data;
}

// Soft-delete a court case by its composite key (backend returns 204).
export async function deleteCourtCase(
  court: string,
  caseNumber: string,
): Promise<void> {
  await client.delete(
    `/api/courtcases/${encodeURIComponent(court)}/${encodeURIComponent(caseNumber)}`,
  );
}

// List materials (paginated). The materials list is DRF-shaped {results,
// next}; `count`/`previous` may be absent, so ResourceTable tolerates undefined.
export async function listMaterials<T = Record<string, unknown>>(
  params: Record<string, unknown> = {},
): Promise<Paginated<T>> {
  // Trailing slash required: the backend list endpoint is GET /api/materials/
  // (no ?iri= param). Without the slash the route 404s.
  const { data } = await client.get<Paginated<T>>("/api/materials/", { params });
  return data;
}

// Resolve a material's JSON-LD by its full @id IRI (public read).
export async function getMaterialByIri<T = Record<string, unknown>>(
  iri: string,
): Promise<T> {
  const { data } = await client.get<T>("/api/materials/", {
    params: { iri },
  });
  return data;
}

// Resolve a material's JSON-LD by its IRI path components (public read). Avoids
// needing the canonical host base — used by the edit form, which routes on
// <source>/<ident>. `source` may be multi-segment, so it's not url-encoded.
export async function getMaterialByPath<T = Record<string, unknown>>(
  source: string,
  ident: string,
): Promise<T> {
  const { data } = await client.get<T>(
    `/api/materials/${source}/${encodeURIComponent(ident)}`,
  );
  return data;
}

// --- Material write surface (data-lake role) ------------------------------
// A material is a schema.org JSON-LD doc keyed by its @id IRI. Create upserts by
// @id; update replaces the doc at <source>/<ident> (the body @id must match).
export async function createMaterial<T = Record<string, unknown>>(
  jsonld: Record<string, unknown>,
  materialType?: string,
): Promise<T> {
  const body = materialType
    ? { material: jsonld, material_type: materialType }
    : jsonld;
  const { data } = await client.post<T>("/api/materials/", body);
  return data;
}

export async function replaceMaterial<T = Record<string, unknown>>(
  source: string,
  ident: string,
  jsonld: Record<string, unknown>,
): Promise<T> {
  const { data } = await client.put<T>(
    `/api/materials/${encodeURIComponent(source)}/${encodeURIComponent(ident)}`,
    jsonld,
  );
  return data;
}

// Set a material's caseworker-controlled visibility policy (materials.models.Policy:
// PUBLIC | CASE_GATED | PRIVATE) out-of-band from its document body. The backend
// strips these control keys from stored JSON-LD, so the policy travels via this
// dedicated PATCH — which writes the column, recomputes the cached `visibility`,
// and returns the doc annotated with jawafdehi:visibility[Policy] (an authed read).
// Addressed by full @id via ?iri= (the canonical whole-IRI form).
export async function patchMaterialVisibilityPolicy<T = Record<string, unknown>>(
  iri: string,
  visibilityPolicy: string,
): Promise<T> {
  const { data } = await client.patch<T>(
    "/api/materials/",
    { visibility_policy: visibilityPolicy },
    { params: { iri } },
  );
  return data;
}

// Soft-delete a material by its <source>/<ident> path components (204).
export async function deleteMaterial(
  source: string,
  ident: string,
): Promise<void> {
  await client.delete(
    `/api/materials/${encodeURIComponent(source)}/${encodeURIComponent(ident)}`,
  );
}

// ---------------------------------------------------------------------------
// Jawafdehi — corruption cases (DISTINCT from data-lake court cases).
// Full CRUD: cases are keyed by slug, updated via RFC-6902 PATCH. Case evidence
// references materials by @id IRI (managed via the materials write surface).
// ---------------------------------------------------------------------------

export async function listCases<T = Record<string, unknown>>(
  params: Record<string, unknown> = {},
): Promise<Paginated<T>> {
  const { data } = await client.get<Paginated<T>>("/api/cases/", { params });
  return data;
}

export async function getCase<T = Record<string, unknown>>(
  slug: string,
): Promise<T> {
  const { data } = await client.get<T>(`/api/cases/${encodeURIComponent(slug)}/`);
  return data;
}

// Fetch a case together with its optimistic-concurrency token (the ETag the
// backend emits on retrieve). The editor holds this token and echoes it back as
// `If-Match` on save so a concurrent edit is rejected (409/412) instead of
// silently clobbered. `etag` is null when the backend predates the feature —
// callers then behave as before (no precondition sent).
export async function getCaseWithEtag<T = Record<string, unknown>>(
  slug: string,
): Promise<{ data: T; etag: string | null }> {
  const res = await client.get<T>(`/api/cases/${encodeURIComponent(slug)}/`);
  return { data: res.data, etag: res.headers?.etag ?? null };
}

// One entry in a case's workflow history (GET /api/cases/{slug}/history/).
export interface CaseStateChange {
  id: number;
  from_state: string;
  to_state: string;
  actor_name: string;
  reason: string;
  created_at: string;
}

// Fetch a case's state-change history (newest first). Returns [] when the
// endpoint is absent (older backend) so the feedback panel degrades to hidden
// rather than erroring.
export async function getCaseHistory(slug: string): Promise<CaseStateChange[]> {
  try {
    const { data } = await client.get<
      Paginated<CaseStateChange> | CaseStateChange[]
    >(`/api/cases/${encodeURIComponent(slug)}/history/`);
    if (Array.isArray(data)) return data;
    return data?.results ?? [];
  } catch {
    return [];
  }
}

// Raised when a PATCH is rejected because the case changed since it was loaded
// (optimistic-lock precondition failed). The editor catches this to prompt a
// reload rather than showing a generic error.
export class CaseConflictError extends Error {
  constructor(message = "This case changed since you opened it.") {
    super(message);
    this.name = "CaseConflictError";
  }
}

// Options for a case PATCH beyond the raw ops:
//   ifMatch          — optimistic-concurrency token from getCaseWithEtag; sent
//                      as If-Match so a stale write is rejected with 412/409.
//   transitionReason — a human reason for a state change, sent as
//                      X-Transition-Reason (recorded in the case history);
//                      keeps the RFC-6902 body a pure patch.
export interface PatchCaseOptions {
  ifMatch?: string | null;
  transitionReason?: string;
}

// The authoring shape POST /api/cases/ accepts. The backend forces state=DRAFT
// on create (A1); everything else rides along verbatim (the [k] escape hatch
// keeps the form free to send extra authoring fields).
export interface CreateCasePayload {
  title: string;
  short_description?: string;
  slug?: string;
  case_type: string;
  description?: string;
  notes?: string;
  public_notes?: string;
  key_allegations?: string[];
  [k: string]: unknown;
}

// CREATE a corruption case. The backend accepts the case authoring fields
// (title, case_type, …) and forces state=DRAFT.
export async function createCase<T = Record<string, unknown>>(
  payload: CreateCasePayload,
): Promise<T> {
  const { data } = await client.post<T>("/api/cases/", payload);
  return data;
}

// UPDATE is an RFC-6902 patch (mirrors the entity contract): the body is a
// bare array of patch ops. Optional `opts` carry an If-Match precondition and/or
// an X-Transition-Reason header (see PatchCaseOptions).
export async function patchCase<T = Record<string, unknown>>(
  slug: string,
  patchOps: PatchOp[],
  opts: PatchCaseOptions = {},
): Promise<T> {
  // Thin wrapper over patchCaseWithEtag (which owns the header building + the
  // 412/409 → CaseConflictError mapping) for callers that don't need the token.
  const { data } = await patchCaseWithEtag<T>(slug, patchOps, opts);
  return data;
}

// Like patchCase but also returns the fresh optimistic-concurrency token the
// backend emits on a successful write, so an in-place editor can keep saving
// without a re-fetch. `etag` is null on an older backend.
export async function patchCaseWithEtag<T = Record<string, unknown>>(
  slug: string,
  patchOps: PatchOp[],
  opts: PatchCaseOptions = {},
): Promise<{ data: T; etag: string | null }> {
  const headers: Record<string, string> = {};
  if (opts.ifMatch) headers["If-Match"] = opts.ifMatch;
  if (opts.transitionReason && opts.transitionReason.trim())
    headers["X-Transition-Reason"] = opts.transitionReason.trim();
  try {
    const res = await client.patch<T>(
      `/api/cases/${encodeURIComponent(slug)}/`,
      patchOps,
      Object.keys(headers).length ? { headers } : undefined,
    );
    return { data: res.data, etag: res.headers?.etag ?? null };
  } catch (err) {
    const s = (err as { response?: { status?: number } })?.response?.status;
    if (s === 412 || s === 409) {
      throw new CaseConflictError(
        extractErrorMessage(err, "This case changed since you opened it."),
      );
    }
    throw err;
  }
}

// Soft-delete a case (backend flips state -> CLOSED, returns 204).
export async function deleteCase(slug: string): Promise<void> {
  await client.delete(`/api/cases/${encodeURIComponent(slug)}/`);
}

// One selectable account for the case byline picker.
export interface CaseAuthorCandidate {
  id: number;
  username: string;
  display_name: string;
}

// The accounts creditable as a case author. Casework-role only, and deliberately
// UNPAGINATED server-side (a byline picker silently truncated at the default
// page size of 20 would quietly make colleagues uncreditable), so this returns a
// bare array rather than a {count, results} page.
export async function listCaseAuthorCandidates(
  search?: string,
): Promise<CaseAuthorCandidate[]> {
  const { data } = await client.get<CaseAuthorCandidate[]>("/api/case-authors/", {
    params: search?.trim() ? { search: search.trim() } : undefined,
  });
  return Array.isArray(data) ? data : [];
}

// NOTE: Case "document sources" (the former /api/sources CRUD) were removed with
// the "cases own no documents" ADR. Case evidence now references MATERIALS by
// their @id IRI; manage evidence documents via the materials write surface
// above (createMaterial / replaceMaterial / uploadMaterialFile / deleteMaterial).

// ---------------------------------------------------------------------------
// Data Lake — courts + blocklisted firms write surface (data-lake role). Flat /api/
// paths (flat, unprefixed). Courts are keyed by `identifier`
// (their PK); firms by numeric `id`.
// ---------------------------------------------------------------------------

// CourtSerializer write fields (courts/serializers.py). `identifier` is the PK.
export interface CourtWrite {
  identifier: string;
  court_type?: string | null;
  full_name_english?: string | null;
  full_name_nepali?: string | null;
  [k: string]: unknown;
}

export async function getCourt<T = Record<string, unknown>>(
  identifier: string,
): Promise<T> {
  const { data } = await client.get<T>(
    `/api/courts/${encodeURIComponent(identifier)}/`,
  );
  return data;
}

export async function createCourt<T = Record<string, unknown>>(
  payload: CourtWrite,
): Promise<T> {
  const { data } = await client.post<T>("/api/courts/", payload);
  return data;
}

// Update replaces the court at its identifier (PUT); identifier is the PK and
// is locked in edit mode.
export async function updateCourt<T = Record<string, unknown>>(
  identifier: string,
  payload: CourtWrite,
): Promise<T> {
  const { data } = await client.put<T>(
    `/api/courts/${encodeURIComponent(identifier)}/`,
    payload,
  );
  return data;
}

// BlacklistedFirmSerializer write fields (courts/serializers.py). Keyed by the
// numeric `id`; `firm_name` is the display/business name.
export interface FirmWrite {
  firm_name: string;
  proprietor_name?: string | null;
  address?: string | null;
  blacklist_date_bs?: string | null;
  blacklist_date_ad?: string | null;
  effective_until_bs?: string | null;
  effective_until_ad?: string | null;
  duration?: string | null;
  reason?: string | null;
  recommending_office?: string | null;
  nes_id?: string | null;
  [k: string]: unknown;
}

export async function getFirm<T = Record<string, unknown>>(
  id: number | string,
): Promise<T> {
  const { data } = await client.get<T>(`/api/firms/${id}/`);
  return data;
}

export async function createFirm<T = Record<string, unknown>>(
  payload: FirmWrite,
): Promise<T> {
  const { data } = await client.post<T>("/api/firms/", payload);
  return data;
}

export async function updateFirm<T = Record<string, unknown>>(
  id: number | string,
  payload: FirmWrite,
): Promise<T> {
  const { data } = await client.patch<T>(`/api/firms/${id}/`, payload);
  return data;
}

// --- Material file upload (data-lake role). Multipart: file, role, and, when
// creating, material_type. Endpoint: POST /api/materials/{source}/{ident}/file
// (flat, unprefixed). `source` may be multi-segment, so it is not
// url-encoded (mirrors getMaterialByPath).
export async function uploadMaterialFile<T = Record<string, unknown>>(
  source: string,
  ident: string,
  file: File,
  role: string,
  materialType?: string,
): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  form.append("role", role);
  if (materialType) form.append("material_type", materialType);
  const { data } = await client.post<T>(
    `/api/materials/${source}/${encodeURIComponent(ident)}/file`,
    form,
  );
  return data;
}

export { client as adminClient };
