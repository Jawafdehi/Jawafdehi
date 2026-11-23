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

// A real record's shape (the registry entry reconciled to Wikidata), with the
// fields this page reads.
const IRI = "https://jawafdehi.org/entity/person/rabi-lamichhane-q14474324";
const RECORD = {
  "@id": IRI,
  "@type": "Person",
  "@context": "https://schema.org",
  name: { en: "Rabi Lamichhane", ne: "रवि लामिछाने" },
  alternateName: ["Ravi Lamichhane"],
  identifier: [{ "@type": "PropertyValue", propertyID: "wikidata", value: "Q14474324" }],
  dateCreated: "2026-06-28T20:29:31Z",
};
const CASE = {
  id: 1,
  slug: "rabi-lamichhane-cooperative-fr-11ccd7",
  title: "Rabi Lamichhane Cooperative Fraud",
  case_type: "CORRUPTION",
  state: "PUBLISHED",
  proceedings_started_on: "2023-12-25",
  created_at: "2026-01-03T00:00:00Z",
  dates: { stages: [] },
  entities: [{ nes_id: IRI, display_name: "Rabi Lamichhane", type: "accused", outcome: "charged" }],
} as unknown as Case;

const { render } = await import("../../src/entry-server");
const renderEntity = () =>
  render("/entity/person/rabi-lamichhane-q14474324/", undefined, { edge: true });

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
    expect(title).toContain("रवि लामिछाने · Rabi Lamichhane | Jawafdehi");
  });

  it("describes what the archive holds on them, not the registry boilerplate", async () => {
    const meta = (await renderEntity()).helmetContext.helmet?.meta?.toString() ?? "";
    const description = /name="description" content="([^"]*)"/.exec(meta)?.[1] ?? "";
    expect(description).toContain("Rabi Lamichhane Cooperative Fraud");
    expect(description).not.toContain("public entity registry");
    // An undecided case: the role, and no invented verdict.
    expect(description).not.toMatch(/विचाराधीन|pending/i);
  });

  it("ships the Person node, reconciled to Wikidata and linked to its case", async () => {
    const helmet = (await renderEntity()).helmetContext.helmet;
    const person = ldBlocks(helmet?.script?.toString() ?? "").find((b) => b["@type"] === "Person");
    expect(person).toMatchObject({
      "@id": IRI,
      url: "https://jawafdehi.org/entity/person/rabi-lamichhane-q14474324/",
      name: "रवि लामिछाने",
      sameAs: ["https://www.wikidata.org/wiki/Q14474324"],
      subjectOf: [
        {
          "@type": "CreativeWork",
          name: "Rabi Lamichhane Cooperative Fraud",
          url: "https://jawafdehi.org/case/rabi-lamichhane-cooperative-fr-11ccd7/",
        },
      ],
    });
    expect(person!.alternateName).toEqual(expect.arrayContaining(["Rabi Lamichhane", "Ravi Lamichhane"]));
  });
});
