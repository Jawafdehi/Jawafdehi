# Admin Panel E2E Test Plan — Daily-Ops Parity

> **Goal.** Prove that the React admin panel (`/admin/*`) can perform **all
> required daily operations**, so Django admin can be relegated to **user/role
> management and high-level maintenance only**. Casework moves *completely* to
> the frontend.
>
> **Retirement bar: HARD PARITY.** Every casework/data daily operation must be
> provably doable in the FE (E2E-passing) before Django admin's casework role is
> retired. Any operation still marked `[GAP]` blocks retirement.

**Companion docs**
- [`parity-gap-matrix.md`](./parity-gap-matrix.md) — the operation-by-operation
  checklist of what is `[BUILT]` vs `[GAP]`; the single source of truth for the
  retirement bar.
- [`auth-and-fixtures.md`](./auth-and-fixtures.md) — how headless tests log in
  (FE dev-login bypass), the compose stack, and the seed fixture.

---

## 1. Scope & non-goals

### In scope (must reach hard parity in the FE)
Everything a **Caseworker/Contributor**, **Moderator**, or **NES/NGM data
steward** does on a normal day:

| Domain | Resource | Ops covered |
|---|---|---|
| Jawafdehi | Corruption **Cases** | list, create, edit (RFC-6902 patch), state transitions, entity links, timeline, evidence links, delete (→CLOSED) |
| Jawafdehi | **Document Sources** (evidence) | list, create (multipart+file), edit, link roles, delete |
| Casework | **Reviews** | submit, list (grouped), detail, re-run, regrade-all, config edit |
| Casework | **Rules & Config** | read rules, edit thresholds/llm_samples |
| Casework | **Moderation / submissions** | intake queue, approve/reject |
| NES | **Entities** | list/search, create, edit (patch), delete, versions, reindex |
| NGM | **Court cases** | list, create, edit, delete, sub-resources |
| NGM | **Materials** | list, IRI lookup, create/upsert, replace (PUT), file upload, delete |
| NGM | **Courts / firms** | list, create, edit |
| Cross | **AuthZ / RBAC** | per-role visibility of nav + endpoints; 403 behavior |

### Explicitly out of scope (stays in Django admin — by design)
- **User & role management** (group membership, OIDC role mapping).
- **High-level maintenance**: DB-level fixes, one-off management commands
  (`bulk_ingest`, `promote_held`, `reindex_all`, `import_ciaa_cases`, etc.),
  emergency data surgery.

These remain Django-admin operations and are **not** required to reach FE parity.

---

## 2. Test pyramid & what each layer owns

This plan is E2E-first (that is what the user asked for), but it sits on top of
existing layers. We do **not** re-test at E2E what a cheaper layer already
proves.

| Layer | Tool | Owns | Location |
|---|---|---|---|
| Unit | Vitest | pure validators (`nes-jsonld`, `ngm-forms`, `jawafdehi-forms`), RFC-6902 diff, SSR | `tests/` (exists) |
| API contract | Django `pytest` + DRF `APIClient` | serializer validation, permission classes, business-rule gates, state machine | `jawafdehi-api/tests/` (exists) |
| **Browser E2E** | **Playwright** | full user journeys through the real SPA against the real API + DBs | `e2e/` (**this plan**) |

**E2E is reserved for**: multi-step flows, cross-resource wiring (case ↔ entity
↔ source ↔ review), navigation/redirects, RBAC nav gating, optimistic UI,
polling, file upload round-trips, and confirming the FE actually *renders and
submits* what the API expects. Field-level regex validation is a Vitest concern
and is only spot-checked in E2E.

---

## 3. Environment (full docker-compose stack)

See [`auth-and-fixtures.md`](./auth-and-fixtures.md) for the full recipe. In
brief:

```
docker-compose (jawafdehi-api/infra):
  api        :48000   monolith (DEV_AUTH=true, DEBUG=true)
  pg-nes     :5432    NES DB
  pg-ngm     :5433    NGM DB
  pg-jawaf   :5434    Jawafdehi + review + jobs DB
  opensearch :9200    unified search index

FE:
  vite dev   :40114   proxies /api,/nes,/ngm,/django-admin,/static,/media → :48000
```

