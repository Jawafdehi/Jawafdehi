import { describe, it, expect } from "vitest";
import {
  hasAdminAccess,
  isModerator,
  isAdmin,
  hasNesWriteAccess,
  hasNgmWriteAccess,
} from "./roles";

describe("roles helpers", () => {
  it("hasAdminAccess: true for any admin-panel role, case-insensitive", () => {
    expect(hasAdminAccess(["Caseworker"])).toBe(true);
    expect(hasAdminAccess(["READONLY"])).toBe(true);
    expect(hasAdminAccess(["admin"])).toBe(true);
    expect(hasAdminAccess(["moderator"])).toBe(true);
  });

  it("hasAdminAccess: false for the retired 'contributor' role, unknowns, or none", () => {
    // "contributor" was renamed to "caseworker" platform-wide; no backend path
    // emits it any more, so it must NOT admit anyone.
    expect(hasAdminAccess(["contributor"])).toBe(false);
    expect(hasAdminAccess(["viewer"])).toBe(false);
    expect(hasAdminAccess([])).toBe(false);
    expect(hasAdminAccess(undefined)).toBe(false);
  });

  it("isModerator: only admin or moderator", () => {
    expect(isModerator(["Admin"])).toBe(true);
    expect(isModerator(["MODERATOR"])).toBe(true);
    expect(isModerator(["caseworker"])).toBe(false);
    expect(isModerator(["readonly"])).toBe(false);
    expect(isModerator(undefined)).toBe(false);
  });

  it("isAdmin: only admin", () => {
    expect(isAdmin(["admin"])).toBe(true);
    expect(isAdmin(["ADMIN", "moderator"])).toBe(true);
    expect(isAdmin(["moderator"])).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it("hasNesWriteAccess: only NES roles (both OIDC + group spellings) or admin", () => {
    // OIDC claim keys
    expect(hasNesWriteAccess(["nes_contributor"])).toBe(true);
    expect(hasNesWriteAccess(["nes_admin"])).toBe(true);
    // Django group names (from dev-login / me_view), case-insensitive
    expect(hasNesWriteAccess(["NES_Contributor"])).toBe(true);
    expect(hasNesWriteAccess(["NES_Admin"])).toBe(true);
    // admin -> Django superuser, which bypasses the NES permission classes
    expect(hasNesWriteAccess(["admin"])).toBe(true);
    // Platform roles WITHOUT an NES group are backend-403'd — must be hidden.
    expect(hasNesWriteAccess(["caseworker"])).toBe(false);
    expect(hasNesWriteAccess(["moderator"])).toBe(false);
    expect(hasNesWriteAccess(["readonly"])).toBe(false);
    expect(hasNesWriteAccess(["ReadOnly"])).toBe(false);
    expect(hasNesWriteAccess([])).toBe(false);
    expect(hasNesWriteAccess(undefined)).toBe(false);
  });

  it("hasNgmWriteAccess: NGM role set (Admin/Moderator/Caseworker + tiers)", () => {
    expect(hasNgmWriteAccess(["admin"])).toBe(true);
    expect(hasNgmWriteAccess(["moderator"])).toBe(true);
    expect(hasNgmWriteAccess(["caseworker"])).toBe(true);
    expect(hasNgmWriteAccess(["Caseworker"])).toBe(true);
    // NGM tier roles — OIDC claim keys and Django group names.
    expect(hasNgmWriteAccess(["ngm_silver"])).toBe(true);
    expect(hasNgmWriteAccess(["ngm_gold"])).toBe(true);
    expect(hasNgmWriteAccess(["ngm_platinum"])).toBe(true);
    // readonly is NOT in the NGM set -> hidden.
    expect(hasNgmWriteAccess(["readonly"])).toBe(false);
    expect(hasNgmWriteAccess(["ReadOnly"])).toBe(false);
    // NES-only roles do NOT grant NGM writes.
    expect(hasNgmWriteAccess(["nes_contributor"])).toBe(false);
    expect(hasNgmWriteAccess([])).toBe(false);
    expect(hasNgmWriteAccess(undefined)).toBe(false);
  });
});
