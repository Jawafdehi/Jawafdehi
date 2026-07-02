import { describe, it, expect } from "vitest";
import { matchRoutes } from "react-router-dom";
import { entityPath } from "./entity-links";

describe("entityPath", () => {
  it("keeps the prefix/slug tail as multiple path segments (not %2F)", () => {
    expect(entityPath("https://jawafdehi.org/entity/person/ram-shah")).toBe(
      "/entity/person/ram-shah",
    );
  });

  it("returns null for null/undefined/empty and non-entity IRIs", () => {
    expect(entityPath(null)).toBeNull();
    expect(entityPath(undefined)).toBeNull();
    expect(entityPath("")).toBeNull();
    expect(entityPath("https://jawafdehi.org/material/ciaa/doc-1")).toBeNull();
  });

  it("produces a path that matches the IRI-aware /entity/* splat route, not the numeric /entity/:id", () => {
    // Mirror the two routes App.tsx registers for entities.
    const routes = [
      { path: "/entity/:id" },
      { path: "/entity/*" },
    ];
    const path = entityPath("https://jawafdehi.org/entity/person/ram-shah");
    expect(path).not.toBeNull();
    const matched = matchRoutes(routes, path!);
    expect(matched).not.toBeNull();
    // The splat route (EntityRecordProfile) must win — its param "*" carries the
    // full prefix/slug tail. The numeric ":id" route would parseInt() -> NaN.
    const last = matched![matched!.length - 1];
    expect(last.route.path).toBe("/entity/*");
    expect(last.params["*"]).toBe("person/ram-shah");
  });
});
