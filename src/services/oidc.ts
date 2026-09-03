import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";

let userManager: UserManager | null = null;

function createUserManager(): UserManager {
  if (userManager) return userManager;

  // OIDC config for the casework portal SPA. These are public values (they ship
  // in the browser anyway), so they're baked in here with an env override for
  // local/staging. NOTE: the audience scope URN below is the current provider's
  // (Zitadel) format — revisit if the IdP changes.
  const authority =
    import.meta.env.VITE_OIDC_AUTHORITY || "https://auth.jawafdehi.org";
  // The SPA client now lives in the gated Zitadel project (login is restricted to
  // staff via a project grant); tokens still request the public project's audience
  // scope below so the API sees the caller's roles.
  const client_id =
    import.meta.env.VITE_OIDC_CLIENT_ID || "383260434469224721";
  const audience =
    import.meta.env.VITE_OIDC_AUDIENCE || "377760393168159088";
  const origin = window.location.origin;

  // `offline_access` is what makes Zitadel issue a REFRESH TOKEN, which is the
  // only renewal path available to this SPA (see automaticSilentRenew below).
  // Without it the session silently dies at access-token expiry.
  const scope = ["openid", "profile", "email", "offline_access"];
  if (audience) {
    scope.push(`urn:zitadel:iam:org:project:id:${audience}:aud`);
  }

  userManager = new UserManager({
    authority,
    client_id,
    // NOTE: the admin panel was moved from /portal to /admin. These redirect
    // URIs must be registered on the Zitadel OIDC app (add
    // `${origin}/admin/callback` and post-logout `${origin}/admin/login`).
    redirect_uri: `${origin}/admin/callback`,
    post_logout_redirect_uri: `${origin}/admin/login`,
    response_type: "code",
    scope: scope.join(" "),
    // Pull the flattened `roles` claim (and profile) from the userinfo endpoint
    // into user.profile so the SPA can gate the UI without a Django round-trip.
    loadUserInfo: true,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    // Deliberately OFF, and NOT because of the iframe. `signinSilent()` uses the
    // refresh-token grant (a plain POST, no iframe) whenever the stored user has
    // a `refresh_token`, which `offline_access` above now guarantees — so the
    // frame-ancestors block that originally disabled this no longer applies.
    //
    // It stays off because the library's SilentRenewService calls
    // `signinSilent()` DIRECTLY, which would bypass `renewOnce` below and let a
    // timer-driven grant run concurrently with an on-demand one. Two grants on a
    // rotating refresh token is the exact failure `renewOnce` exists to prevent.
    // The expiry timer is wired to `renewOnce` instead (just below), so every
    // renewal in this tab — timer or on-demand — goes through the one latch.
    automaticSilentRenew: false,
  });

  // Renew ahead of expiry rather than letting the session lapse. Without this,
  // the access token simply expired mid-visit and `getAccessToken` began
  // returning null, so every API call silently dropped to anonymous: reads still
  // returned 200, just without the role-gated fields, so page content changed
  // with no sign the session had ended.
  //
  // `accessTokenExpiring` fires ahead of expiry (default 60s), so this normally
  // renews while the current token is still usable. `getAccessToken`'s on-demand
  // path covers what a timer cannot: a suspended machine or throttled background
  // tab wakes with the token already dead and this event never delivered.
  userManager.events.addAccessTokenExpiring(() => {
    void renewOnce(userManager!).catch(() => {
      // Nothing to do here — the next getAccessToken() retries, and reports
      // anonymous if the refresh token is genuinely gone.
    });
  });

  return userManager;
}

export function getUserManager(): UserManager {
  return createUserManager();
}

// Refresh tokens are ROTATED: a grant invalidates the token any other caller is
// still holding, so a second concurrent grant fails — and reuse detection can
// revoke the whole chain and log the user out. Every renewal therefore has to be
// serialised, and there are two ways to end up with concurrent grants.
//
// WITHIN a tab: `http.ts`'s request interceptor awaits getAccessToken() on EVERY
// request and a page load fires a burst of them (the case, then one per entity
// and per court case), so an expired token would start N grants at once. The
// in-flight promise below collapses those into one grant with N awaiters.
let inFlightRenewal: Promise<User | null> | null = null;