- Tests run against the **Vite dev server** (`:40114`) so the real proxy +
  real SPA build path are exercised; the proxy forwards to the monolith.
- **Search fidelity matters** — OpenSearch is in the stack so entity/case/
  material reindex + `/api/search` are real, not stubbed.
- A **seed fixture** (management command `seed_e2e`, to be added — see
  `auth-and-fixtures.md §4`) creates: one user per role, a handful of cases in
  each state, entities (published + held), court cases, materials, sources, and
  a couple of reviews (done + pending). Tests that mutate data create their own
  records with unique slugs/prefixes and clean up, so the suite is
  order-independent and re-runnable.

---

## 4. Authentication model for tests

The SPA authenticates **only via OIDC/Zitadel** today (`UserManager` + Bearer
tokens); there is **no dev-login path in the FE**. Per decision, we add an
**env-gated FE dev-login bypass** (`VITE_DEV_AUTH`) that mirrors the backend's
`DEV_AUTH`. Full spec in [`auth-and-fixtures.md §2`](./auth-and-fixtures.md).
Every E2E test starts from a `loginAs(role)` fixture that lands the browser in
`/admin` authenticated as that role.

---

## 5. Roles under test

Derived from `review/permissions.py`, `entities/permissions.py`,
`courts/permissions.py`, and the FE `AdminLayout` role gate.

| Test persona | Groups | Can write | Notes |
|---|---|---|---|
| `admin` | Admin | everything | daily-ops superset; still used to verify nothing is *hidden* from admin |
| `moderator` | Moderator | cases (any state transition), NGM, casework config, reviews | cannot write NES entities |
| `caseworker` | Caseworker | cases (DRAFT↔IN_REVIEW only), sources, NGM, submit/regrade reviews | the core daily driver |
| `nes_steward` | NES_Contributor | NES entities only | no casework, no NGM writes |
| `nes_admin` | NES_Admin | NES entities + reindex | |
| `readonly` | ReadOnly | nothing | reads everything incl. reviews; every write returns 403 |
| `public` | (none / anon) | nothing | no `/admin` access at all (403 gate) |

Each persona is exercised for **at least one allowed** and **one forbidden**
operation, so RBAC is proven from both sides.

---

## 6. Test suite structure

```
e2e/
  fixtures/
    auth.ts            loginAs(role) — dev-login bypass, token/session seed
    api.ts             thin API client for arrange/assert & teardown
    data.ts            unique-id helpers, seed references
  admin/
    shell.spec.ts              nav gating, 403 screens, role-scoped sidebar
    nes-entities.spec.ts       NES CRUD + versions + reindex
    ngm-courtcases.spec.ts     court-case CRUD + sub-resources
    ngm-materials.spec.ts      material CRUD + IRI lookup + file upload
    ngm-courts-firms.spec.ts   court & firm CRUD
    jawafdehi-cases.spec.ts    case CRUD + patch + slug rules
    jawafdehi-case-lifecycle.spec.ts  DRAFT→IN_REVIEW→PUBLISHED→CLOSED
    jawafdehi-case-entities.spec.ts   entity-relationship editing        [GAP]
    jawafdehi-case-timeline.spec.ts   timeline editing                   [GAP]
    jawafdehi-case-evidence.spec.ts   evidence/source linking            [GAP]
    jawafdehi-sources.spec.ts  source CRUD + multipart + link roles
    casework-reviews.spec.ts   submit, grouped list, detail, re-run, poll
    casework-regrade.spec.ts   regrade-all                               [GAP-UI]
    casework-rules-config.spec.ts  rules read + config edit
    casework-moderation.spec.ts    submission intake queue               [GAP]
    rbac.spec.ts               per-role allow/deny matrix
  search/
    unified-search.spec.ts     search reflects created/edited/deleted records
```

`[GAP]` specs are written **now** and expected to fail until the feature ships
(see §9 and the gap matrix). They are the executable definition of "done".

---

## 7. Detailed test cases

Notation: **Given / When / Then**. Each case lists the **API endpoint(s)**
exercised (for cross-check against `parity-gap-matrix.md`) and the **role(s)**.
Business rules are cited to their source file where known.

