import { UserManager, WebStorageStateStore } from "oidc-client-ts";

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

  const scope = ["openid", "profile", "email"];
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
    // Silent renew uses a hidden iframe, which Zitadel blocks via
    // frame-ancestors 'none'. Disabled; tokens are long-lived enough for now.
    automaticSilentRenew: false,
  });

  return userManager;
}

export function getUserManager(): UserManager {
  return createUserManager();
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
  return user && !user.expired ? user.access_token : null;
}
