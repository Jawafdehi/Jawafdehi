import { describe, it, expect } from "vitest";
import { matchRoutes } from "react-router-dom";
import { entityPath, isEntityRecordTail } from "./entity-links";

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

  // A flat tail has no page: /entity/* is the only entity route and the edge
  // answers 404 for a single segment. Returning null keeps the sitemap, the
  // pre-render walk and the link components from advertising a URL that 404s —
  // all three build their entity URLs through this one function.
  it("returns null for an IRI with no prefix/slug tail", () => {
    expect(entityPath("https://jawafdehi.org/entity/1136")).toBeNull();
    expect(entityPath("https://jawafdehi.org/entity/ram-shah")).toBeNull();
    expect(entityPath("https://jawafdehi.org/entity/")).toBeNull();
  });

  it("keeps deeper tails, which real location IRIs use", () => {
    expect(entityPath("https://jawafdehi.org/entity/location/country/nepal")).toBe(
      "/entity/location/country/nepal",
    );
  });
});

describe("isEntityRecordTail", () => {
  it("requires at least a prefix and a slug", () => {
    expect(isEntityRecordTail("person/ram-shah")).toBe(true);
    expect(isEntityRecordTail("location/country/nepal")).toBe(true);
    // Trailing slashes are not segments — the slashed and slashless forms of the
    // same page must agree, since the edge serves both.
    expect(isEntityRecordTail("person/ram-shah/")).toBe(true);
    expect(isEntityRecordTail("1136")).toBe(false);
    expect(isEntityRecordTail("person")).toBe(false);
    expect(isEntityRecordTail("")).toBe(false);
    expect(isEntityRecordTail(null)).toBe(false);
    expect(isEntityRecordTail(undefined)).toBe(false);
  });

  it("produces a path the /entity/* splat route resolves with the whole tail intact", () => {
    // The single route App.tsx registers for entities. It had a numeric
    // /entity/:id sibling until 2026-10; the tail must survive either way, so
    // this asserts the splat param rather than merely that something matched.
    const routes = [{ path: "/entity/*" }];
    const path = entityPath("https://jawafdehi.org/entity/person/ram-shah");
    expect(path).not.toBeNull();
    const matched = matchRoutes(routes, path!);
    expect(matched).not.toBeNull();
    const last = matched![matched!.length - 1];
    expect(last.route.path).toBe("/entity/*");
    expect(last.params["*"]).toBe("person/ram-shah");
  });
});
