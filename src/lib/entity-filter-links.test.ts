import { describe, it, expect } from "vitest";
import {
  entityFilterForGroup,
  entityTypeSearchHref,
} from "./entity-filter-links";

describe("entityTypeSearchHref", () => {
  it("pins the record type and appends each entity_type token", () => {
    expect(entityTypeSearchHref(["Hospital"])).toBe(
      "/search?type=entity&entity_type=Hospital",
    );
    expect(entityTypeSearchHref(["Person"])).toBe(
      "/search?type=entity&entity_type=Person",
    );
  });
});

describe("entityFilterForGroup", () => {
  it("returns an entity search href for clean single-token groups", () => {
    expect(entityFilterForGroup("hospitals")).toBe(
      "/search?type=entity&entity_type=Hospital",
    );
    expect(entityFilterForGroup("schools")).toBe(
      "/search?type=entity&entity_type=EducationalOrganization",
    );
  });

  it("includes every token for multi-token groups", () => {
    const href = entityFilterForGroup("government");
    expect(href).toContain("type=entity");
    expect(href).toContain("entity_type=GovernmentOrganization");
  });

  it("returns undefined for groups with no clean token set", () => {
    expect(entityFilterForGroup("localGov")).toBeUndefined();
    expect(entityFilterForGroup("other")).toBeUndefined();
  });
});
