// SPDX-License-Identifier: Hippocratic-3.0
// The Worker's own API credential, for edge SSR fetches.
//
// Every cache miss renders a page from api.jawafdehi.org. Anonymous calls from
// Cloudflare's egress IPs share the API's 1000/hour anonymous throttle, and one
// crawler sweep of the archive is tens of thousands of misses — so the Worker
// authenticates as the same `sa-prerender` machine user the build uses
// (scripts/build-auth.ts). Its single role maps to a Django group with no
// permissions, so it sees exactly what an anonymous reader sees (DRAFT cases
// 404 for it); the role buys only its own throttle scope.
//
// Optional by design: with no secrets configured the Worker renders
// anonymously, which is correct and merely throttle-bound. A failed mint backs
// off and renders anonymously too — a page served is worth more than a page
// served with the right credential.

const TOKEN_ENDPOINT = 'https://auth.jawafdehi.org/oauth/v2/token';
// Public value: the platform's OIDC audience, the Zitadel project id.
const AUDIENCE = '377760393168159088';
const SCOPE = [
  'openid',
  `urn:zitadel:iam:org:project:id:${AUDIENCE}:aud`,
  'urn:zitadel:iam:org:projects:roles',
].join(' ');

const MINT_TIMEOUT_MS = 3000;
// Re-mint this long before the token says it expires.
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;
// After a failed mint, render anonymously for this long before trying again,
// so an auth outage costs one slow request a minute rather than one per miss.
const FAILURE_BACKOFF_MS = 60 * 1000;

export interface ApiTokenEnv {
  EDGE_API_CLIENT_ID?: string;
  EDGE_API_CLIENT_SECRET?: string;
}

let cached: { token: string; expiresAt: number } | null = null;
let retryAfter = 0;
let pending: Promise<string | null> | null = null;

/** Test hook. */
export function resetApiTokenCache(): void {
  cached = null;
  retryAfter = 0;
  pending = null;
}

/** The bearer for edge SSR fetches, or null to render anonymously. Never throws. */
export async function edgeApiToken(env: ApiTokenEnv, now = Date.now()): Promise<string | null> {
  const clientId = env.EDGE_API_CLIENT_ID?.trim();
  const clientSecret = env.EDGE_API_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  if (cached && cached.expiresAt > now) return cached.token;
  if (now < retryAfter) return null;
  // One mint per isolate at a time; concurrent misses share it.
  if (pending) return pending;

  pending = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MINT_TIMEOUT_MS);
    try {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: SCOPE,
        }),
      });
      if (!res.ok) throw new Error(`token endpoint answered ${res.status}`);
      const data = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
      if (typeof data.access_token !== 'string' || !data.access_token) {
        throw new Error('token endpoint returned no access_token');
      }
      const lifetimeMs = (typeof data.expires_in === 'number' ? data.expires_in : 3600) * 1000;
      cached = { token: data.access_token, expiresAt: now + Math.max(lifetimeMs - EXPIRY_MARGIN_MS, 60_000) };
      return cached.token;
    } catch (err) {
      // No response body or credential in the log line: it can echo the request.
      console.warn('[edge-ssr] API token mint failed; rendering anonymously', String((err as Error)?.message ?? err));
      retryAfter = now + FAILURE_BACKOFF_MS;
      return null;
    } finally {
      clearTimeout(timer);
      pending = null;
    }
  })();
  return pending;
}
