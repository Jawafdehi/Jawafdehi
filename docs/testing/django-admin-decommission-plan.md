# Django Admin Decommissioning Plan

> **Objective.** Remove the custom Django **admin forms, widgets, and inline
> formsets** for casework entirely. All case/source create+edit flows go through
> the REST API (POST + PUT/PATCH) driven by the frontend admin panel. Django
> admin is reduced to **administration only**: users, groups/roles, and
> high-level maintenance — using stock `ModelAdmin` (or nothing) for the
> business models.
>
> Companion to [`admin-e2e-test-plan.md`](./admin-e2e-test-plan.md) and
> [`parity-gap-matrix.md`](./parity-gap-matrix.md). This doc is the **required
> API + FE change spec** that unblocks the `[GAP]` rows.

---

## 0. The central finding (why this is tractable)

The casework **business rules are NOT trapped in the admin forms** — they are
already duplicated at the **model/serializer layer** and merely *re-invoked* by
the admin form:

| Rule | Lives at (reusable) | Also duplicated in (to delete) |
|---|---|---|
| Title required | `Case.validate()` `models.py:640` | `CaseAdminForm.clean()` `admin.py:295` |
| IN_REVIEW/PUBLISHED needs ≥1 allegation | `Case.validate()` `models.py:663` | `CaseAdminForm.clean()` `admin.py:304` |
| IN_REVIEW/PUBLISHED needs description | `Case.validate()` `models.py:668` | `CaseAdminForm.clean()` `admin.py:311` |
| CORRUPTION needs ACCUSED entity | `Case.validate()` `models.py:650` | `CaseEntityRelationshipInlineFormSet.clean()` `admin.py:345` |
| Non-CORRUPTION needs non-LOCATION entity | `Case.validate()` `models.py:656` | same inline formset `admin.py:356` |
| New case must be DRAFT | (not at model) | `CaseAdminForm.clean()` `admin.py:271` |
| Role-gated state transition | `can_transition_case_state()` predicate | `CaseAdminForm.clean()` `admin.py:284` |
| Slug format / immutability | `Case.save()`/`validate()` `models.py:609,623` + API `api_views.py:451` | `CaseAdminForm.clean()` `admin.py:258` |
| File ext/size/MIME | model validators `models.py:104-169` | `DocumentSourceAdminForm.clean()` `admin.py:850` |
| Source title required | (implicit) | `DocumentSourceAdminForm.clean()` `admin.py:846` |

**Implication:** decommissioning is mostly (a) **rewiring** the API to call the
model-layer rules instead of the admin form, (b) **filling three genuine `[GAP]`
sub-resource editors** (entities/timeline/evidence) which the API PATCH *already
supports as writable fields*, and (c) **deleting** the form/widget/inline code.

There is exactly **one hard coupling** to sever first: `CaseViewSet.create()`
instantiates `CaseAdminForm` directly (`api_views.py:351`). Until that's
replaced, the form cannot be deleted.

---

## 1. Coupling inventory — what references the admin forms today

| Consumer | Reference | Decommission action |
|---|---|---|
| `CaseViewSet.create()` | `form = CaseAdminForm(data=…, request=request)` `api_views.py:351` | **Replace** with serializer + `Case.validate()` (Task A1) |
| Django admin `CaseAdmin` | `form = CaseAdminForm`, inlines, `save_related` gate `admin.py:426,702` | **Delete** custom form/inlines → stock `ModelAdmin` or unregister (Task D) |
| Django admin `DocumentSourceAdmin` | `form = DocumentSourceAdminForm` `admin.py:874` | **Delete** custom form → stock (Task D) |
| Custom widgets | `ToastUIEditorWidget`, `MultiTimelineField`, `MultiEvidenceField`, `MultiCourtCaseField`, `MultiTextField`, Nepali date (only used by the admin forms) | **Delete** with the forms (Task D) |
| `CaseViewSet.partial_update()` | pure serializer + model rules already | keep; **extend** transitions (Task A2) |

> Note the irony in the create docstring: *"delegating validation to the
> existing Django admin form so API and admin creation semantics stay aligned."*
> Decommissioning inverts this — the **model** becomes the single source of
> truth and both the API and (stock) admin defer to it.

---

## 2. Required API changes (the spec)

Each change is written so it can be lifted straight into a PR description. IDs
(`A1`…`E2`) are referenced by the gap matrix and test plan.

### A. Cases — sever the form, complete the transitions