### 7.1 Admin shell & navigation (`shell.spec.ts`)

| # | Case | Steps | Expected |
|---|---|---|---|
| S1 | Anonymous is blocked | visit `/admin` with no session | redirected to `/admin/login` |
| S2 | No-role user is blocked | login as user with no admin role | 403 "No admin access" + logout button (`AdminLayout.tsx:144`) |
| S3 | Role-scoped sidebar | login as each persona | nav shows only permitted sections; **Moderation** link visible only to `admin`/`moderator` (`AdminLayout.tsx:43`) |
| S4 | Dashboard cards | login `admin`, visit `/admin` | 5 cards (NES, NGM, Jawafdehi, Reviews, Moderation) each navigate correctly (`Dashboard.tsx`) |
| S5 | Deep-link guard | as `readonly`, deep-link to `/admin/nes/entities/new` | form loads read-only OR save returns 403 (see RBAC §7.11) |

### 7.2 NES Entities (`nes-entities.spec.ts`) — role `nes_steward`/`nes_admin`

Endpoints: `GET/POST /api/entities`, `GET/PATCH/DELETE /api/entities/{ref}`,
`GET /api/entities/{ref}/versions`, `POST /api/admin/reindex`.

| # | Case | Then |
|---|---|---|
| E1 | List + paginate | 50/page; next/prev; count shown |
| E2 | Search | query filters list; empty-state renders |
| E3 | Create — happy path | prefix+slug+`@type`+bilingual name → 201 → redirect to edit; entity appears in list |
| E4 | Create — prefix regex | prefix violating `PREFIX_RE` (`nes-jsonld.ts:78`) blocked client-side; submit disabled/error |
| E5 | Create — slug regex | slug violating `SLUG_RE` (`nes-jsonld.ts:76`) blocked |
| E6 | Create — name required | no en **and** no ne name → blocked |
| E7 | Create — reserved key | extra JSON containing `@id`/`@type`/`name`/etc. → rejected |
| E8 | Create — bad JSON | malformed extra JSON → inline error, no submit |
| E9 | Edit — patch | change name + extra prop → RFC-6902 diff sent; immutable paths (`/@id`,`/@type`,`/@context`,`/jawafdehi:version`) never in patch |
| E10 | Edit — no-op guard | open, save without change → save disabled |
| E11 | Versions | edit twice → `/versions` count increments; history visible |
| E12 | Delete | confirm dialog → 204 soft-delete → removed from default list |
| E13 | Reindex | `nes_admin` triggers reindex (**[GAP-UI]** — endpoint exists, no button; see matrix) → entity searchable via `/api/search` |
| E14 | RBAC | `caseworker`/`moderator` cannot create/edit/delete entities → 403 |

### 7.3 NGM Court Cases (`ngm-courtcases.spec.ts`) — role `caseworker`/`nes_steward` w/ NGM

Endpoints: `GET/POST /api/courtcases/`, composite
`GET/PATCH/DELETE /api/courtcases/{court}/{case_number}/`, sub-resources
`/hearings/ /entities/ /documents/`, `GET /api/courts/`.

| # | Case | Then |
|---|---|---|
| C1 | List + paginate | 25/page table (case_number, court, type, status) |
| C2 | Create — happy | court dropdown (from `/api/courts/`) + case_number + dates (BS text / AD date-input) + parties → 201 |
| C3 | Create — nes_id valid | canonical entity IRI accepted (`isValidEntityIri`, `ngm-forms.ts:12`) |
| C4 | Create — nes_id invalid | non-IRI nes_id blocked client-side; also asserted server-side (`courts/models.py:16`) |
| C5 | Create — empty optionals | blank dates/parties sent as `null` |
| C6 | Edit — composite key locked | court + case_number readonly; other fields PATCH |
| C7 | Sub-resources | detail page loads hearings/entities/documents (read) |
| C8 | Delete | confirm → 204 soft-delete |
| C9 | RBAC | non-NGM role → 403 on write |

### 7.4 NGM Materials (`ngm-materials.spec.ts`) — role w/ NGM

