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
//     /api/cases, /api/sources   Jawafdehi cases / document sources
//
// Auth is OIDC/Zitadel only (DRF token auth was dropped in the monolith): every
// request carries `Authorization: Bearer <access>` from the shared oidc.ts.
import { http as client, API_BASE_URL, extractErrorMessage } from "./http";

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

export async function listEntities(
  params: ListEntitiesParams = {},
): Promise<EntityListResponse> {
  const { data } = await client.get<EntityListResponse>("/api/entities", {
    params,
  });
  return data;
}

// Entity picker for the case relationship editor (F3): searches entities
// and returns the raw hits (each has an @id + name). Reuses the flat
// /api/entities list endpoint (flat, unprefixed).
export async function searchEntities(
  query: string,
  limit = 20,
): Promise<EntityRecord[]> {
  const { data } = await client.get<EntityListResponse>("/api/entities", {
    params: { query, limit },
  });
  return data.entities ?? [];
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
  const { data } = await client.get<Paginated<T>>("/api/courts/", { params });
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
// Jawafdehi — corruption cases (DISTINCT from data-lake court cases) + sources.
// Full CRUD: cases are keyed by slug, updated via RFC-6902 PATCH; sources are
// keyed by numeric id and created via multipart (optional file upload).
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

// The authoring shape POST /api/cases/ accepts. The backend forces state=DRAFT
// on create (A1); everything else rides along verbatim (the [k] escape hatch
// keeps the form free to send extra authoring fields).
export interface CreateCasePayload {
  title: string;
  slug?: string;
  case_type: string;
  description?: string;
  notes?: string;
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
// bare array of patch ops.
export async function patchCase<T = Record<string, unknown>>(
  slug: string,
  patchOps: PatchOp[],
): Promise<T> {
  const { data } = await client.patch<T>(
    `/api/cases/${encodeURIComponent(slug)}/`,
    patchOps,
  );
  return data;
}

// Soft-delete a case (backend flips state -> CLOSED, returns 204).
export async function deleteCase(slug: string): Promise<void> {
  await client.delete(`/api/cases/${encodeURIComponent(slug)}/`);
}

export async function listSources<T = Record<string, unknown>>(
  params: Record<string, unknown> = {},
): Promise<Paginated<T>> {
  const { data } = await client.get<Paginated<T>>("/api/sources/", { params });
  return data;
}

export async function getSource<T = Record<string, unknown>>(
  id: number | string,
): Promise<T> {
  const { data } = await client.get<T>(`/api/sources/${id}/`);
  return data;
}

// Build the multipart body for a source create/update. Scalar fields ride as
// form fields; `urls` (link-role dicts) is JSON-encoded; an optional File is
// attached under `file`. Kept a standalone helper so it's unit-testable without
// the network (the FormData shape is the load-bearing contract).
export interface SourceWriteFields {
  title: string;
  description?: string;
  source_type?: string | null;
  urls?: { link: string; role: string }[] | null;
  [k: string]: unknown;
}

export function buildSourceFormData(
  fields: SourceWriteFields,
  file?: File | null,
): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v == null || v === "") continue;
    if (k === "urls") {
      fd.append("urls", JSON.stringify(v));
    } else if (Array.isArray(v) || typeof v === "object") {
      fd.append(k, JSON.stringify(v));
    } else {
      fd.append(k, String(v));
    }
  }
  if (file) fd.append("file", file);
  return fd;
}

// CREATE a document source. Multipart so an optional file can be uploaded
// alongside the metadata. axios sets the multipart boundary from the FormData.
export async function createSource<T = Record<string, unknown>>(
  fields: SourceWriteFields,
  file?: File | null,
): Promise<T> {
  const { data } = await client.post<T>(
    "/api/sources/",
    buildSourceFormData(fields, file),
  );
  return data;
}

// UPDATE a source. Also multipart (a replacement file may be attached). Uses
// PATCH so partial field updates don't wipe unspecified fields.
export async function updateSource<T = Record<string, unknown>>(
  id: number | string,
  fields: SourceWriteFields,
  file?: File | null,
): Promise<T> {
  const { data } = await client.patch<T>(
    `/api/sources/${id}/`,
    buildSourceFormData(fields, file),
  );
  return data;
}

// Soft-delete a source (204).
export async function deleteSource(id: number | string): Promise<void> {
  await client.delete(`/api/sources/${id}/`);
}

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