**A1 — Replace `CaseAdminForm` in `create()` with model-layer validation.**
- Endpoint: `POST /api/cases/` (unchanged contract).
- Change: build the `Case` from `CaseCreateSerializer.validated_data`, set
  `state=DRAFT` (reject non-DRAFT create — port `admin.py:271`), `case.full_clean()`
  / `case.validate()` for field rules, save, then create entity binds (existing
  logic). Delete the `CaseAdminForm(...)` call.
- Rules preserved: title-required, DRAFT-on-create, slug format. (Allegation/
  description/entity gates don't apply to DRAFT, so create stays lenient — same
  as today.)
- Response: unchanged (`CaseSerializer`, 201).

**A2 — Support `→PUBLISHED` and `→CLOSED` transitions on PATCH.**
- Endpoint: `PATCH /api/cases/{slug}/` (RFC-6902).
- Current gap: `partial_update` only allows `→IN_REVIEW` and 422s everything
  else (`api_views.py:564`). Extend the transition block to:
  - `→PUBLISHED`: call `case.publish()` (already validates via `Case.validate()`
    and auto-slugs) — gated by `can_transition_case_state` (Admin/Moderator).
  - `→CLOSED`: call `case.delete()` (soft-delete) — gated likewise.
  - `→DRAFT` (un-submit / un-publish): allow for Admin/Moderator; validate.
- Rules preserved: BR-1..BR-4 flow through `Case.validate()` +
  `can_transition_case_state`. **No new rule code** — just stop rejecting the
  transitions the model already implements.
- Errors: model `ValidationError` → `422` with field-keyed messages (mirror the
  existing `submit()` handling at `api_views.py:558`).

**A3 — Confirm sub-resource PATCH fields are fully wired.**
- `partial_update` already treats `entities`, `timeline`, `evidence`,
  `court_cases`, `tags`, `key_allegations`, `bigo`, `thumbnail_url`,
  `banner_url`, `case_start_date`, `case_end_date`, `missing_details` as writable
  scalar/relation fields (`api_views.py:508`, entity handling `:542`).
- Action: **verify serializer coverage** (`CasePatchSerializer` /
  `TimelineItemSerializer` / `EvidenceItemSerializer`) for each, add any missing
  validation (e.g. timeline date formats, evidence tier enum), and document the
  patch shape per field (see §3). This is mostly *documentation + test*, not new
  endpoints — the write path exists.

**A4 — (Decision needed) description/notes format.**
- Admin ToastUI stores **Markdown** (`widgets.py:143` `editor.getMarkdown()`).
- Keep the stored format **Markdown** so existing data is untouched and the
  public renderer (already markdown→HTML) is unchanged. The FE rich-text editor
  must therefore be a **Markdown WYSIWYG** (see §4). No API change beyond
  documenting that `description`/`notes` are Markdown strings.

### B. Document Sources — sever the form

**B1 — Drop `DocumentSourceAdminForm` dependency.**
- Endpoints: `POST /api/sources/`, `PUT/PATCH /api/sources/{id}/` (multipart).
- The `DocumentSourceViewSet` already uses `DocumentSourceSerializer` +
  model-level file validators (`models.py:104-169`); the admin form only *also*
  runs them. Confirm the serializer runs all three validators
  (extension/size/MIME) and title-required, then the admin form is redundant.
- Action: add serializer-level assertions/tests for BR-9; no new endpoint.

### C. Courts & Firms — new write UI needs the API surfaced

The write endpoints **already exist** (`HasNgmRole`): `POST/PUT/PATCH
/api/courts/`, `POST/PUT/PATCH /api/firms/` (`courts/views.py:85,247`). The gap
is purely **FE UI** (§4). Action:
- **C1** — document the `CourtSerializer` / `BlacklistedFirmSerializer` write
  contracts (required fields, uniqueness) for the FE forms.
- **C2** — confirm `DELETE` semantics (soft vs hard) for courts/firms and
  document; add if a daily-op need (list showed no destroy for firms).

### D. Delete the admin customizations (the actual decommission)

Only after A–C land and E2E is green:
- **D1** — `CaseAdmin`: remove `form = CaseAdminForm`, all inlines
  (`CaseEntityRelationshipInline`), `save_related` entity gate, custom
  `fieldsets`/widgets. Either register stock `ModelAdmin` (read-mostly, for
  emergency inspection) or `unregister`. Delete `CaseAdminForm`,
  `CaseEntityRelationshipInlineFormSet`.
- **D2** — `DocumentSourceAdmin`: remove `form = DocumentSourceAdminForm`; stock
  or unregister. Delete `DocumentSourceAdminForm`.
- **D3** — Delete now-orphaned widgets: `ToastUIEditorWidget`,
  `MultiTimelineField`, `MultiEvidenceField`, `MultiCourtCaseField`,
  `MultiTextField`, Nepali-date widget, and their templates/static under
  `cases/widgets/` + `cases/static/`.