Endpoints: `GET/POST/DELETE /api/materials/`, `?iri=`,
`GET/PUT/DELETE /api/materials/{source}/{ident}/`,
`POST /api/materials/{source}/{ident}/file`.

| # | Case | Then |
|---|---|---|
| M1 | List + paginate | 25/page (name, type, @id) |
| M2 | IRI lookup — hit | valid `@id` → jumps to edit page |
| M3 | IRI lookup — miss | unknown IRI → not-found message |
| M4 | Create — happy | material_type dropdown + JSON-LD template → upsert by `@id` (201) |
| M5 | Create — @id format | `@id` violating `isValidMaterialIri` (`ngm-forms.ts:20`) blocked |
| M6 | Create — bad JSON | malformed → inline error |
| M7 | Edit — PUT replace | full JSON-LD replace at path; body `@id` must match route (`materials/views.py:88`) |
| M8 | **File upload** | attach PDF ≤100MB, role RAW → file stored, appears on material (`materials/views.py:251`) |
| M9 | File upload — oversize | >100MB rejected with clear error |
| M10 | File upload — bad role | role ∉ {RAW,ALTERNATE,PERMALINK} rejected |
| M11 | Delete | confirm → 204 soft-delete |

### 7.5 NGM Courts & Firms (`ngm-courts-firms.spec.ts`) — **[GAP-UI]**

Endpoints exist (`POST/PUT /api/courts/`, `/api/firms/`) but **no FE screens**.
Court dropdown is read-only in the case form. Tests written; expected-fail until
create/edit UI exists (see matrix). If steward daily-ops don't need court/firm
creation in-app, this may be reclassified as maintenance — **flag for user**.

### 7.6 Jawafdehi Cases — core CRUD (`jawafdehi-cases.spec.ts`) — role `caseworker`

Endpoints: `GET/POST /api/cases/`, `GET/PATCH/DELETE /api/cases/{slug}/`.

| # | Case | Then |
|---|---|---|
| J1 | List + paginate | 25/page (title, slug, type, state, updated_at); state filter **[GAP]** (`?state=` not exposed — matrix) |
| J2 | Create — happy | title (auto-slugify), case_type ∈ `CASE_TYPES`, state, short desc, extra JSON → 201 in DRAFT (`api_views.py:323`) |
| J3 | Create — title required | empty title → save disabled |
| J4 | Create — slug editable pre-save | edit slug before first save; slug locked after |
| J5 | Create — managed-key guard | extra JSON w/ `id`/`slug`/`title`/etc. rejected |
| J6 | Edit — patch | change type/state/desc → RFC-6902 diff; blocked paths (`id`,`version`,`contributors`,timestamps,`versionInfo` — `caseworker_serializers.py:49`) never sent |
| J7 | Edit — slug immutable when not DRAFT | slug field locked once IN_REVIEW/PUBLISHED (`api_views.py:451`) |
| J8 | Delete | confirm → state→CLOSED (204); vanishes from list; never re-exposed |

### 7.7 Case lifecycle & state machine (`jawafdehi-case-lifecycle.spec.ts`)

Business rules: `cases/rules/predicates.py:107`, required-field gates
`cases/admin.py:291` (must also be enforced server-side on API PATCH).

| # | Case | Role | Then |
|---|---|---|---|
| L1 | Caseworker DRAFT→IN_REVIEW | caseworker | allowed |
| L2 | Caseworker IN_REVIEW→DRAFT | caseworker | allowed |
| L3 | Caseworker →PUBLISHED | caseworker | **forbidden** (403 / UI blocks) — `predicates.py:107` |
| L4 | Moderator →PUBLISHED | moderator | allowed **[GAP]** — FE form only offers DRAFT↔IN_REVIEW today (matrix) |
| L5 | Publish gate — allegations | moderator | publishing a case with no `key_allegations` → rejected |
| L6 | Publish gate — CORRUPTION needs ACCUSED | moderator | CORRUPTION case with no ACCUSED entity → rejected (`cases/admin.py` clean rule) |
| L7 | Publish gate — other types need non-LOCATION entity | moderator | rejected if only LOCATION entities |
| L8 | Published visibility | anon | published case visible on public detail; DRAFT/IN_REVIEW/CLOSED not |

