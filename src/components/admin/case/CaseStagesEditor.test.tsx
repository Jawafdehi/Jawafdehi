import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import type { CaseStageRow } from "@/lib/jawafdehi-forms";

// Passthrough translations: t() returns the key, so assertions read as the
// contract with the locale files rather than as English copy.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && "number" in opts ? `${key}:${String(opts.number)}` : key,
  }),
}));

// The real pair mounts two calendar pickers (one of them the Nepali
// datepicker); the editor under test only cares about the AD strings.
vi.mock("@/components/admin/DatePairInput", () => ({
  default: ({
    label,
    adValue,
    onAdChange,
  }: {
    label: string;
    adValue: string;
    onAdChange: (value: string) => void;
  }) => (
    <input
      aria-label={label}
      value={adValue}
      onChange={(event) => onAdChange(event.target.value)}
    />
  ),
}));

import CaseStagesEditor from "@/components/admin/case/CaseStagesEditor";

const row = (over: Partial<CaseStageRow> = {}): CaseStageRow => ({
  stage: "initial",
  start: "",
  end: "",
  courtcase_iri: "",
  body: "",
  label: "",
  notes: "",
  ...over,
});

const renderEditor = (rows: CaseStageRow[]) => {
  const onChange = vi.fn();
  const utils = render(<CaseStagesEditor rows={rows} onChange={onChange} />);
  return { ...utils, onChange };
};

const rowsOf = () => screen.queryAllByTestId("case-stage-editor-row");

describe("CaseStagesEditor — a repeatable stage list", () => {
  it("renders one editable row per stage", () => {
    renderEditor([row({ stage: "investigation" }), row({ stage: "appeal" })]);

    expect(rowsOf()).toHaveLength(2);
  });

  it("offers an empty state and an add control when there are no stages", () => {
    const { onChange } = renderEditor([]);

    expect(screen.getByText("admin.caseForm.stageNone")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "admin.caseForm.stageAdd" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(1);
  });

  it("appends a stage without disturbing the ones already there", () => {
    const { onChange } = renderEditor([row({ stage: "initial", start: "2021-10-02" })]);

    fireEvent.click(screen.getByRole("button", { name: "admin.caseForm.stageAdd" }));

    const next = onChange.mock.calls[0][0] as CaseStageRow[];
    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({ stage: "initial", start: "2021-10-02" });
  });

  it("removes the row the caseworker asked to remove", () => {
    const { onChange } = renderEditor([
      row({ stage: "investigation" }),
      row({ stage: "appeal" }),
    ]);

    fireEvent.click(
      within(rowsOf()[0]).getByRole("button", { name: "admin.caseForm.stageRemove" }),
    );

    expect(onChange.mock.calls[0][0]).toEqual([expect.objectContaining({ stage: "appeal" })]);
  });
});

describe("CaseStagesEditor — the stage type is a closed vocabulary", () => {
  // `tags` drifted to 144 distinct values across 82 cases under a free-text
  // schema. Here the same failure is silent: a stage typed `first_instance`
  // never renders on the public page at all.
  it("is a dropdown, never a free-text field", () => {
    renderEditor([row()]);

    const control = screen.getByLabelText("admin.caseForm.stageType");
    expect(control.tagName).toBe("SELECT");
    expect(screen.queryByRole("textbox", { name: "admin.caseForm.stageType" })).toBeNull();
  });

  it("offers exactly the five vocabulary values, under their own labels", () => {
    renderEditor([row()]);

    const control = screen.getByLabelText("admin.caseForm.stageType") as HTMLSelectElement;
    expect([...control.options].map((option) => option.value)).toEqual([
      "investigation",
      "initial",
      "appeal",
      "review",
      "other",
    ]);
    expect([...control.options].map((option) => option.textContent)).toEqual([
      "caseDetail.stages.investigation",
      "caseDetail.stages.initial",
      "caseDetail.stages.appeal",
      "caseDetail.stages.review",
      "caseDetail.stages.other",
    ]);
  });

  it("writes the picked value straight through", () => {
    const { onChange } = renderEditor([row({ stage: "initial" })]);

    fireEvent.change(screen.getByLabelText("admin.caseForm.stageType"), {
      target: { value: "review" },
    });

    expect(onChange.mock.calls[0][0][0]).toMatchObject({ stage: "review" });
  });

  it("asks for a label only on an `other` stage", () => {
    renderEditor([row({ stage: "appeal" })]);
    expect(screen.queryByLabelText("admin.caseForm.stageLabel")).toBeNull();

    renderEditor([row({ stage: "other" })]);
    expect(screen.getAllByLabelText("admin.caseForm.stageLabel").length).toBeGreaterThan(0);
  });
});

describe("CaseStagesEditor — per-record date validation", () => {
  it("shows the error inline on the offending row when the end precedes the start", () => {
    renderEditor([
      row({ stage: "initial", start: "2023-06-09", end: "2023-01-01" }),
      row({ stage: "appeal", start: "2023-07-11" }),
    ]);

    expect(
      within(rowsOf()[0]).getByText("admin.caseForm.stageEndBeforeStart"),
    ).toBeTruthy();
    expect(
      within(rowsOf()[1]).queryByText("admin.caseForm.stageEndBeforeStart"),
    ).toBeNull();
  });

  it("accepts a stage that opens and closes on the same day", () => {
    renderEditor([row({ start: "2023-01-01", end: "2023-01-01" })]);

    expect(screen.queryByText("admin.caseForm.stageEndBeforeStart")).toBeNull();
  });

  it("imposes no ordering BETWEEN stages", () => {
    // After a remand a new first instance legitimately starts after an appeal
    // ended — flagging that would block a true record.
    renderEditor([
      row({ stage: "appeal", start: "2022-01-01", end: "2022-06-01" }),
      row({ stage: "initial", start: "2023-01-01" }),
    ]);

    expect(screen.queryByText("admin.caseForm.stageEndBeforeStart")).toBeNull();
  });
});

describe("CaseStagesEditor — the public note", () => {
  it("says the note is public and caps it at 500 characters", () => {
    renderEditor([row()]);

    const notes = screen.getByLabelText("admin.caseForm.stageNotes");
    expect(notes.getAttribute("maxlength")).toBe("500");
    expect(screen.getByText("admin.caseForm.stageNotesHelp")).toBeTruthy();
  });

  it("keeps what the caseworker typed", () => {
    const { onChange } = renderEditor([row()]);

    fireEvent.change(screen.getByLabelText("admin.caseForm.stageNotes"), {
      target: { value: "मिसिल जलेको" },
    });

    expect(onChange.mock.calls[0][0][0]).toMatchObject({ notes: "मिसिल जलेको" });
  });
});
