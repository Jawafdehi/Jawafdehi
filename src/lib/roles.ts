// Role helpers for the admin panel UI gate. The API is always the authorization
// authority — these checks only decide which controls/pages the UI offers, so a
// role-less user isn't dropped into a panel that 403s on every call.
//
// SOURCE OF TRUTH for role names: the backend's role->group mapping in
// jawafdehi-api/jawafdehi_shared/auth/oidc.py (DEFAULT_ROLE_TO_GROUP). v3 authz
// model:
//   - admin        -> Django superuser (NO group). Conveyed to the FE as the
//                     `is_admin` bool on the payload, NOT as a role in `roles`.
//     Helpers that admit admins therefore take an `isAdminFlag` argument and OR
//     it in (a superuser has an EMPTY `roles` list).
//   - moderator / contributor / caseworker -> the single `Caseworker`
//     content-staff group. All three Zitadel keys are live and reach the FE, so
//     every content-staff allow-list below carries ALL of them.
//   - readonly     -> ReadOnly.
//   - job_poller   -> JobPoller (machine role; not a UI principal).
//
// The FE can receive roles in EITHER spelling: OIDC (prod) sends lowercase
// role-claim keys (e.g. "moderator", "contributor", "readonly"); dev-login /
// me sends Django Group names (e.g. "Caseworker", "ReadOnly"). Matching is
// case-insensitive, so a group name like "Caseworker" folds to "caseworker".

// The content-staff role keys/group-names (the single Caseworker role, however
// it is spelled across the OIDC-key and Django-group surfaces).
const CONTENT_STAFF_ROLES = [
  "moderator",
  "contributor",
  "caseworker",
] as const;

// Roles that may enter the admin panel at all (the panel-level gate): the
// content-staff role plus the org-wide read role. (Admin is a superuser and is
// admitted via the `is_admin` flag, not a role — see hasAdminAccess.)
export const ADMIN_ROLES = [...CONTENT_STAFF_ROLES, "readonly"] as const;

// Roles allowed to perform privileged casework actions (state transitions, the
// moderation queue, regrade-all). v3: the single content-staff role. (Admins
// are admitted via the `is_admin` flag.)
export const MODERATOR_ROLES = CONTENT_STAFF_ROLES;

// Roles the backend accepts for entity WRITES (create / edit / reindex). v3:
// entities/permissions.py accepts the single Caseworker content-staff role
// (+ superuser). The old NES_Contributor / NES_Admin namespace is retired.
export const NES_WRITE_ROLES = CONTENT_STAFF_ROLES;

// Roles the backend accepts for NGM / "Data Lake" WRITES (court cases, courts,
// firms, materials). v3: courts/permissions.py HasNgmRole accepts the single
// Caseworker content-staff role (+ superuser); the NGM rate tiers are retired.
export const NGM_WRITE_ROLES = CONTENT_STAFF_ROLES;

function normalize(roles: readonly string[] | undefined): string[] {
  return (roles ?? []).map((r) => r.toLowerCase());
}

function hasAny(roles: readonly string[] | undefined, allowed: readonly string[]): boolean {
  const lower = new Set(normalize(roles));
  return allowed.some((r) => lower.has(r.toLowerCase()));
}

// May the user open the admin panel at all? Admits content-staff/readonly by
// role, OR a superuser via the `is_admin` flag (superusers have no group).
export function hasAdminAccess(
  roles: readonly string[] | undefined,
  isAdminFlag = false,
): boolean {
  return isAdminFlag || hasAny(roles, ADMIN_ROLES);
}

// May the user perform privileged casework actions? Content-staff by role, OR a
// superuser via the `is_admin` flag.
export function isModerator(
  roles: readonly string[] | undefined,
  isAdminFlag = false,
): boolean {
  return isAdminFlag || hasAny(roles, MODERATOR_ROLES);
}

// Is the user an admin (superuser)? v3: admin is NOT a role in `roles` — it is
// the `is_admin` payload bool. Retained here as the single admin signal.
export function isAdmin(
  roles: readonly string[] | undefined,
  isAdminFlag = false,
): boolean {
  return isAdminFlag || normalize(roles).includes("admin");
}

// May the user WRITE entities (create/edit/reindex)? Gates the Entities section.
// Backend gate: entities/permissions.py (Caseworker + superuser).
export function hasNesWriteAccess(
  roles: readonly string[] | undefined,
  isAdminFlag = false,
): boolean {
  return isAdminFlag || hasAny(roles, NES_WRITE_ROLES);
}

// May the user WRITE NGM / Data Lake records (courts, cases, firms, materials)?
// Gates the Data Lake section. Backend gate: courts/permissions.py HasNgmRole.
export function hasNgmWriteAccess(
  roles: readonly string[] | undefined,
  isAdminFlag = false,
): boolean {
  return isAdminFlag || hasAny(roles, NGM_WRITE_ROLES);
}