> **Key parity risk:** the publish gates (L5–L7) are currently enforced in the
> Django `CaseAdminForm.clean()`. E2E must confirm they are **also enforced on
> the API PATCH path** — otherwise moving publish to the FE silently drops the
> business rule. If the API doesn't enforce them, that is a `[GAP]` bug, not
> just a UI gap. See matrix row **BR-1**.

### 7.8 Case ↔ Entity relationships (`jawafdehi-case-entities.spec.ts`) — **[GAP]**

Inline entity-relationship editing exists only in Django admin
(`CaseEntityRelationshipInline`, `cases/admin.py:374`). No FE UI or dedicated
API today. Tests specify the target:

| # | Case | Then |
|---|---|---|
| EN1 | Add relationship | link case → NES entity IRI with a `RelationshipType` (ACCUSED/ALLEGED/…) |
| EN2 | Unique constraint | duplicate (case,nes_id,type) rejected (`cases/models.py`) |
| EN3 | Entity must exist in NES | binding a non-existent IRI rejected (privacy rule — `validate_nes_id`) |
| EN4 | Remove relationship | unlink → gone from case detail |
| EN5 | Feeds publish gate | after adding required ACCUSED, L6 passes |

### 7.9 Case timeline (`jawafdehi-case-timeline.spec.ts`) — **[GAP]**

Timeline editing is Django-admin-only (`MultiTimeline` widget). Tests specify:
add/edit/reorder/delete timeline events (AD+BS dates), render on public detail
(`CaseTimeline` component already renders read-side).

### 7.10 Case evidence linking (`jawafdehi-case-evidence.spec.ts`) — **[GAP]**

Linking existing DocumentSources to a case (tiered: primary/legal/secondary) is
Django-admin-only (`MultiEvidenceField`). Tests: attach source to case, set
tier, unlink, verify grouped evidence on public detail (`CaseDetail.tsx`
renders read-side).

### 7.11 Document Sources (`jawafdehi-sources.spec.ts`) — role `caseworker`

Endpoints: `GET/POST /api/sources/`, `GET/PUT/PATCH/DELETE /api/sources/{id}/`
(multipart).

| # | Case | Then |
|---|---|---|
| SR1 | List + paginate | 25/page (title, type, first URL clickable) |
| SR2 | Create — happy | title + description + source_type ∈ `SOURCE_TYPES` + links[] → multipart 201 |
| SR3 | Create — title required | empty → save disabled |
| SR4 | Link roles | add/remove link rows; role ∈ `SOURCE_LINK_ROLES`; empty rows filtered |
| SR5 | File upload | attach PDF ≤10MB, allowed ext/MIME (`cases/models.py:91`) → stored |
| SR6 | File — bad ext/MIME | `.exe`/mismatched MIME rejected |
| SR7 | File — oversize | >10MB rejected |
| SR8 | Edit — partial | PATCH updates metadata without wiping unset fields; replace file |
| SR9 | Delete | confirm → 204 soft-delete |
| SR10 | RBAC | `readonly` → 403 on write |

### 7.12 Casework Reviews (`casework-reviews.spec.ts`) — role `caseworker`

Endpoints: `POST /api/casework/reviews/` (submit),
`GET /api/casework/reviews/grouped/` (**[GAP]** — FE calls it, backend has only
`GET /api/casework/reviews/`; matrix **BE-1**), `GET /api/casework/reviews/{id}/`.

| # | Case | Then |
|---|---|---|
| RV1 | Submit by slug | enter slug → 201 → redirect to detail |
| RV2 | Submit by court-case-no | `court:case_number` form accepted |
| RV3 | Submit by URL | case URL parsed |
| RV4 | Duplicate | resubmitting → 409 + link to existing |
| RV5 | Grouped list | reviews grouped by case; latest first; count per case |
| RV6 | Polling | pending/running review → 3s poll updates status without reload |
| RV7 | Detail render | score, disposition, gate results; rule filter (all/needs/llm/deterministic/gates); source modal (raw/rendered) |
| RV8 | Re-run | re-run button → fresh review created |
| RV9 | RBAC read | `readonly` can view reviews (`CanReadReview`) but cannot submit (403) |

