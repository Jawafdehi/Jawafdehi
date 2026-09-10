import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Case } from "@/types/jds";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

const getCasesCitingEntity = vi.fn();
vi.mock("@/services/jds-api", () => ({
  getCasesCitingEntity: (...args: unknown[]) => getCasesCitingEntity(...args),
}));

import { EntityRelatedCases } from "@/components/EntityRelatedCases";

const ENTITY = "https://jawafdehi.org/entity/person/ram-shah";

const relatedCase = (over: Partial<Case> = {}): Case =>
  ({
    id: 1,
    slug: "a-case",
    title: "A case",
    case_type: "CORRUPTION",
    state: "PUBLISHED",
    created_at: "2019-01-01T00:00:00Z",
    updated_at: "2019-01-01T00:00:00Z",
    proceedings_started_on: "2021-10-02",
    dates: {
      stages: [
        {
          stage: "initial",
          start: "2021-10-02",
          end: "2023-06-09",
          courtcase_iri: "https://jawafdehi.org/courtcase/special/081-cr-0060",
        },
      ],
    },
    entities: [{ nes_id: ENTITY, display_name: "Ram Shah", type: "accused", outcome: "acquitted" }],
    tags: [],
    key_allegations: [],
    court_cases: [],
    bigo: null,
    ...over,
  }) as Case;

const renderList = (cases: Case[]) => {
  getCasesCitingEntity.mockResolvedValue({ count: cases.length, results: cases });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EntityRelatedCases entityIri={ENTITY} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("EntityRelatedCases", () => {
  it("names the forum on the verdict, asserting nothing about an appeal", async () => {
    // Same rule as the case page: the CIAA appeals only some defendants, so
    // any claim about pendency is false for the rest.
    renderList([relatedCase()]);

    await waitFor(() =>
      expect(screen.getByText("Special Court: acquitted")).toBeTruthy(),
    );
    expect(screen.queryByText("Acquitted")).toBeNull();
  });

  it("shows the bare verdict when the case has no single first instance", async () => {
    renderList([
      relatedCase({
        dates: {
          stages: [
            { stage: "initial", courtcase_iri: "https://jawafdehi.org/courtcase/special/081-cr-0060" },
            { stage: "initial", courtcase_iri: "https://jawafdehi.org/courtcase/butwalhc/081-cr-0061" },
          ],
        },
      }),
    ]);

    await waitFor(() => expect(screen.getByText("Acquitted")).toBeTruthy());
  });

  it("dates a row from the derived proceedings date, not the deprecated alias", async () => {
    renderList([relatedCase()]);

    await waitFor(() => expect(screen.getByText(/Oct 2, 2021/)).toBeTruthy());
  });

  it("falls back to the record's creation date when proceedings have no start", async () => {
    renderList([relatedCase({ proceedings_started_on: null })]);

    await waitFor(() => expect(screen.getByText(/Jan 1, 2019/)).toBeTruthy());
  });
});
