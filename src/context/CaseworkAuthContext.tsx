import React, { createContext, useContext, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import type { CaseworkUser } from "@/types/casework";
import { getUserManager } from "@/services/oidc";
import { isAdmin as rolesIsAdmin, isModerator as rolesIsModerator } from "@/lib/roles";
import {
  DEV_AUTH_ENABLED,
  getStoredDevUser,
  devLogin as devLoginRequest,
  devLogout as devLogoutRequest,
} from "@/services/dev-auth";

interface AuthContextValue {
  user: CaseworkUser | null;
  loading: boolean;
  error: string | null;
  // `returnTo` is the in-app path to land on after the OIDC round-trip. Pass
  // the page the user actually asked for (the login page captures it from the
  // router `from` state) — omitting it falls back to the current pathname,
  // which is the login page itself and would be discarded by the callback.
  login: (returnTo?: string) => void;
  logout: () => void;
  isAdmin: boolean;
  // True when the user holds admin OR moderator — the UI gate for privileged
  // actions (state transitions, moderation queue, regrade-all). The API is the
  // authorization authority; this only decides which controls the UI offers.
  isModerator: boolean;
  // DEV-ONLY: whether the username/password login form is available (VITE_DEV_AUTH).
  devAuthEnabled: boolean;
  // DEV-ONLY: authenticate with username/password (Django session). Throws on
  // bad credentials so the login form can surface the error.
  devLogin: (username: string, password: string) => Promise<void>;
}

const CaseworkAuthContext = createContext<AuthContextValue | null>(null);

// Build the portal user straight from the OIDC token claims. `roles` is the
// flattened roles array (role keys, lowercase); the API remains the
// authorization authority — this is only for the header / UI gating.
function toCaseworkUser(
  profile: Record<string, unknown> | undefined,
): CaseworkUser | null {
  if (!profile) return null;
  const roles = Array.isArray(profile.roles)
    ? (profile.roles as unknown[]).filter(
        (r): r is string => typeof r === "string",
      )
    : [];
  const username =
    (profile.email as string) ||
    (profile.preferred_username as string) ||
    (profile.name as string) ||
    "";
  // v3: prefer an explicit is_admin/is_superuser claim if the IdP emits one;
  // otherwise fall back to the `admin` role key (which the Zitadel token DOES
  // carry for a superuser — it's what drives is_superuser server-side).
  const is_admin =
    typeof profile.is_admin === "boolean"
      ? profile.is_admin
      : typeof profile.is_superuser === "boolean"
        ? profile.is_superuser
        : roles.includes("admin");
  return { username, roles, is_admin };
}
// NOTE: dev-login / me responses carry an explicit `is_admin` bool (a superuser
// has an empty `roles` list in v3), so the gates below read `user.is_admin`
// alongside `user.roles` — never infer admin-ness from `roles` alone.

export function CaseworkAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  // DEV-ONLY session user (username/password). Rehydrated from localStorage so a
  // reload stays logged in. When present it takes precedence over OIDC.
  const [devUser, setDevUser] = useState<CaseworkUser | null>(() =>
    getStoredDevUser(),
  );

  const oidcUser = useMemo(
    () => (auth.isAuthenticated ? toCaseworkUser(auth.user?.profile) : null),
    [auth.isAuthenticated, auth.user?.profile],
  );

  const user = devUser ?? oidcUser;

  const login = (returnTo?: string) => {
    auth.signinRedirect({
      state: returnTo ?? window.location.pathname + window.location.search,
    });
  };

  const devLogin = async (username: string, password: string) => {
    const u = await devLoginRequest(username, password);
    setDevUser(u);
  };

  const logout = () => {
    if (devUser) {
      // End the dev session and drop the local snapshot; stay in the SPA.
      devLogoutRequest().finally(() => {
        setDevUser(null);
        window.location.assign("/admin/login");
      });
      return;
    }
    getUserManager().signoutRedirect();
  };

  return (
    <CaseworkAuthContext.Provider
      value={{
        user,
        loading: auth.isLoading,
        error: auth.error?.message ?? null,
        login,
        logout,
        isAdmin: rolesIsAdmin(user?.roles, user?.is_admin ?? false),
        isModerator: rolesIsModerator(user?.roles, user?.is_admin ?? false),
        devAuthEnabled: DEV_AUTH_ENABLED,
        devLogin,
      }}
    >
      {children}
    </CaseworkAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCaseworkAuth() {
  const ctx = useContext(CaseworkAuthContext);
  if (!ctx) throw new Error("useCaseworkAuth must be used inside CaseworkAuthProvider");
  return ctx;
}