> Full review **execution** (poller claims job, converts sources, runs
> rules/LLM) is out-of-process and covered by the jobs-queue/poller integration
> tests, not browser E2E. E2E asserts the FE round-trip: submit → status
> transitions → rendered result. A seed review in `DONE` state backs RV7.

### 7.13 Regrade-all (`casework-regrade.spec.ts`) — **[GAP-UI]**

`POST /api/casework/reviews/regrade-all/` exists (`HasContributorRole`); no FE
button. Test written expected-fail until a "Re-grade all" admin action exists.

### 7.14 Rules & Config (`casework-rules-config.spec.ts`)

Endpoints: `GET /api/casework/rules/`, `GET/PUT /api/casework/config/`.

| # | Case | Role | Then |
|---|---|---|---|
| RC1 | Rules read | caseworker | rules grouped by category; expandable; read-only |
| RC2 | Config read | caseworker | thresholds + llm_samples shown |
| RC3 | Config edit | moderator | change pass/revise/llm_samples → PUT persists (`IsAdminOrModerator`) |
| RC4 | Config edit forbidden | caseworker | PUT → 403 (config edit is Admin/Moderator only) |
| RC5 | Invalid input | moderator | NaN reverts to saved value on blur |

### 7.15 Moderation queue (`casework-moderation.spec.ts`) — **[GAP-UI]** — role `moderator`

**Manual queue** (decision): the queue is cases in `IN_REVIEW` — no intake
model. `/admin/moderation` is a placeholder today. Endpoints: `GET /api/cases/
?state=IN_REVIEW` (needs `?state=` filter), `PATCH /api/cases/{slug}/` for
transitions. Decommission tasks G1–G3 / F11.

| # | Case | Then |
|---|---|---|
| MO1 | Queue lists IN_REVIEW cases | only IN_REVIEW cases shown; caseworker submit (L1) makes a case appear |
| MO2 | Approve → PUBLISHED | moderator approves → `case.publish()`; publish gates BR-1..3 enforced (reuses L5–L7) |
| MO3 | Reject → DRAFT (+reason) | send back to DRAFT with a reason on `notes`; leaves queue; caseworker sees it editable again |
| MO4 | Dismiss → CLOSED (+reason) | dismiss → CLOSED; never re-exposed (BR-14) |
| MO5 | RBAC | caseworker cannot approve/publish (L3 / 403); queue nav hidden for non-moderator (S3) |

### 7.16 RBAC matrix (`rbac.spec.ts`)

A data-driven test iterating the §5 personas × a representative operation per
domain, asserting **allow → success** and **deny → 403 (and UI hides the
action)**. This is the compact proof that the permission model holds from the
browser, complementing the Python `test_role_based_permissions.py`.

### 7.17 Unified search reflects mutations (`search/unified-search.spec.ts`)

Create an entity / case / material → (reindex if needed) → it appears in
`/api/search`; edit → change reflected; delete → drops out. Proves the
serving↔search path end-to-end (needs OpenSearch in the stack).

---

## 8. Business-rule assertion catalog

These are the rules the FE must not silently drop when casework moves off Django
admin. Each maps to a test above and a matrix row.

| ID | Rule | Source | E2E case | Must be enforced by |
|---|---|---|---|---|
| BR-1 | Publish requires title + ≥1 allegation + description | `cases/admin.py:291` | L5 | **API** (not just Django form) |
| BR-2 | CORRUPTION case requires ≥1 ACCUSED entity | `cases/admin.py` clean | L6 | API |
| BR-3 | Non-CORRUPTION requires ≥1 non-LOCATION entity | `cases/admin.py` clean | L7 | API |
| BR-4 | Caseworker cannot publish/close | `predicates.py:107` | L3 | API |
| BR-5 | Slug immutable unless DRAFT | `api_views.py:451` | J7 | API |
| BR-6 | Patch blocked paths (id/version/contributors/ts) | `caseworker_serializers.py:49` | J6 | API |
| BR-7 | Entity bind requires existing NES IRI | `validate_nes_id` | EN3 | API |
| BR-8 | Unique (case,nes_id,relationship_type) | `cases/models.py` | EN2 | API |
| BR-9 | Source file ≤10MB, ext/MIME allowlist | `cases/models.py:91` | SR5–7 | API |
| BR-10 | Material file ≤100MB, role ∈ {RAW,ALTERNATE,PERMALINK} | `materials/views.py:284` | M8–10 | API |
| BR-11 | Court-case nes_id must be canonical IRI | `courts/models.py:16` | C4 | API |
| BR-12 | Config edit = Admin/Moderator only | `review/permissions.py:82` | RC4 | API |
| BR-13 | Review disposition: gate fail → REJECT regardless of score | `review/*` | (integration) | poller |
| BR-14 | CLOSED cases never exposed via API | `api_views.py:265` | J8/L8 | API |

