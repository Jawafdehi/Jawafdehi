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
    // Renew ahead of expiry rather than letting the session lapse. This was off
    // because silent renew used a hidden iframe and Zitadel blocks framing with
    // frame-ancestors 'none' — but that is only the FALLBACK path.
    // `signinSilent()` uses the refresh-token grant (a plain POST to the token
    // endpoint, no iframe) whenever the stored user has a `refresh_token`, which
    // the `offline_access` scope above now guarantees. The iframe path is never
    // reached; `getAccessToken` below also refuses to take it.
    //
    // What this fixes: with no renewal, the access token simply expired mid-visit
    // and `getAccessToken` started returning null, so every API call silently
    // dropped to anonymous. Reads still returned 200 — just without the
    // casework-gated fields — so a caseworker saw page content change with no
    // sign they had been logged out.
    automaticSilentRenew: true,
  });

  return userManager;
}

export function getUserManager(): UserManager {
  return createUserManager();
}

// In-flight refresh, shared by every concurrent caller. `http.ts`'s request
// interceptor awaits getAccessToken() on EVERY request and a page load fires a
// burst of them (the case, then one per entity and per court case), so an expired
// token would otherwise start N refresh-token grants at once. Zitadel rotates
// refresh tokens: the first grant invalidates the token the other N-1 are still
// holding, so they fail and — worse — a rotation-reuse detection can revoke the
// whole chain and log the user out. One grant, N awaiters.
let inFlightRenewal: Promise<User | null> | null = null;

function renewOnce(um: UserManager): Promise<User | null> {
  inFlightRenewal ??= um.signinSilent().finally(() => {
    inFlightRenewal = null;
  });
  return inFlightRenewal;
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
