# E2E Auth, Environment & Fixtures

Supporting doc for [`admin-e2e-test-plan.md`](./admin-e2e-test-plan.md). Covers:
the docker-compose stack, the **FE dev-login bypass** that lets headless
browsers authenticate, the seed fixture, and the Playwright harness shape.

---

## 1. The environment (full docker-compose stack)

```
                         ┌───────────────────────────────┐
  Playwright (chromium)  │  Vite dev server  :40114       │
        │                │  (real SPA, real proxy)        │
        └───────HTTP─────▶│  proxy /api,/nes,/ngm,         │
                         │        /django-admin,/static,  │
                         │        /media  ───────────────┐│
                         └───────────────────────────────┘│
                                                           ▼
                         ┌───────────────────────────────────────────┐
                         │  monolith  :48000  (DEBUG=1, DEV_AUTH=1)    │
                         │   ├─ pg-nes    :5432                        │
                         │   ├─ pg-ngm    :5433                        │
                         │   ├─ pg-jawaf  :5434  (cases+review+jobs)   │
                         │   └─ opensearch:9200                        │
                         └───────────────────────────────────────────┘
```

Why the **Vite dev server** and not a static build: it exercises the real proxy
config (`vite.config.ts:54` proxies `/api`, `/nes`, `/ngm`, `/django-admin`,
`/static`, `/media` → `:48000`), so relative-URL API calls and same-origin
cookies behave exactly as in production behind the reverse proxy.

Why **OpenSearch is in the stack**: the search-reflects-mutations spec and NES
reindex path are real, not stubbed.

### Bring-up (target commands — compose file lives in `jawafdehi-api/infra`)

```bash
# API + DBs + search
cd jawafdehi-api/infra && docker compose up -d
docker compose exec api uv run python manage.py migrate
docker compose exec api uv run python manage.py create_groups   # role→group + perms
docker compose exec api uv run python manage.py seed_e2e        # NEW — see §4
docker compose exec api uv run python manage.py reindex_all     # populate OpenSearch

# FE dev server (separate shell)
cd jawafdehi-frontend
VITE_DEV_AUTH=true VITE_API_PROXY_TARGET=http://127.0.0.1:48000 bun run dev
```

Environment flags:
- **API**: `DEBUG=true DEV_AUTH=true` (so session + HTTP-Basic auth are active —
  `config/settings.py:566`). Never set in production; the flag is force-off when
  `DEBUG` and `TESTING` are both false (proven by `tests/test_dev_auth.py`).
- **FE**: `VITE_DEV_AUTH=true` enables the dev-login route (§2). Without it the
  SPA behaves as prod (real OIDC only).

---

## 2. FE dev-login bypass (the prerequisite change)

**Problem.** The admin SPA authenticates only through OIDC/Zitadel
(`UserManager` + `Authorization: Bearer <token>`). There is no dev-login path,
so a headless browser can't get past `/admin/login` without a real IdP. Standing
up Zitadel per test run is heavy.

**Decision.** Add an **env-gated dev-login** in the SPA that mirrors the
backend's `DEV_AUTH`, so tests drive the *real* UI end-to-end.

### 2.1 Behavior

When `import.meta.env.VITE_DEV_AUTH === "true"`:
- A `/admin/dev-login` route renders a tiny form (username + password + a
  quick-pick list of the seeded personas).
- Submitting **POSTs credentials to the backend to establish a Django session**
  (the backend accepts this because `DEV_AUTH` turns on `SessionAuthentication`
  + `BasicAuthentication`). The session cookie is same-origin thanks to the Vite
  proxy.
- The `PortalAuthProvider` / `CaseworkAuthProvider` is told it is authenticated
  and derives roles from `GET /api/casework/auth/me/` (which returns
  `{username, roles, is_admin}` — `review/views.py:43`), instead of from a
  decoded OIDC token.
- When `VITE_DEV_AUTH` is unset/false, none of this exists — the login screen is
  the normal OIDC redirect, unchanged. **Production is untouched.**

### 2.2 API client change

The admin/casework API clients today attach `Authorization: Bearer <token>`.
Under dev-login there is no bearer token, so the client must:
- send `credentials: "include"` on requests (so the Django **session cookie**
  rides along), and
- attach the Django **CSRF token** header on unsafe methods (POST/PUT/PATCH/
  DELETE) when running session-authenticated.

This is a small, env-gated branch in the request helper — bearer path stays the
default; cookie path only when `VITE_DEV_AUTH` and no token is present.