// ACROSS tabs: the user lives in localStorage, shared by every tab, and each tab
// arms its own expiry timer off the same `expires_at` — so they wake together and
// rotate each other's token. Not hypothetical here: the normal workflow is the
// admin panel open alongside a case page. Web Locks serialises them.
const RENEWAL_LOCK = "jds:oidc-renewal";

function renewOnce(um: UserManager): Promise<User | null> {
  inFlightRenewal ??= renewUnderLock(um).finally(() => {
    inFlightRenewal = null;
  });
  return inFlightRenewal;
}

async function renewUnderLock(um: UserManager): Promise<User | null> {
  const grant = async (): Promise<User | null> => {
    // Re-read the store now that we hold the lock: another tab may have renewed
    // while we waited, in which case its token is already here and granting
    // again would rotate the one it just stored out from under it. This
    // re-check is what makes the lock useful rather than merely a queue.
    const current = await um.getUser();
    if (current && !current.expired) return current;
    // Same guard as getAccessToken: without a refresh token, signinSilent()
    // falls back to a hidden-iframe request that the IdP's frame-ancestors
    // policy can only leave hanging until it times out.
    if (!current?.refresh_token) return null;
    return await um.signinSilent();
  };

  // Web Locks is unavailable in older Safari and in non-secure contexts. The
  // in-flight promise above still serialises this tab; cross-tab races fall back
  // to the pre-existing behaviour rather than blocking renewal entirely.
  const locks = globalThis.navigator?.locks;
  if (!locks) return grant();
  return (await locks.request(RENEWAL_LOCK, grant)) ?? null;
}

export function onSigninCallback(): void {
  // Strip the ?code&state query params so a refresh on /admin/callback does
  // not re-process a spent authorization code. Path-level navigation is done
  // by the CaseworkCallback component (which is React Router-aware).
  window.history.replaceState({}, document.title, window.location.pathname);
}

export async function getAccessToken(): Promise<string | null> {
  // No browser, no user session. This guard is load-bearing for SSR, not just
  // tidiness: `http.ts`'s request interceptor awaits this on EVERY request, and
  // createUserManager() above reads `window.location.origin` unguarded. Under
  // `bun run scripts/pre-render.ts` that throws before the request is sent, so
  // every prefetch in entry-server.tsx failed and the `Promise.allSettled` around
  // them swallowed it — each page shipped `{"queries":[]}` and prerendered its
  // data sections as empty skeletons.
  //
  // Returning null (rather than making a UserManager work server-side) is also
  // the correct posture: pre-rendered HTML is served to everyone, so it must only
  // ever contain data fetched anonymously. A bearer token here would bake one
  // staff member's authorized view into a public static file.
  if (typeof window === "undefined") return null;

  const um = getUserManager();
  const user = await um.getUser();
  if (user && !user.expired) return user.access_token;

  // Expired (or expiring-and-the-timer-never-fired: a suspended laptop or a
  // backgrounded tab throttles `automaticSilentRenew`'s timer, and the tab wakes
  // up holding a dead token). Renew on demand rather than returning null, which
  // is what silently downgraded the caller to an anonymous request.
  //
  // Only via the refresh token: `signinSilent()` falls back to a hidden-iframe
  // authorization request when the user has none, and Zitadel blocks framing
  // with frame-ancestors 'none', so that path can only hang until it times out.
  // No refresh token (no session, or one issued before `offline_access` was
  // requested) means the user must log in again — return null and let the admin
  // route guard handle it.
  if (!user?.refresh_token) return null;

  try {
    const renewed = await renewOnce(um);
    return renewed && !renewed.expired ? renewed.access_token : null;
  } catch {
    // Refresh token expired or revoked. Anonymous is the honest answer; the
    // stored user is left in place for the route guard to act on.
    return null;
  }
}