- **D4** — Keep registered for **administration only**: `User`/`Group` admin
  (`CustomUserAdmin`), and optionally read-only `Feedback`/`CaseReview`
  inspection. These are `[MAINT]`.

### E. Casework review (already-known API gaps, folded in here)

- **E1** — implement `GET /api/casework/reviews/grouped/` (FE calls it;
  backend has only ungrouped — matrix BE-1).
- **E2** — surface `POST /api/casework/reviews/regrade-all/` in the FE (endpoint
  exists).

### G. Moderation queue — **no new model needed**

**Decision: the moderation queue is a manual queue** — there is *no* automated
public-submission intake. The queue **is** the set of cases in `IN_REVIEW`: a
caseworker submits a case (DRAFT→IN_REVIEW), it surfaces in the moderator's
triage list, and the moderator approves or rejects it. This reuses the existing
`Case` model + state machine — **no `Submission`/intake model is introduced.**

- **G1** — Moderation queue = `GET /api/cases/?state=IN_REVIEW` (needs the
  `?state=` filter, matrix `[GAP-BE]` / F10). No new endpoint.
- **G2** — **Approve** = transition IN_REVIEW→PUBLISHED (uses A2 →PUBLISHED via
  `case.publish()`; gates BR-1..BR-3 enforced). **Reject** = IN_REVIEW→DRAFT
  (send back for edits) or →CLOSED (dismiss), both via A2. A rejection reason is
  stored on `notes` (or `missing_details`) with the same PATCH.
- **G3** — FE: replace the `Moderation.tsx` placeholder with the IN_REVIEW list +
  per-row Approve / Reject-to-DRAFT / Dismiss actions + reason field. Role-gated
  to Admin/Moderator (nav already scoped, `AdminLayout.tsx:43`); API is the
  authority.
- **Out of scope / future:** if a public submission form is later added
  (`VITE_ENABLE_CASE_SUBMISSION_FORM`), it would create DRAFT cases that flow
  into the same queue — the queue design above already accommodates it without
  change.

---

## 3. Patch-shape documentation (for the FE + tests)

`PATCH /api/cases/{slug}/` takes an RFC-6902 array. Documented shapes the FE
must emit and the API must accept (all already writable per `api_views.py:508`
unless flagged):

```jsonc
// scalar text (Markdown for description/notes)
[{ "op": "replace", "path": "/description", "value": "## Markdown…" }]

// state transition (single replace on /state; A2 extends targets)
[{ "op": "replace", "path": "/state", "value": "PUBLISHED" }]

// key allegations (list)
[{ "op": "replace", "path": "/key_allegations", "value": ["…", "…"] }]

// tags
[{ "op": "replace", "path": "/tags", "value": ["ciaa", "procurement"] }]

// bigo (embezzlement amount)
[{ "op": "replace", "path": "/bigo", "value": 1250000 }]

// court-case references
[{ "op": "replace", "path": "/court_cases", "value": ["e2e-district-court:E2E-001"] }]

// timeline (full replace of the list; item shape per TimelineItemSerializer)
[{ "op": "replace", "path": "/timeline",
   "value": [{ "date": "2024-01-02", "date_bs": "2080-09-18", "title": "…", "description": "…" }] }]

// evidence linking (tiered)
[{ "op": "replace", "path": "/evidence",
   "value": [{ "source_id": 42, "tier": "PRIMARY" }] }]

// entity relationships (replace-all; gate: only applied when /entities touched)
[{ "op": "replace", "path": "/entities",
   "value": [{ "nes_id": "https://jawafdehi.org/entity/person/x", "relationship_type": "ACCUSED", "notes": "" }] }]
```

Blocked paths (422): `/id`, `/version`, `/contributors`, `/created_at`,
`/updated_at`, `/versionInfo`; `/slug` unless DRAFT (`api_views.py:451`).

> **Ergonomics note:** full-list `replace` for timeline/evidence/entities is
> simple but clobbers concurrent edits. Optional future refinement: support
> `add`/`remove` at `/timeline/-` and `/entities/-`. Not required for parity —
> flag for FE UX review.

---

## 4. Required frontend changes