> Alternative considered (token injection): fabricate an OIDC-shaped JWT, seed
> the `UserManager` store in `localStorage`, and have the backend trust a test
> JWKS. Rejected for the default path because it bypasses the app's real login
> UI and needs a matching backend verifier. The session approach reuses the
> *existing, tested* `DEV_AUTH` backend seam and exercises the real auth
> provider wiring. (Token injection remains a fallback for pure-FE component
> tests that don't want a backend.)

### 2.3 Playwright `loginAs` fixture

```ts
// e2e/fixtures/auth.ts  (shape, not final)
export const PERSONAS = {
  admin:       { u: "e2e_admin",     p: "e2e" },
  moderator:   { u: "e2e_moderator", p: "e2e" },
  caseworker:  { u: "e2e_caseworker",p: "e2e" },
  nes_steward: { u: "e2e_nes",       p: "e2e" },
  nes_admin:   { u: "e2e_nesadmin",  p: "e2e" },
  readonly:    { u: "e2e_readonly",  p: "e2e" },
  // public/anon: no login
} as const;

export async function loginAs(page, role: keyof typeof PERSONAS) {
  const { u, p } = PERSONAS[role];
  await page.goto("/admin/dev-login");
  await page.getByLabel("Username").fill(u);
  await page.getByLabel("Password").fill(p);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/admin");          // landed authenticated
}
```

For speed, sessions can be captured once per role via
`storageState` and reused across specs (Playwright project dependency that logs
in each persona in `global.setup.ts`, then each spec loads the matching
`storageState`).

---

## 3. Roles → Django groups

The seed relies on `create_groups` (existing) which builds the Admin /
Moderator / Caseworker / ReadOnly / Public / ReviewAssistant groups with the
right model permissions. NES/NGM roles are additional groups
(`NES_Contributor`, `NES_Admin`, `NGM_*Tier`) resolved by the permission classes
in `entities/permissions.py` and `courts/permissions.py`. The seed assigns each
persona to the groups matching the test-plan §5 table.

| Persona | Groups assigned |
|---|---|
| `e2e_admin` | Admin (+ superuser) |
| `e2e_moderator` | Moderator |
| `e2e_caseworker` | Caseworker |
| `e2e_nes` | NES_Contributor |
| `e2e_nesadmin` | NES_Admin |
| `e2e_readonly` | ReadOnly |

---

## 4. Seed fixture — `seed_e2e` management command (to add)

A deterministic, idempotent management command in the API repo that creates a
known dataset the specs can rely on. Idempotent = safe to re-run; uses fixed
usernames/slugs/prefixes under an `e2e_`/`e2e-` namespace so it never collides
with real data and teardown is a namespace delete.

**Users/roles**: the six personas above (§3).

**NES entities**:
- `e2e/person/e2e-published-official` — a published Person.
- `e2e/org/e2e-published-agency` — a published Organization.
- `e2e/person/e2e-held-entity` — a held (unpublished) entity (for promotion/
  visibility checks).

**NGM**:
- one `Court` (`e2e-district-court`), referenced by the case form dropdown.
- one `CourtCase` (`e2e-district-court` / `E2E-001`) with a hearing + party.
- one `Material` (`court/e2e-district-court.E2E-001`) with a RAW file.

**Jawafdehi cases** (one per state, so list filters + visibility are testable):
- `e2e-case-draft` (DRAFT, CORRUPTION, has an ACCUSED entity → publishable).
- `e2e-case-in-review` (IN_REVIEW).
- `e2e-case-published` (PUBLISHED, with timeline + 2 evidence sources).
- `e2e-case-closed` (CLOSED, to prove it's never exposed).

**Document sources**:
- `e2e-source-pdf` (with an uploaded PDF, RAW + MARKDOWN link roles).
- `e2e-source-news` (MEDIA_NEWS, PERMALINK link only).

**Reviews**:
- one `DONE` review on `e2e-case-published` (backs the detail-render spec RV7).
- one `PENDING` review (backs the polling spec RV6 — poller need not run; the
  test asserts the FE shows pending + polls).

**Config**: `ReviewConfig` singleton left at defaults (pass=80, revise=60,
llm_samples=3) so RC specs have a known baseline.

### Teardown / isolation
- Specs that mutate **create their own** records with unique suffixes (a
  `data.ts` helper appends a short run id) and delete them in `afterEach`.
- The `e2e_`-namespaced seed is treated as **read-mostly**; specs that must
  mutate a seed record (e.g. publish `e2e-case-in-review`) restore state in
  teardown or operate on a per-test clone.
- Full reset between CI runs = drop + recreate DBs, re-migrate, re-seed. Cheap
  because DBs are ephemeral compose volumes.

---

## 5. Playwright harness

`playwright.config.ts` (to add — Playwright is already a devDependency,
`package.json`):

```ts
export default defineConfig({
  testDir: "./e2e",
  webServer: {                       // reuse a running dev server or boot one
    command: "VITE_DEV_AUTH=true bun run dev",
    url: "http://127.0.0.1:40114",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://127.0.0.1:40114",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },      // logs in each persona
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] },
    { name: "webkit-uploads", testMatch: /.*(materials|sources)\.spec\.ts/,
      use: { ...devices["Desktop Safari"] }, dependencies: ["setup"] },
  ],
  retries: process.env.CI ? 2 : 0,
  reporter: [["html"], ["list"]],
});
```

Notes:
- `webServer` lets `playwright test` boot the FE itself locally; in CI the
  compose stack + dev server are started by the workflow and
  `reuseExistingServer` is off.
- The **`api.ts` fixture** is a thin authenticated client used only for
  *arrange* (seed extra records) and *assert* (read back state the UI changed)
  and *teardown* — never as a substitute for driving the UI in the operation
  under test.
- `data.ts` provides `uid()` for collision-free slugs/prefixes and re-exports
  the seed reference constants.

---

## 6. Prerequisites checklist (before the suite can run)

- [ ] **FE dev-login** route + provider wiring behind `VITE_DEV_AUTH` (§2).
- [ ] **API client** cookie/CSRF fallback under `VITE_DEV_AUTH` (§2.2).
- [ ] **`seed_e2e`** management command in `jawafdehi-api` (§4).
- [ ] **compose** profile with `DEBUG=1 DEV_AUTH=1` + OpenSearch (§1).
- [ ] `playwright.config.ts` + `e2e/` scaffold (§5).
- [ ] CI job `admin-e2e` (test plan §10).

These are the implementation deliverables for the **next** engagement (this
round is docs-only). The specs themselves can be authored in parallel against
the fixture contracts above; `[GAP]`/`[GAP-UI]` specs land as `test.fixme`.
