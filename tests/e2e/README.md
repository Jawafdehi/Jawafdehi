# Headless E2E harness

Drives the real SPA in headless Chromium (Playwright) against a mock backend that serves captured production fixtures, so admin write flows can be exercised end-to-end without a live API.

## Pieces

- `mock-api.ts` — Bun server on `127.0.0.1:48000` (the Vite proxy target). Serves `fixtures/*.json` (public read-plane responses captured from api.jawafdehi.org) and applies writes (case RFC-6902 PATCH, material PUT/POST) to an in-memory overlay. Implements the `DEV_AUTH` session endpoints, so the admin SPA can authenticate.
- `fixtures/` — captured JSON: cases list/detail, materials, statistics, entities, one court case with hearings/entities.
- `admin-dates-repro.mjs` — admin case editor: BS/AD date pairing, the BS-picker corruption/crash path, bigo comma formatting, timeline inline inserts, and the save wire format.
- `site-and-materials.mjs` — field-based material edit form (PUT body shape), case-detail evidence-title links to `/material/*`, home-page case-card thumbnail fallback.
- `case-detail.mjs` — redesigned case page: banner (breadcrumb, badges, court-case @id IRI links), section jump nav, material-based evidence cards, PDF preview dialog, `/courtcase` page, `/case/<court-ref>` slug redirect, guest-chat-removal 404.
- `casework-reviews.mjs` — casework review flow: autocomplete case-search submit (no raw-IRI box), the slimmed one-row-per-case list (latest run only), the per-case review page (`/admin/reviews/case/:slug`) run history, and the run-detail breakdown. Uses the in-memory review store the mock seeds (one case, two runs) and appends on submit.
- `smoke.mjs` — quick home-page load check.

## Running

```bash
bun tests/e2e/mock-api.ts &                             # mock backend :48000
VITE_DEV_AUTH=true bunx vite --port 40115 --strictPort & # SPA dev server
node tests/e2e/admin-dates-repro.mjs                     # exit 0 = all checks pass
node tests/e2e/site-and-materials.mjs
```

`E2E_BASE_URL` overrides the SPA origin (default `http://127.0.0.1:40115`); `E2E_SHOTS_DIR` sets where screenshots land (default `/tmp/e2e-shots`). The drivers seed the dev-auth localStorage snapshot and pre-answer the cookie-consent banner, then assert on live DOM state and on the request bodies the SPA sends.

The mock is stateful within one process (writes persist). Restart it between driver runs for a pristine fixture state.
