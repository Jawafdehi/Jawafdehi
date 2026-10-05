// The build's own API credential.
//
// `scripts/pre-render.ts` and `scripts/sitemap.ts` read the entire published
// archive from the platform API on every production deploy — thousands of
// requests in a few minutes. Done anonymously that competes with real visitors
// for one 1000/hour bucket (`THROTTLE_RATE_ANON`), and the archive has outgrown
// the cap: the production build on 2026-10-03 spent ~1,010 of 1,000 and passed
// only because the synced throttle's accounting is approximate by design.
//
// So the build authenticates, as the `sa-prerender` machine user. Its single
// Zitadel role maps to a Django group with no permissions that is named by no
// gate, so it sees exactly what an anonymous caller sees — DRAFT cases 404 for
// it. The role buys one thing: its own throttle scope.
//
// ⚠️ NO `VITE_` PREFIX, EVER. Vite inlines `VITE_*` into the CLIENT bundle at
// build time; naming the secret that way would ship it to every visitor's
// browser. These are read from `process.env` here, in a script that is never
// bundled, and the token is handed to the SSR bundle through its own export
// surface (see src/services/prerender-auth.ts).
//
// Absent credentials are NOT an error here — a local `bun run build` and the
// static-scope PR build both run fine anonymously. `pre-render.ts` is where a
// full build decides that running anonymously is not acceptable.

const TOKEN_ENDPOINT =
  process.env.PRERENDER_TOKEN_ENDPOINT || 'https://auth.jawafdehi.org/oauth/v2/token';

// The platform's OIDC_AUDIENCE — the Zitadel project id for "Jawafdehi.org".
// Public value; it is in every token this site already mints in the browser.
const AUDIENCE = process.env.PRERENDER_AUDIENCE || '377760393168159088';

// The audience URN is what puts `aud` on the token; the roles scope is what
// makes the `prerender` role visible to the API. Without BOTH, the token
// authenticates and then lands in the ordinary user bucket.
const SCOPE = [
  'openid',
  `urn:zitadel:iam:org:project:id:${AUDIENCE}:aud`,
  'urn:zitadel:iam:org:projects:roles',
].join(' ');

const TOKEN_TIMEOUT_MS = 15_000;

/** Whether build credentials are configured at all. */
export function hasBuildCredentials(): boolean {
  return Boolean(
    process.env.PRERENDER_CLIENT_ID?.trim() && process.env.PRERENDER_CLIENT_SECRET?.trim(),
  );
}

let pending: Promise<string | null> | null = null;

/**
 * The build's bearer token, minted once per process, or null when no
 * credentials are configured.
 *
 * Memoized on the PROMISE rather than the resolved value so concurrent callers
 * share one token request — `pre-render.ts` fans out to CONCURRENCY workers and
 * would otherwise mint a token per worker.
 *
 * Throws on a failed mint rather than falling back to anonymous. A build that
 * quietly dropped its credential would spend eight minutes rendering and then
 * die on a wall of 429s, which is a far worse signal than failing here.
 */
export function buildAuthToken(): Promise<string | null> {
  if (pending) return pending;
  if (!hasBuildCredentials()) {
    pending = Promise.resolve(null);
    return pending;
  }

  pending = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.PRERENDER_CLIENT_ID!.trim(),
          client_secret: process.env.PRERENDER_CLIENT_SECRET!.trim(),
          scope: SCOPE,
        }),
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`[build-auth] token request timed out after ${TOKEN_TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      // Deliberately no response body in the message: a failed token endpoint
      // can echo request parameters, and this runs in CI logs.
      throw new Error(
        `[build-auth] token request failed with ${res.status}. ` +
          'Check PRERENDER_CLIENT_ID / PRERENDER_CLIENT_SECRET.',
      );
    }

    const data = (await res.json()) as { access_token?: unknown };
    if (typeof data.access_token !== 'string' || !data.access_token) {
      throw new Error('[build-auth] token endpoint returned no access_token');
    }
    return data.access_token;
  })();

  return pending;
}

/** `Authorization` header for the build's requests, or `{}` when anonymous. */
export async function buildAuthHeaders(): Promise<Record<string, string>> {
  const token = await buildAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
