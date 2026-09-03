import { useEffect, useState } from "react";

import { getStoredDevUser } from "@/services/dev-auth";
import { getAccessToken } from "@/services/oidc";

// Is there an active login session? PUBLIC pages (CaseDetail et al.) render
// OUTSIDE the admin OIDC / CaseworkAuth providers — those live only in AdminApp,
// mounted at /admin/* — so `useCaseworkAuth()` is unavailable here and would
// throw. This reads the persisted session directly instead: the dev-auth user
// (localStorage) plus the OIDC user from the localStorage-backed UserManager
// singleton, so a logged-in caseworker browsing the public site can be offered
// staff affordances (e.g. an "Edit case" link) without mounting the admin auth
// stack.
//
// It only answers "is someone signed in", NOT "may they edit" — the API and the
// admin route guards remain the authorization authority; a signed-in non-staff
// visitor who follows the link still hits the login/permission wall there.
//
// SSR-safe: starts `false` and only flips true in a client effect, so the
// pre-rendered/hydrated markup matches (the server has no session to read).
export function useIsLoggedIn(): boolean {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Dev-auth (username/password) is synchronous and already SSR-guarded.
    if (getStoredDevUser()) {
      setLoggedIn(true);
      return;
    }

    let alive = true;
    // Asks the same question the request interceptor asks — "is there a usable
    // token" — rather than re-reading the stored user, so a token that has merely
    // expired gets refreshed here too. Reading `user.expired` directly meant the
    // staff affordance vanished the moment the token lapsed, in step with the
    // API quietly demoting the same visitor to anonymous.
    getAccessToken()
      .then((token) => {
        if (alive && token) setLoggedIn(true);
      })
      .catch(() => {
        // No session, or storage unavailable → stay logged-out.
      });

    return () => {
      alive = false;
    };
  }, []);

  return loggedIn;
}
