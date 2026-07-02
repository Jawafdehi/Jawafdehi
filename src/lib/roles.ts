// Role helpers for the admin panel UI gate. The API is always the authorization
// authority — these checks only decide which controls/pages the UI offers, so a
// role-less user isn't dropped into a panel that 403s on every call.
//
// SOURCE OF TRUTH for role names: the backend's role->group mapping in
// jawafdehi-api/jawafdehi_shared/auth/oidc.py (DEFAULT_ROLE_TO_GROUP). The FE can
// receive roles in EITHER spelling depending on the auth path:
//   - OIDC (prod): profile.roles are the Zitadel *role-claim keys*, lowercase —
//     e.g. "admin", "moderator", "caseworker", "readonly", "nes_contributor",
//     "nes_admin", "ngm_silver", "ngm_gold", "ngm_platinum".
//     (see src/context/CaseworkAuthContext.tsx toCaseworkUser)
//   - dev-login / /api/casework/auth/me/: the backend returns the *Django Group
//     names* (user.groups) — e.g. "Admin", "Moderator", "Caseworker", "ReadOnly",
//     "NES_Contributor", "NES_Admin", "NGM_SilverTier", "NGM_GoldTier",
//     "NGM_PlatinumTier". (see review/views.py _user_roles_payload)
// The two differ by MORE than case (e.g. "nes_contributor" vs "NES_Contributor",
// "ngm_gold" vs "NGM_GoldTier"), so each allow-list below carries BOTH spellings
// and all matching is case-insensitive.

// Roles that may enter the admin panel at all (the panel-level gate). Mirrors the
// platform role->group rows in DEFAULT_ROLE_TO_GROUP:
//   admin/Admin, moderator/Moderator, caseworker/Caseworker, readonly/ReadOnly.
// ("contributor" was renamed to "caseworker" platform-wide — no backend path
// emits a "contributor" claim any more, so it is intentionally absent here.)
export const ADMIN_ROLES = [
  "admin",
  "moderator",
  "caseworker",
  "readonly",
] as const;

// Roles allowed to perform privileged casework actions (state transitions, the
// moderation queue, regrade-all).
export const MODERATOR_ROLES = ["admin", "moderator"] as const;

// Roles the backend accepts for NES entity WRITES (create / edit / add-name /
// bulk-ingest / reindex). Backend gate: entities/permissions.py
// HasNesContributorRole / HasNesAdminRole — groups NES_Contributor / NES_Admin
// ONLY (superuser bypasses). Platform admin/moderator/caseworker are DELIBERATELY
// excluded from NES writes per that module's DECISION note, so the ONLY platform
// role that also clears this gate is "admin" (which the backend maps to Django
// superuser via the OIDC authenticator's admin-role -> is_superuser sync).
export const NES_WRITE_ROLES = [
  "nes_contributor", // OIDC claim key / NES_Contributor group (case-insensitive)
  "nes_admin", // OIDC claim key / NES_Admin group
  "admin", // -> Django superuser, which bypasses the NES permission classes
] as const;

// Roles the backend accepts for NGM / "Data Lake" WRITES (court cases, courts,
// firms, materials). Backend gate: courts/permissions.py HasNgmRole — groups
// Admin, Moderator, Caseworker, and the three NGM rate-limit tiers (superuser
// bypasses). The tier role-claim keys are ngm_silver/ngm_gold/ngm_platinum
// (Groups NGM_SilverTier/NGM_GoldTier/NGM_PlatinumTier).
export const NGM_WRITE_ROLES = [
  "admin",
  "moderator",
  "caseworker",
  // NGM tier roles. Matching is exact-element (case-insensitive), not substring,
  // so BOTH the OIDC claim keys AND the Django group names are listed.
  "ngm_silver", // OIDC claim key
  "ngm_gold",
  "ngm_platinum",
  "ngm_silvertier", // Django group NGM_SilverTier (from dev-login / me_view)
  "ngm_goldtier",
  "ngm_platinumtier",
] as const;

function normalize(roles: readonly string[] | undefined): string[] {
  return (roles ?? []).map((r) => r.toLowerCase());
}

function hasAny(roles: readonly string[] | undefined, allowed: readonly string[]): boolean {
  const lower = new Set(normalize(roles));
  return allowed.some((r) => lower.has(r.toLowerCase()));
}

// May the user open the admin panel at all?
export function hasAdminAccess(roles: readonly string[] | undefined): boolean {
  return hasAny(roles, ADMIN_ROLES);
}

// Does the user hold admin OR moderator (privileged-action gate)?
export function isModerator(roles: readonly string[] | undefined): boolean {
  return hasAny(roles, MODERATOR_ROLES);
}

// Is the user specifically an admin?
export function isAdmin(roles: readonly string[] | undefined): boolean {
  return normalize(roles).includes("admin");
}

// May the user WRITE NES entities (create/edit/reindex)? Gates the Entities
// section. The backend (entities/permissions.py) accepts only NES_Contributor /
// NES_Admin (+ superuser); readonly/caseworker/moderator do NOT clear it.
export function hasNesWriteAccess(roles: readonly string[] | undefined): boolean {
  return hasAny(roles, NES_WRITE_ROLES);
}

// May the user WRITE NGM / Data Lake records (courts, cases, firms, materials)?
// Gates the Data Lake section. Backend gate: courts/permissions.py HasNgmRole.
export function hasNgmWriteAccess(roles: readonly string[] | undefined): boolean {
  return hasAny(roles, NGM_WRITE_ROLES);
}
