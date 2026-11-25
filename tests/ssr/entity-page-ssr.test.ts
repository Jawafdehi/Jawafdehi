// SPDX-License-Identifier: Hippocratic-3.0
// @vitest-environment node
//
// node, not jsdom: react-helmet-async only fills helmetContext when there is no
// DOM, and the head is what this file checks. See case-page-ssr.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Case } from "@/types/jds";

/**
 * An entity page must reach a crawler with a head that says who the page is
 * about and what the archive holds on them — in the server-rendered HTML, not
 * after hydration.
 *
 * Before: "<Name> | Jawafdehi Entity Registry", "<Name> — Person in the Jawafdehi
 * public entity registry." on all 15,473 person pages, and no structured data at
 * all, on a registry whose records ARE schema.org JSON-LD.
 */

const { httpGet, getCasesCitingEntity } = vi.hoisted(() => ({
  httpGet: vi.fn(),
  getCasesCitingEntity: vi.fn(),
}));

vi.mock("@/services/http", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/services/http")>();
  real.http.get = httpGet as unknown as typeof real.http.get;
  return real;
});
vi.mock("@/services/jds-api", () => ({
  getStatistics: vi.fn(),
  getCaseById: vi.fn(),
  getCasesCitingEntity,
  getCasesCitingCourtCase: vi.fn(),
}));

// A real record's SHAPE — a registry entry reconciled to Wikidata — with the
// fields this page reads, but a fictional person, case and Wikidata id, per the
// repo's fixture rule: test code must not carry a real person's accused status,
// even one we publish.
const IRI = "https://jawafdehi.org/entity/person/namuna-netaa-q999999999";
const RECORD = {
  "@id": IRI,
  "@type": "Person",
  "@context": "https://schema.org",
  name: { en: "Namuna Netaa", ne: "नमुना नेता" },
  alternateName: ["Namuna Neta"],
  identifier: [{ "@type": "PropertyValue", propertyID: "wikidata", value: "Q999999999" }],
  dateCreated: "2026-06-28T20:29:31Z",
};
const CASE = {
  id: 1,
  slug: "namuna-cooperative-fraud-099",
  title: "Namuna Cooperative Fraud",
  case_type: "CORRUPTION",
  state: "PUBLISHED",
  proceedings_started_on: "2023-12-25",
  created_at: "2026-01-03T00:00:00Z",
  dates: { stages: [] },
  entities: [{ nes_id: IRI, display_name: "Namuna Netaa", type: "accused", outcome: "charged" }],
} as unknown as Case;

const { render } = await import("../../src/entry-server");
const renderEntity = () =>
  render("/entity/person/namuna-netaa-q999999999/", undefined, { edge: true });

function ldBlocks(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]) as Record<string, unknown>,
  );
}

describe("SSR of an entity page", () => {
  beforeEach(() => {
    httpGet.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/entities/")) return { data: RECORD };
      return { data: { results: [], next: null } };
    });
    getCasesCitingEntity.mockResolvedValue({ count: 1, next: null, previous: null, results: [CASE] });
  });

  it("titles the page in both scripts", async () => {
    const title = (await renderEntity()).helmetContext.helmet?.title?.toString() ?? "";
    expect(title).toContain("नमुना नेता · Namuna Netaa | Jawafdehi");
  });

  it("describes what the archive holds on them, not the registry boilerplate", async () => {
    const meta = (await renderEntity()).helmetContext.helmet?.meta?.toString() ?? "";
    const description = /name="description" content="([^"]*)"/.exec(meta)?.[1] ?? "";
    expect(description).toContain("Namuna Cooperative Fraud");
    expect(description).not.toContain("public entity registry");
    // An undecided case: the role, and no invented verdict.
    expect(description).not.toMatch(/विचाराधीन|pending/i);
  });

  it("ships the Person node, reconciled to Wikidata and linked to its case", async () => {
    const helmet = (await renderEntity()).helmetContext.helmet;
    const person = ldBlocks(helmet?.script?.toString() ?? "").find((b) => b["@type"] === "Person");
    expect(person).toMatchObject({
      "@id": IRI,
      url: "https://jawafdehi.org/entity/person/namuna-netaa-q999999999/",
      name: "नमुना नेता",
      sameAs: ["https://www.wikidata.org/wiki/Q999999999"],
      subjectOf: [
        {
          "@type": "CreativeWork",
          name: "Namuna Cooperative Fraud",
          url: "https://jawafdehi.org/case/namuna-cooperative-fraud-099/",
        },
      ],
    });
    expect(person!.alternateName).toEqual(expect.arrayContaining(["Namuna Netaa", "Namuna Neta"]));
  });
});
