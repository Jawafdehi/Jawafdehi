// Thin OIDC session probe — deliberately free of any `oidc-client-ts` import.
//
// WHY THIS FILE EXISTS: `oidc-client-ts` is ~121 KB raw / ~23 KB gzip and used
// to sit in the PUBLIC entry chunk because `services/http.ts` statically
// imported `getAccessToken` so the shared axios interceptor could attach a
// bearer token to EVERY request — including the anonymous ones that make up
// nearly all public traffic (see docs/testing/bundle-and-code-splitting.md §4).
//
// The split: this module answers "is there a persisted session?" by reading the
// exact localStorage key `oidc-client-ts` writes, WITHOUT loading the library.
// Only when a session exists does `getAccessToken` dynamically import the real
// implementation in `./oidc`. Anonymous readers never fetch the library at all;
// `scripts/bundle-budget.mjs` enforces that it stays out of the initial payload.

import { getPrerenderToken } from "./prerender-auth";

// Public OIDC config values (they ship in the browser anyway). `./oidc` builds
// its UserManager from these same constants so the storage key below can never
// drift from the key the library actually writes.
export const OIDC_AUTHORITY: string =
  import.meta.env.VITE_OIDC_AUTHORITY || "https://auth.jawafdehi.org";
export const OIDC_CLIENT_ID: string =
  import.meta.env.VITE_OIDC_CLIENT_ID || "383260434469224721";
export const OIDC_AUDIENCE: string =
  import.meta.env.VITE_OIDC_AUDIENCE || "377760393168159088";

// oidc-client-ts stores the signed-in user at
// `${WebStorageStateStore prefix}user:${authority}:${client_id}`; the store in
// `./oidc` uses the default prefix "oidc.". Pinned by src/services/oidc-session.test.ts
// against the library's own UserManager so an upgrade that moves the key fails a
// test instead of silently signing everyone out of the fast path.
export const OIDC_USER_STORAGE_KEY = `oidc.user:${OIDC_AUTHORITY}:${OIDC_CLIENT_ID}`;

/** Is there a persisted OIDC session, without loading oidc-client-ts? */
export function hasStoredOidcSession(): boolean {
  // SSR guard is load-bearing (see the pre-render note in ./oidc): pre-rendered
  // HTML must only ever contain anonymously-fetched data.
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OIDC_USER_STORAGE_KEY) !== null;
  } catch {
    // Storage unavailable (privacy mode, disabled cookies) → treat as anonymous.
    return false;
  }
}

/**
 * The bearer token for the current session, or null for anonymous visitors.
 *
 * Anonymous path: one localStorage read, no library load, resolves null.
 * Signed-in path: lazily imports `./oidc` (and with it oidc-client-ts) and
 * defers to the real `getAccessToken`, which validates expiry properly.
 */
export async function getAccessToken(): Promise<string | null> {
  // Server (the pre-render): the build's own token, or null when it is running
  // anonymously. This is the ONLY place a bearer enters a server-side request —
  // `./oidc`'s getAccessToken is never reached here, because the line below
  // resolves false off the browser and the dynamic import never happens.
  //
  // Returning a token at all looks like a violation of the rule the guards in
  // this file exist for ("pre-rendered HTML must only contain data everyone may
  // see"), so: it is that rule holding, not an exception to it. The build
  // authenticates as `sa-prerender`, whose single Zitadel role maps to a Django
  // group with no permissions that is named by no gate — DRAFT cases 404 for it
  // exactly as they do for an anonymous caller. The role buys one thing, a
  // separate throttle bucket, because rendering the whole archive against the
  // 1000/hour anonymous cap had started failing production deploys.
  //
  // ⚠️ The emptiness of that role is what makes this safe. If it is ever granted
  // anything, this line starts publishing it to crawlers. The invariant is
  // pinned in JawafdehiAPI `tests/test_prerender_role.py`; the reasoning is in
  // its docs/security/authz-model.md §8.4.
  if (typeof window === "undefined") return getPrerenderToken();

  if (!hasStoredOidcSession()) return null;
  const { getAccessToken: realGetAccessToken } = await import("./oidc");
  return realGetAccessToken();
}