**BR-1..BR-4 are the highest-risk items**: they currently live in the Django
admin *form*, and the FE publish flow is a `[GAP]`. Confirming the API enforces
them is a precondition for retiring Django-admin casework.

---

## 9. Gap handling & the retirement bar

- Every operation is tagged in [`parity-gap-matrix.md`](./parity-gap-matrix.md)
  as `[BUILT]`, `[GAP]` (no FE UI + maybe no API), or `[GAP-UI]` (API exists,
  no FE surface).
- `[GAP]`/`[GAP-UI]` specs are committed with `test.fixme()` (or
  `expect(...).toFail()` guards) so the suite stays green in CI while the gap is
  open, and the fixme is removed when the feature lands — the diff that closes
  the gap is exactly the diff that turns the test on.
- **Django-admin casework is "retired" only when every non-maintenance row in
  the matrix is `[BUILT]` and its E2E case passes.** Until then Django admin
  stays as the fallback for the still-`[GAP]` operations.

---

## 10. CI integration (sketch)

- New GitHub Actions job `admin-e2e`: spins the compose stack, runs
  `seed_e2e`, boots the Vite dev server, runs `playwright test`.
- Playwright: chromium (primary) + one webkit shard for the file-upload paths;
  retries=2, trace-on-first-retry, video-on-failure; HTML report artifact.
- Gate: E2E job is **required** on PRs that touch `src/pages/admin/**`,
  `src/services/{admin,casework}-api.ts`, or the API's `cases/`, `review/`,
  `entities/`, `courts/`, `materials/` apps.
- A separate scheduled run executes the `[GAP]` specs in "report-only" mode to
  track parity progress over time (how many gaps remain).

---

## 11. Decisions locked (was: open questions)

The scope is now firmer — the end state is **full removal of the Django casework
admin forms**, with all create/edit via the REST API (POST + PUT/PATCH). See the
[Django Admin Decommissioning Plan](./django-admin-decommission-plan.md) for the
required API/FE change spec and sequencing.

1. **Courts/firms creation (§7.5):** **IN the UI** — a daily-ops need. Reclassified
   from `[GAP-UI]`-maybe-maintenance to a required parity feature (decommission
   plan F7). Endpoints already exist (`HasNgmRole`).
2. **Rich-text description/notes:** **rich editor required** — a **Markdown**
   WYSIWYG (stored format stays Markdown to match ToastUI data; decommission plan
   A4/F1). Plain-textarea parity is rejected.
3. **Django admin scope:** **administration only** (users/roles + high-level
   maintenance). All casework admin forms/widgets/inlines are **deleted**
   (decommission plan §D). Any business rule must be enforced on the API path.
4. **Reindex trigger (E13):** steward-facing button (parity), unless a later call
   reclassifies it — tracked in the matrix.

5. **Moderation queue (§7.15):** **manual** — the queue is cases in `IN_REVIEW`;
   moderators approve (→PUBLISHED) / reject (→DRAFT) / dismiss (→CLOSED). No
   intake model (decommission plan §G). A future public submission form would
   feed the same queue as DRAFT cases without design change.

Still genuinely open:
- **Timeline/evidence/entities patch granularity:** full-list `replace` vs.
  `add`/`remove` ops (decommission plan §3 note) — UX refinement, not a blocker.
