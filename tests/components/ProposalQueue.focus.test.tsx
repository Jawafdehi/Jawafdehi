import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import ProposalQueue from "@/components/casework/ProposalQueue";
import type { CaseUpdateProposal } from "@/types/proposals";

// Passthrough translations, with interpolation for the one string whose VALUE is
// asserted here — the not-found notice has to name the id it could not find, and
// a key-only stand-in would let a regression that drops the id pass.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { defaultValue?: string; id?: string; count?: number }) => {
      if (typeof fallback === "string") return fallback;
      if (fallback?.defaultValue) {
        return fallback.defaultValue
          .replace("{{id}}", String(fallback.id ?? ""))
          .replace("{{count}}", String(fallback.count ?? ""));
      }
      return key;
    },
  }),
}));

function proposal(over: Partial<CaseUpdateProposal> = {}): CaseUpdateProposal {
  return {
    id: "1",
    case_slug: "a-case",
    case_title: "A case",
    source_kind: "ngm_docket",
    intent: { type: "append_timeline_entry", entry: { date: "2026-01-01", title: "An entry" } },
    confidence: 0.8,
    status: "pending",
    provenance: {
      source: "https://jawafdehi.org/courtcase/special/081-cr-0001",
      detected_by: "consumer:proposal-builder",
      dedup_key: "docket:special/081-cr-0001:verdict:2082-01-01",
    },
    origin_event: { subject: "jaw.case.matched", msg_id: "m-1", subject_refs: [] },
    review: { reviewer: null, reviewed_at: null, notes: "" },
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("ProposalQueue deep link", () => {
  it("opens on the focused proposal rather than the top of the queue", () => {
    render(
      <ProposalQueue
        proposals={[
          proposal({ id: "333", case_title: "First in the queue" }),
          proposal({ id: "341", case_title: "The one that was linked" }),
        ]}
        focusId="341"
      />,
    );

    // The detail pane renders the selected proposal's title; the list renders both,
    // so assert on the count rather than mere presence.
    expect(screen.getAllByText("The one that was linked").length).toBeGreaterThan(1);
  });

  it("opens a DECIDED proposal even though the queue defaults to pending", () => {
    // The regression this guards is silent and consequential: with the filter stuck
    // on "pending", an approved proposal is filtered out, the detail pane falls back
    // to the first row, and the reviewer acts on a proposal they did not open.
    render(
      <ProposalQueue
        proposals={[
          proposal({ id: "333", case_title: "A pending one" }),
          proposal({ id: "341", case_title: "Already approved", status: "approved" }),
        ]}
        focusId="341"
      />,
    );

    expect(screen.getAllByText("Already approved").length).toBeGreaterThan(1);
    expect(screen.queryAllByText("A pending one")).toHaveLength(0);
  });

  it("says so when the linked proposal is not in the list", () => {
    render(<ProposalQueue proposals={[proposal({ id: "333" })]} focusId="999" />);

    // getByText throws when absent, so this asserts presence on its own; the
    // truthiness check is here to keep the expectation explicit.
    expect(screen.getByText(/Proposal #999 was not found/)).toBeTruthy();
  });

  it("is unchanged with no focus id", () => {
    render(<ProposalQueue proposals={[proposal({ id: "333", case_title: "First in the queue" })]} />);

    expect(screen.queryByText(/was not found/)).toBeNull();
    expect(screen.getAllByText("First in the queue").length).toBeGreaterThan(1);
  });
});
