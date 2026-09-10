import { useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";

import DatePairInput from "@/components/admin/DatePairInput";
import { FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  STAGE_NOTES_MAX,
  STAGE_TYPES,
  stageRowError,
  type CaseStageRow,
  type StageRowError,
} from "@/lib/jawafdehi-forms";
import { stageLabelKey } from "@/utils/case-stages";

interface Props {
  rows: CaseStageRow[];
  onChange: (rows: CaseStageRow[]) => void;
}

// Explicit, so every message is greppable from its key.
const STAGE_ERROR_KEYS: Record<StageRowError, string> = {
  unknownStage: "admin.caseForm.stageUnknownType",
  invalidDate: "admin.caseForm.stageDateInvalid",
  endBeforeStart: "admin.caseForm.stageEndBeforeStart",
  notesTooLong: "admin.caseForm.stageNotesTooLong",
};

const BLANK_ROW: CaseStageRow = {
  stage: "initial",
  start: "",
  end: "",
  courtcase_iri: "",
  body: "",
  label: "",
  notes: "",
};

// The stage editor. Replaces the single case start/end pair, which could not
// describe a case that runs several dockets across several courts.
//
// The stage type is a DROPDOWN over the closed vocabulary, never free text: a
// stage typed `first_instance` saves cleanly and then never renders on the
// public page, which is a silent data loss. (`tags` drifted to 144 distinct
// values across 82 cases under a free-text schema.) It is a native <select> so
// every option is in the document — the vocabulary is the control's whole
// point, and a portal-rendered listbox per row would hide it.
export default function CaseStagesEditor({ rows, onChange }: Props) {
  const { t } = useTranslation();
  const idBase = useId();

  // Stable per-row keys. Rows are plain data owned by the parent, so identity
  // lives here: ids move with their row through insert/remove, keeping each
  // row's uncontrolled date-picker state with the row it belongs to.
  const idsRef = useRef<number[]>([]);
  const nextIdRef = useRef(0);
  while (idsRef.current.length < rows.length) idsRef.current.push(nextIdRef.current++);
  if (idsRef.current.length > rows.length) idsRef.current.length = rows.length;

  const update = (index: number, patch: Partial<CaseStageRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const add = () => {
    idsRef.current.push(nextIdRef.current++);
    onChange([...rows, { ...BLANK_ROW }]);
  };

  const remove = (index: number) => {
    idsRef.current.splice(index, 1);
    onChange(rows.filter((_, i) => i !== index));
  };

  const addButton = (
    <Button type="button" variant="outline" size="sm" onClick={add}>
      <Plus className="mr-1 h-4 w-4" />
      {t("admin.caseForm.stageAdd")}
    </Button>
  );

  return (
    <div className="space-y-3 rounded-md border bg-white p-4">
      <Label className="text-sm font-semibold">{t("admin.caseForm.stagesHeading")}</Label>
      <p className="text-xs text-muted-foreground">{t("admin.caseForm.stagesHelp")}</p>

      {rows.length === 0 ? (
        <>
          <p className="text-sm text-muted-foreground">{t("admin.caseForm.stageNone")}</p>
          {addButton}
        </>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => {
            const rowId = `${idBase}-${idsRef.current[index]}`;
            const error = stageRowError(row);

            return (
              <div
                key={idsRef.current[index]}
                data-testid="case-stage-editor-row"
                className="space-y-2 rounded border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("admin.caseForm.stageRowLabel", { number: index + 1 })}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(index)}
                    title={t("admin.caseForm.stageRemove")}
                    aria-label={t("admin.caseForm.stageRemove")}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`${rowId}-stage`} className="text-xs">
                      {t("admin.caseForm.stageType")}
                    </Label>
                    <select
                      id={`${rowId}-stage`}
                      value={row.stage}
                      onChange={(event) =>
                        update(index, {
                          stage: event.target.value as CaseStageRow["stage"],
                        })
                      }
                      className="font-input flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {STAGE_TYPES.map((stage) => (
                        <option key={stage} value={stage}>
                          {t(stageLabelKey(stage))}
                        </option>
                      ))}
                    </select>
                  </div>

                  {row.stage === "other" ? (
                    <div className="space-y-1">
                      <Label htmlFor={`${rowId}-label`} className="text-xs">
                        {t("admin.caseForm.stageLabel")}
                      </Label>
                      <Input
                        id={`${rowId}-label`}
                        value={row.label}
                        onChange={(event) => update(index, { label: event.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("admin.caseForm.stageLabelHelp")}
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* BS is derived from AD for display and never stored (the
                    backend has no BS columns). */}
                <DatePairInput
                  label={t("admin.caseForm.stageStart")}
                  idBase={`${rowId}-start`}
                  deriveBs
                  adValue={row.start}
                  onAdChange={(ad) => update(index, { start: ad })}
                />
                <DatePairInput
                  label={t("admin.caseForm.stageEnd")}
                  idBase={`${rowId}-end`}
                  deriveBs
                  adValue={row.end}
                  onAdChange={(ad) => update(index, { end: ad })}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`${rowId}-courtcase`} className="text-xs">
                      {t("admin.caseForm.stageCourtCase")}
                    </Label>
                    <Input
                      id={`${rowId}-courtcase`}
                      value={row.courtcase_iri}
                      onChange={(event) =>
                        update(index, { courtcase_iri: event.target.value })
                      }
                      className="text-xs"
                      placeholder="https://jawafdehi.org/courtcase/special/081-cr-0136"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${rowId}-body`} className="text-xs">
                      {t("admin.caseForm.stageBody")}
                    </Label>
                    <Input
                      id={`${rowId}-body`}
                      value={row.body}
                      onChange={(event) => update(index, { body: event.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`${rowId}-notes`} className="text-xs">
                    {t("admin.caseForm.stageNotes")}
                  </Label>
                  <Textarea
                    id={`${rowId}-notes`}
                    value={row.notes}
                    onChange={(event) => update(index, { notes: event.target.value })}
                    maxLength={STAGE_NOTES_MAX}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("admin.caseForm.stageNotesHelp")}
                  </p>
                </div>

                {/* Inline, on the row that is wrong — a form-level message
                    cannot say WHICH of twelve stages to fix. */}
                <FieldError message={error ? t(STAGE_ERROR_KEYS[error]) : null} />
              </div>
            );
          })}
          {addButton}
        </div>
      )}
    </div>
  );
}
