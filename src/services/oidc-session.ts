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
  if (!hasStoredOidcSession()) return null;
  const { getAccessToken: realGetAccessToken } = await import("./oidc");
  return realGetAccessToken();
}
