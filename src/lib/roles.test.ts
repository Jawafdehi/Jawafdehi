import { describe, it, expect } from "vitest";
import {
  hasAdminAccess,
  isModerator,
  isAdmin,
  hasNesWriteAccess,
  hasNgmWriteAccess,
} from "./roles";

// v3 authz model: one content-staff role reachable under three live Zitadel
// keys — "moderator", "contributor", "caseworker" (dev-login sends the Django
// group name "Caseworker"). Admin is a superuser with NO group, conveyed via the
// `is_admin` bool (second arg), so a superuser has an EMPTY roles array.

describe("roles helpers", () => {
  it("hasAdminAccess: true for any content-staff or readonly role, case-insensitive", () => {
    expect(hasAdminAccess(["Caseworker"])).toBe(true);
    expect(hasAdminAccess(["moderator"])).toBe(true);
    expect(hasAdminAccess(["contributor"])).toBe(true);
    expect(hasAdminAccess(["READONLY"])).toBe(true);
  });

  it("hasAdminAccess: superuser admitted via the is_admin flag (empty roles)", () => {
    expect(hasAdminAccess([], true)).toBe(true);
    expect(hasAdminAccess(undefined, true)).toBe(true);
  });

  it("hasAdminAccess: false for unknowns or no role/flag", () => {
    expect(hasAdminAccess(["viewer"])).toBe(false);
    expect(hasAdminAccess([])).toBe(false);
    expect(hasAdminAccess(undefined)).toBe(false);
  });

  it("isModerator: any content-staff role (moderator/contributor/caseworker) or superuser", () => {
    expect(isModerator(["moderator"])).toBe(true);
    expect(isModerator(["contributor"])).toBe(true);
    expect(isModerator(["caseworker"])).toBe(true);
    expect(isModerator(["Caseworker"])).toBe(true);
    expect(isModerator([], true)).toBe(true); // superuser via flag
    expect(isModerator(["readonly"])).toBe(false);
    expect(isModerator(undefined)).toBe(false);
  });

  it("isAdmin: only the superuser flag (v3: admin is not a role in `roles`)", () => {
    expect(isAdmin([], true)).toBe(true);
    expect(isAdmin(undefined, true)).toBe(true);
    // Legacy "admin" role string still recognised for back-compat with any
    // caller/payload that carries it, but production superusers use the flag.
    expect(isAdmin(["admin"])).toBe(true);
    expect(isAdmin(["moderator"])).toBe(false);
    expect(isAdmin(["caseworker"])).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it("hasNesWriteAccess: the content-staff role or superuser", () => {
    expect(hasNesWriteAccess(["caseworker"])).toBe(true);
    expect(hasNesWriteAccess(["moderator"])).toBe(true);
    expect(hasNesWriteAccess(["contributor"])).toBe(true);
    expect(hasNesWriteAccess(["Caseworker"])).toBe(true);
    expect(hasNesWriteAccess([], true)).toBe(true); // superuser via flag
    // Retired NES-specific keys no longer grant access on their own.
    expect(hasNesWriteAccess(["nes_contributor"])).toBe(false);
    expect(hasNesWriteAccess(["readonly"])).toBe(false);
    expect(hasNesWriteAccess(["ReadOnly"])).toBe(false);
    expect(hasNesWriteAccess([])).toBe(false);
    expect(hasNesWriteAccess(undefined)).toBe(false);
  });

  it("hasNgmWriteAccess: the content-staff role or superuser", () => {
    expect(hasNgmWriteAccess(["moderator"])).toBe(true);
    expect(hasNgmWriteAccess(["contributor"])).toBe(true);
    expect(hasNgmWriteAccess(["caseworker"])).toBe(true);
    expect(hasNgmWriteAccess(["Caseworker"])).toBe(true);
    expect(hasNgmWriteAccess([], true)).toBe(true); // superuser via flag
    // Retired NGM rate tiers no longer grant access.
    expect(hasNgmWriteAccess(["ngm_gold"])).toBe(false);
    expect(hasNgmWriteAccess(["readonly"])).toBe(false);
    expect(hasNgmWriteAccess(["ReadOnly"])).toBe(false);
    expect(hasNgmWriteAccess([])).toBe(false);
    expect(hasNgmWriteAccess(undefined)).toBe(false);
  });
});