| ID | Change | Backing API |
|---|---|---|
| F1 | **Rich-text (Markdown) editor** for case `description` + `notes`, replacing plain textarea in `AdminCaseForm.tsx`. Must emit Markdown to match stored format (A4). Candidate libs: `@uiw/react-md-editor`, Milkdown, or ToastUI's React wrapper for continuity. | A4 (none) |
| F2 | **State transition control**: expose PUBLISHED/CLOSED (role-gated in UI to Admin/Moderator; API is the authority). | A2 |
| F3 | **Entity-relationship editor**: add/edit/remove `{nes_id, relationship_type, notes}` rows with NES entity picker; drives the ACCUSED/non-LOCATION gates. | A3 (`/entities`) |
| F4 | **Timeline editor**: add/edit/reorder/delete events (AD + BS dates). | A3 (`/timeline`) |
| F5 | **Evidence linker**: attach existing DocumentSources with tier (PRIMARY/LEGAL/SECONDARY); unlink. | A3 (`/evidence`) |
| F6 | **Case field editors**: bigo, thumbnail/banner URL, tags (first-class), court-case refs, BS date pickers. | A3 |
| F7 | **Court create/edit** + **Firm create/edit** screens under `/admin/ngm/`. | C1 |
| F8 | **Material file-upload** control in `NgmMaterialForm` (endpoint ready). | (matrix M8) |
| F9 | **Grouped reviews** consumption + **Regrade-all** button. | E1, E2 |
| F10 | **Case state filter** in list (`?state=`). | (matrix / G1) |
| F11 | **Moderation queue**: replace placeholder with IN_REVIEW list + Approve / Reject-to-DRAFT / Dismiss + reason (Admin/Moderator). | G1–G3, A2 |

---

## 5. Sequencing (safe decommission order)

Rules must reach the API **before** the form is deleted, and E2E must be green
**before** deletion. Ordered phases:

1. **Phase 0 — Prereqs** (from `auth-and-fixtures.md`): FE dev-login,
   `seed_e2e`, Playwright harness. Write all specs incl. `[GAP]` as `fixme`.
2. **Phase 1 — API rewire (no deletion yet):**
   - A1 (create off the form), A2 (full transitions), A3 (verify sub-resource
     serializers), B1 (source serializer parity), E1 (grouped reviews).
   - Django admin still present and functional (belt-and-suspenders).
   - Gate: API contract tests (`jawafdehi-api/tests/`) green for A1–A3, B1, E1.
3. **Phase 2 — FE build-out:** F1–F10. Flip the corresponding `fixme` specs on
   as each lands. Gate: E2E green per feature.
4. **Phase 3 — Parity proof:** entire E2E daily-ops suite green for all three
   operator personas; parity matrix has **zero non-`[MAINT]` `[GAP]` rows**.
5. **Phase 4 — Decommission (D1–D4):** delete forms/inlines/widgets; reduce
   admin to stock/administration. Re-run full suite. This PR should be a **net
   code deletion**.
6. **Phase 5 — Guardrail:** add a test asserting `CaseAdmin`/`DocumentSourceAdmin`
   use no custom `form`/`inlines` (prevents regressions), and a lint/CI check
   that `cases/widgets.py` casework widgets are gone.

---

## 6. Acceptance criteria (definition of "admin forms removed")

- [ ] `POST /api/cases/` no longer imports or instantiates `CaseAdminForm`.
- [ ] `PATCH /api/cases/{slug}/` performs DRAFT↔IN_REVIEW↔PUBLISHED↔CLOSED
      transitions with BR-1..BR-4 enforced via `Case.validate()` +
      `can_transition_case_state`.
- [ ] Entities/timeline/evidence/all case fields are fully create+editable from
      the FE; court/firm create+edit exist in the FE; material upload in the FE.
- [ ] `description`/`notes` edited via a Markdown rich-text editor; stored format
      unchanged.
- [ ] `CaseAdminForm`, `DocumentSourceAdminForm`, the inline formsets, and the
      casework widgets are **deleted** from the codebase.
- [ ] Django admin registers business models only as stock/read-only for
      emergency inspection; **primary daily surface is the API/FE**.
- [ ] Full E2E daily-ops suite green; parity matrix has no non-`[MAINT]` gaps.
- [ ] Regression guard test in place (Phase 5).

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| A rule exists **only** in the admin form (not the model) and is silently dropped | Line-by-line audit done in §0; the only form-only rules are DRAFT-on-create and the transition-permission message — both ported in A1/A2. Phase-1 contract tests assert each rule fires on the API. |
| Create semantics drift once form is gone | A1 keeps `CaseCreateSerializer` + `Case.validate()`; contract test compares API-created vs. (pre-deletion) admin-created case for the same input. |
| Concurrent edits clobbered by full-list replace | Documented in §3; optional `add`/`remove` path as future work; not a parity blocker. |
| Markdown editor changes stored content shape | A4 pins Markdown storage; F1 editor emits Markdown; round-trip test on `description`. |
| Losing emergency admin access during data incidents | D4 keeps stock read-mostly admin for inspection; maintenance commands untouched. |
