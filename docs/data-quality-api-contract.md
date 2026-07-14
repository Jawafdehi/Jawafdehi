# `/api/statistics/` — field contract for the Data Quality & Coverage page

The frontend Data Quality & Coverage page (`/data-quality`) is **already coded** for the
fields below. Each corresponds to an existing, unused React component that renders the
moment the field appears in the live payload — no frontend changes are needed to light
them up. Every field is already declared (optional) in `src/types/jds.ts` and has a
reference value in the `?mock=1` fixture `src/lib/data-quality-mock.ts`.

Add these to `GET /api/statistics/`. All items are optional/additive; the page degrades
gracefully (renders nothing for a section) until each ships, so they can land
independently in any order.

Ranked by leverage (highest first).

---

## 1. `cases_ciaa` / `cases_non_ciaa` — CIAA prosecution split

Unblocks the right-column donut in `AccountabilityGap.tsx` (renders only when the sum > 0).

```jsonc
{
  "cases_ciaa": 1804,        // corruption cases prosecuted by CIAA (criminal "CR" court-case number)
  "cases_non_ciaa": 1122     // documented cases running through other bodies
}
```
- Both integers, top-level. Classify by the CR court-case number, per the existing donut caption.

## 2. `ngm.by_year` + `ngm.by_court_type_year` — court-record time distribution

Unblocks `CourtYearTrend.tsx` (area chart) and `CourtYearMatrix.tsx` (court × year heatmap),
both already rendered conditionally by `EvidenceBackbone.tsx`.

```jsonc
"ngm": {
  "by_year": [ { "year": 2024, "count": 320145 }, { "year": 2023, "count": 298877 } /* … */ ],
  "by_court_type_year": [
    { "court__court_type": "district", "year": 2024, "count": 210110 },
    { "court__court_type": "high",     "year": 2024, "count":  78233 }
    /* one row per (court type × year) cell */
  ]
}
```
- `by_court_type` values already use lowercased keys (`district`/`high`/`supreme`/`special`); keep them consistent here — the heatmap/label mappers expect the same keys.

## 3. `nes.persons_by_sector` — person breakdown by sector

Unblocks the `PersonsBySector` bar inside `EntityBreakdown.tsx`.

```jsonc
"nes": {
  "persons_by_sector": [
    { "sector": "local_gov",    "count": 154800 },
    { "sector": "legislators",  "count":   3500 },
    { "sector": "not_recorded", "count":   2400 }
    /* … civil_service, judiciary, security, business, politicians, other */
  ]
}
```
- `sector` is a stable slug; the frontend maps slugs → labels (`src/lib/person-sector-labels.ts`) and has UI toggles for "hide not recorded" / "group broadly", so include a `not_recorded` bucket rather than dropping unclassified persons.

## 4. Per-source health metadata — real Source Health cards

Today `materials.by_source` is `{ source, count }[]`. Extend each item (or add a parallel
array) with a freshness timestamp and per-source completeness so the page can show true
source-health cards instead of just counts.

```jsonc
"materials": {
  "by_source": [
    {
      "source": "ag",
      "count": 99750,
      "last_updated": "2026-07-13T09:12:00Z",   // NEW: last successful sync for this source
      "completeness": { "with_url": 44.1, "with_date": 3.2, "with_description": 12.0 }  // NEW: per-source %
    }
    /* … */
  ]
}
```
- This is the only item above **not** yet coded on the frontend (there is no per-source card component yet) — it is the one that needs a small new UI in addition to the field. Listed here because it directly answers the prompt's "Source Health" section, which is otherwise impossible: the global snapshot has no per-source freshness or completeness.

---

## Not requestable as a single field — need new backend capabilities

These answer prompt sections that the current point-in-time snapshot fundamentally cannot:

- **Coverage / quality trend over time** and a **"Recent Improvements" timeline** — require
  storing *periodic snapshots* (a history table) and a new endpoint, e.g.
  `GET /api/statistics/history/?metric=…&interval=weekly`. Without stored history there is
  no time axis to plot.
- **Known Issues** (duplicate records, OCR/parsing/validation failures) — require the
  ingestion pipeline to *emit and expose* dedup + error counts. None are collected today.

## Explicitly NOT requested

No `overall_coverage_pct` or `data_quality_score` field. There is no denominator for either
(no universe of "all cases that should exist"), so any single number would be fabricated and
would contradict the page's honest, per-domain completeness design (`truncPct` in
`src/lib/data-quality.ts`, which truncates rather than rounds so an incomplete figure never
reads as a clean 100%). Keep completeness per-field, per-domain — as it is now.
