import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { CaseStageDates } from "@/components/case-detail/case-stage-dates";
import type { CaseStage } from "@/types/jds";

// Passthrough translations so assertions don't depend on i18n resources
// (mirrors case-overview-section.test.tsx). t() returns its fallback or the key.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) =>
      typeof fallback === "string" ? fallback : key,
    i18n: { language: "en" },
  }),
}));

const renderStages = (stages: CaseStage[], language = "en") =>
  render(<CaseStageDates stages={stages} language={language} />);

const rows = () => screen.queryAllByTestId("case-stage-row");

describe("CaseStageDates — one labelled row per stage", () => {
  it("renders a row per stage, each under its own label, in the served order", () => {
    // The single 'मुद्दा मिति / Case date' range it replaces could not describe
    // this: three passes through three forums, one of them still running.
    renderStages([
      { stage: "investigation", start: "2021-03-01", end: "2021-09-14" },
      { stage: "initial", start: "2021-10-02", end: "2023-06-09" },
      { stage: "appeal", start: "2023-07-11" },
    ]);

    expect(rows()).toHaveLength(3);
    expect(rows().map((row) => row.getAttribute("data-stage"))).toEqual([
      "investigation",
      "initial",
      "appeal",
    ]);
    expect(rows()[0].textContent).toContain("caseDetail.stages.investigation");
    expect(rows()[1].textContent).toContain("caseDetail.stages.initial");
    expect(rows()[2].textContent).toContain("caseDetail.stages.appeal");
  });

  it("shows the real registration and verdict dates of each stage", () => {
    renderStages([{ stage: "initial", start: "2021-10-02", end: "2023-06-09" }]);

    expect(rows()[0].textContent).toContain("Oct 2, 2021");
    expect(rows()[0].textContent).toContain("Jun 9, 2023");
  });

  it("labels an `other` stage with its own label, never the generic word", () => {
    renderStages([{ stage: "other", label: "Arbitration tribunal", start: "2022-01-05" }]);

    expect(rows()[0].textContent).toContain("Arbitration tribunal");
    expect(rows()[0].textContent).not.toContain("caseDetail.stages.other");
  });

  it("falls back to the generic label when an `other` stage carries none", () => {
    renderStages([{ stage: "other", start: "2022-01-05" }]);

    expect(rows()[0].textContent).toContain("caseDetail.stages.other");
  });

  it("renders a stage with no end as pending, not as a closed range", () => {
    renderStages([{ stage: "appeal", start: "2023-07-11" }]);

    expect(rows()[0].textContent).toContain("caseDetail.stagePending");
    expect(rows()[0].textContent).toContain("Jul 11, 2023");
  });

  it("renders a stage with no dates at all as pending rather than N/A", () => {
    renderStages([{ stage: "appeal" }]);

    expect(rows()[0].textContent).toContain("caseDetail.stagePending");
    expect(rows()[0].textContent).not.toContain("N/A");
  });

  it("shows the note on a pending stage, so the reader learns WHY there is no decision", () => {
    // The whole point of the field: without it a reader assumes a pending
    // stage is merely slow, when the file itself may have burned.
    renderStages([
      { stage: "initial", start: "2019-04-02", notes: "मिसिल जलेको" },
    ]);

    expect(screen.getByTestId("case-stage-note").textContent).toContain("मिसिल जलेको");
  });

  it("renders no note element when the stage carries none", () => {
    renderStages([{ stage: "initial", start: "2019-04-02", end: "2020-01-01" }]);

    expect(screen.queryByTestId("case-stage-note")).toBeNull();
  });

  it("names the forum on each row, so two appeals are not two identical labels", () => {
    renderStages([
      {
        stage: "appeal",
        start: "2023-07-11",
        courtcase_iri: "https://jawafdehi.org/courtcase/supreme/080-ne-0044",
      },
      {
        stage: "appeal",
        start: "2023-08-02",
        courtcase_iri: "https://jawafdehi.org/courtcase/butwalhc/080-ne-0051",
      },
    ]);

    expect(rows()[0].textContent).toContain("Supreme Court");
    expect(rows()[1].textContent).toContain("Butwal High Court");
  });

  it("names a non-court forum from `body`", () => {
    renderStages([{ stage: "investigation", body: "CIAA", start: "2021-03-01" }]);

    expect(rows()[0].textContent).toContain("CIAA");
  });

  it("renders nothing at all for a case with no stages", () => {
    const { container } = renderStages([]);

    expect(container.textContent).toBe("");
  });
});
