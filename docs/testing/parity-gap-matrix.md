# Admin Panel Parity Gap Matrix

> The single source of truth for the **hard-parity retirement bar**. Django-admin
> casework is retired only when **every non-maintenance row** is `[BUILT]` **and**
> its E2E case passes. See [`admin-e2e-test-plan.md`](./admin-e2e-test-plan.md).

**Legend**
- `[BUILT]` — FE UI + backend endpoint exist; E2E can run against them today.
- `[GAP-UI]` — backend endpoint exists; **no FE surface** (needs UI work).
- `[GAP-BE]` — FE calls it; **backend endpoint missing/incomplete**.
- `[GAP]` — neither FE UI nor a dedicated API path exists (Django-admin-only today).
- `[MAINT]` — intentionally stays in Django admin (user/role mgmt, maintenance);
  **not** part of the parity bar.

Operators in scope: **Caseworker/Contributor**, **Moderator**, **NES/NGM steward**.
(Admin's user/role management is `[MAINT]`.)

---

## Jawafdehi — Cases

| Op | Endpoint | FE surface | Status | E2E | Blocking notes |
|---|---|---|---|---|---|
| List/paginate cases | `GET /api/cases/` | `AdminCases.tsx` | `[BUILT]` | J1 | |
| Filter by state | `GET /api/cases/?state=` | list has no state filter | `[GAP-BE]` | J1 | add `state` to `filterset_fields` on `CaseViewSet` |
| Create case (DRAFT) | `POST /api/cases/` | `AdminCaseForm.tsx` | `[BUILT]` | J2–J5 | |
| Edit case (patch) | `PATCH /api/cases/{slug}/` | `AdminCaseForm.tsx` | `[BUILT]` | J6–J7 | |
| Delete (→CLOSED) | `DELETE /api/cases/{slug}/` | `DeleteButton` | `[BUILT]` | J8 | |
| Transition DRAFT↔IN_REVIEW | `PATCH …` | state dropdown | `[BUILT]` | L1–L2 | |
| Transition →PUBLISHED / →CLOSED | `PATCH …` | form offers DRAFT↔IN_REVIEW only | `[GAP-BE]`+`[GAP-UI]` | L4 | API `partial_update` 422s non-IN_REVIEW today (`api_views.py:564`); extend to call `case.publish()`/`case.delete()` (decommission A2) + add FE control (F2) |
| Publish gate: title+allegation+desc | `PATCH …` | — | `[BUILT-BE]` | L5 / BR-1 | **already enforced** by `Case.validate()` `models.py:640,663,668` (called by `publish()`); just needs A2 to reach it. Duplicated in `CaseAdminForm.clean()` (delete) |
| Publish gate: CORRUPTION needs ACCUSED | `PATCH …` | — | `[BUILT-BE]` | L6 / BR-2 | already in `Case.validate()` `models.py:650`; A2 wires it |
| Publish gate: non-CORRUPTION needs non-LOCATION entity | `PATCH …` | — | `[BUILT-BE]` | L7 / BR-3 | already in `Case.validate()` `models.py:656`; A2 wires it |
| Rich-text description/notes | `PATCH …` | plain textarea | `[GAP-UI?]` | — | open Q3: is markdown textarea acceptable parity? |
| Bigo / thumbnail / banner fields | `PATCH …` | not in FE form | `[GAP-UI]` | — | steward/moderator daily field edits |
| Tags | `PATCH …` | via extra JSON only | `[GAP-UI]` | — | first-class tag editor vs raw JSON |
| Court-case references | `PATCH …` | not in FE form | `[GAP-UI]` | — | link `{court}:{case_number}` to case |
| Nepali (BS) date fields | `PATCH …` | not in FE form | `[GAP-UI]` | — | case_start/end BS↔AD picker |
| Version history view | `GET …/versions` (cases) | not in FE | `[GAP-UI]` | — | audit trail display |

## Jawafdehi — Case relationships / timeline / evidence

| Op | Endpoint | FE surface | Status | E2E | Notes |
|---|---|---|---|---|---|
| Add/edit/remove entity relationships | `PATCH …` `/entities` (writable, `api_views.py:542`) | — | `[GAP-UI]` | EN1–EN5 | **API exists** (replace-all on `/entities`); needs FE editor (F3). Uniqueness/NES-exists rules at model layer |
| Timeline add/edit/reorder/delete | `PATCH …` `/timeline` (writable, `api_views.py:520`) | — | `[GAP-UI]` | timeline spec | API exists; needs FE editor (F4) + confirm `TimelineItemSerializer` date validation (A3) |
| Evidence linking (tiered) | `PATCH …` `/evidence` (writable, `api_views.py:521`) | — | `[GAP-UI]` | evidence spec | API exists; needs FE linker (F5) + confirm `EvidenceItemSerializer` tier enum (A3) |
| Contributor assignment | `/contributors` (blocked path) | — | `[MAINT]` | — | patch-blocked (`api_views.py:461`); belongs with user/role admin |

## Jawafdehi — Document Sources (evidence)

| Op | Endpoint | FE surface | Status | E2E | Notes |
|---|---|---|---|---|---|
| List/paginate | `GET /api/sources/` | `AdminSources.tsx` | `[BUILT]` | SR1 | |
| Create (multipart) | `POST /api/sources/` | `AdminSourceForm.tsx` | `[BUILT]` | SR2–SR4 | |
| File upload (≤10MB, ext/MIME) | `POST /api/sources/` | file input | `[BUILT]` | SR5–SR7 | BR-9 |
| Edit / partial | `PATCH /api/sources/{id}/` | `AdminSourceForm.tsx` | `[BUILT]` | SR8 | |
| Link-role editing | (in payload) | link rows + role select | `[BUILT]` | SR4 | |
| Delete | `DELETE /api/sources/{id}/` | `DeleteButton` | `[BUILT]` | SR9 | |
| Source-type override | (in payload) | source_type select | `[BUILT]` | SR2 | |

## Casework — Reviews

| Op | Endpoint | FE surface | Status | E2E | Notes |
|---|---|---|---|---|---|
| Submit review | `POST /api/casework/reviews/` | `CaseworkReviews.tsx` | `[BUILT]` | RV1–RV4 | |
| Grouped list | `GET /api/casework/reviews/grouped/` | `CaseworkReviews.tsx` calls it | `[GAP-BE]` | RV5 | **BE-1**: backend has only ungrouped `GET /reviews/` |
| List (ungrouped) | `GET /api/casework/reviews/` | — | `[BUILT]` | — | exists; FE prefers grouped |
| Detail | `GET /api/casework/reviews/{id}/` | `CaseworkReviewDetail.tsx` | `[BUILT]` | RV7 | |
| Re-run one | `POST /api/casework/reviews/` | re-run button | `[BUILT]` | RV8 | |
| Regrade all | `POST /api/casework/reviews/regrade-all/` | no button | `[GAP-UI]` | RV(regrade) | admin action needed |
| Poll in-progress | (detail/list) | 3s poll | `[BUILT]` | RV6 | |

## Casework — Rules & Config

| Op | Endpoint | FE surface | Status | E2E | Notes |
|---|---|---|---|---|---|
| Read rules | `GET /api/casework/rules/` | `CaseworkRules.tsx` | `[BUILT]` | RC1 | code-defined, read-only by design |
| Read config | `GET /api/casework/config/` | `CaseworkRules.tsx` | `[BUILT]` | RC2 | |
| Edit config (thresholds/llm_samples) | `PUT /api/casework/config/` | config fields | `[BUILT]` | RC3–RC5 | Admin/Moderator only (BR-12) |

## Casework — Moderation / intake

| Op | Endpoint | FE surface | Status | E2E | Notes |
|---|---|---|---|---|---|
| Moderation queue (manual) | `GET /api/cases/?state=IN_REVIEW` | `Moderation.tsx` placeholder | `[GAP-UI]`+`[GAP-BE]` | moderation spec | **Manual queue = cases in IN_REVIEW** (no intake model). Needs `?state=` filter (G1) + FE queue (F11) |
| Approve → PUBLISHED | `PATCH …` `/state`→PUBLISHED | — | `[GAP-UI]` | moderation spec | uses A2 (`case.publish()`, gates BR-1..3); role Admin/Moderator |
| Reject → DRAFT / dismiss → CLOSED (+reason) | `PATCH …` `/state` + `/notes` | — | `[GAP-UI]` | moderation spec | uses A2; reason stored on notes/missing_details |

## NES — Entities

| Op | Endpoint | FE surface | Status | E2E | Notes |
|---|---|---|---|---|---|
| List/search/paginate | `GET /api/entities` | `NesEntities.tsx` | `[BUILT]` | E1–E2 | |
| Create | `POST /api/entities` | `NesEntityCreate.tsx` | `[BUILT]` | E3–E8 | |
| Edit (patch) | `PATCH /api/entities/{ref}` | `NesEntityEdit.tsx` | `[BUILT]` | E9–E10 | |
| Versions | `GET /api/entities/{ref}/versions` | detail | `[BUILT]` | E11 | |
| Delete (soft) | `DELETE /api/entities/{ref}` | `DeleteButton` | `[BUILT]` | E12 | |
| Reindex | `POST /api/admin/reindex` | no button | `[GAP-UI]` | E13 | open Q2: steward button vs `[MAINT]` |
| Held-entity promotion | `promote_held` cmd | — | `[MAINT]` | — | management command; stays in maintenance |
| Bulk ingest | `bulk_ingest` cmd | — | `[MAINT]` | — | |

## NGM — Court cases

| Op | Endpoint | FE surface | Status | E2E | Notes |
|---|---|---|---|---|---|
| List/paginate | `GET /api/courtcases/` | `NgmCourtCases.tsx` | `[BUILT]` | C1 | |
| Create | `POST /api/courtcases/` | `NgmCourtCaseForm.tsx` | `[BUILT]` | C2–C5 | |
| Edit (composite key locked) | `PATCH …/{court}/{case_number}/` | form | `[BUILT]` | C6 | |
| Delete (soft) | `DELETE …` | `DeleteButton` | `[BUILT]` | C8 | |
| Sub-resources (hearings/entities/docs) | `GET …/hearings/` etc. | detail (read) | `[BUILT]` | C7 | read-only |
| Bulk ingestion | `POST /api/ingestion/cases/` | — | `[MAINT]` | — | ETL, stays maintenance |

## NGM — Materials

| Op | Endpoint | FE surface | Status | E2E | Notes |
|---|---|---|---|---|---|
| List/paginate | `GET /api/materials/` | `NgmMaterials.tsx` | `[BUILT]` | M1 | |
| IRI lookup | `GET /api/materials/?iri=` | lookup box | `[BUILT]` | M2–M3 | |
| Create/upsert | `POST /api/materials/` | `NgmMaterialForm.tsx` | `[BUILT]` | M4–M6 | |
| Replace (PUT) | `PUT /api/materials/{source}/{ident}/` | edit | `[BUILT]` | M7 | |
| File upload (≤100MB) | `POST …/{source}/{ident}/file` | no FE surface | `[GAP-UI]` | M8–M10 | endpoint exists; **no upload UI in material form** — BR-10 |
| Delete (soft) | `DELETE …` | `DeleteButton` | `[BUILT]` | M11 | |

## NGM — Courts & Firms

| Op | Endpoint | FE surface | Status | E2E | Notes |
|---|---|---|---|---|---|
| Courts list | `GET /api/courts/` | dropdown in case form | `[BUILT]` | C2 | read only |
| Court create/edit | `POST/PUT /api/courts/` | — | `[GAP-UI]` | §7.5 | open Q1: daily-op or `[MAINT]`? |
| Firms list | `GET /api/firms/` | — | `[GAP-UI]` | — | no FE list |
| Firm create/edit | `POST/PUT /api/firms/` | — | `[GAP-UI]` | §7.5 | open Q1 |

## Cross-cutting

| Op | FE surface | Status | E2E | Notes |
|---|---|---|---|---|
| RBAC nav gating | `AdminLayout` | `[BUILT]` | S1–S3, rbac | |
| Per-endpoint 403 enforcement | API | `[BUILT]` | rbac | proven both allow/deny |
| Unified search reflects mutations | `/api/search` | `[BUILT]` | search spec | needs OpenSearch in stack |
| Dev-login for E2E | (to add) | `[GAP-UI]` | all | **prerequisite** — see auth doc |

---

## Retirement blocker summary (must all clear)

End state = **Django casework admin forms deleted**; all create/edit via REST
API. See [decommission plan](./django-admin-decommission-plan.md) for task IDs.
Ordered by dependency (rules must reach the API before forms are deleted):

1. **A1 (hard coupling)** — `CaseViewSet.create()` currently instantiates
   `CaseAdminForm` (`api_views.py:351`). Replace with serializer + `Case.validate()`.
   **The form cannot be deleted until this is severed.**
2. **A2** — extend `PATCH` to do →PUBLISHED/→CLOSED/→DRAFT via `case.publish()`/
   `case.delete()` (rules BR-1..BR-4 already at model layer — just stop 422-ing
   the transitions). Add FE control (F2).
3. **BE-1 / E1** — implement `GET /api/casework/reviews/grouped/` (FE calls it).
4. **A3 + F3/F4/F5** — FE editors for entities/timeline/evidence (API PATCH
   fields already writable; verify serializers).
5. **F1** — Markdown rich-text editor for description/notes.
6. **F7 / C1** — court + firm create/edit UI (endpoints exist).
7. **F8** — material file-upload UI (endpoint ready).
8. **F6/F10** — case field editors (bigo/thumbnail/banner/tags/court-refs/BS
   dates) + state filter (`?state=`).
9. **E2** — regrade-all button; **NES reindex** button.
10. **G1–G3 / F11 — Moderation queue** (manual): `?state=IN_REVIEW` filter +
    Approve/Reject/Dismiss UI. Reuses A2; no new model.
11. **D1–D4 (the deletion)** — remove `CaseAdminForm`,
    `DocumentSourceAdminForm`, inline formsets, casework widgets; reduce admin to
    stock/administration. Only after 1–10 + E2E green.

`[MAINT]` rows (never block retirement, stay in Django admin): user/role
management, contributor assignment, `promote_held`, `bulk_ingest`,
`import_ciaa_cases`, `reindex_all`, DB surgery.
