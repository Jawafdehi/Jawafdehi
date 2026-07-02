import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createCourtCase,
  updateCourtCase,
  getCourtCase,
  deleteCourtCase,
  listCourts,
  type CourtCaseWrite,
} from "@/services/admin-api";
import { isValidEntityIri } from "@/lib/datalake-forms";
import { useAdminForm } from "@/hooks/useAdminForm";
import FormPageShell from "@/components/admin/FormPageShell";
import AdminFormActions from "@/components/admin/AdminFormActions";
import DatePairInput from "@/components/admin/DatePairInput";
import { FieldError } from "@/components/admin/FormError";
import DeleteButton from "@/components/admin/DeleteButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CourtOption {
  identifier: string;
  full_name_english?: string | null;
  full_name_nepali?: string;
}

const str = (v: unknown): string => (v == null ? "" : String(v));
const LIST_PATH = "/admin/datalake/courtcases";

// Create + edit a data-lake court case. The natural key is (court, case_number); in
// edit mode both come from the route and are locked (they're the PK).
export default function CourtCaseForm() {
  const params = useParams();
  const editing = Boolean(params.court && params.caseNumber);

  const [courts, setCourts] = useState<CourtOption[]>([]);

  const [form, setForm] = useState<CourtCaseWrite>({
    case_number: params.caseNumber ?? "",
    court_identifier: params.court ?? "",
    registration_date_bs: "",
    registration_date_ad: "",
    case_type: "",
    case_status: "",
    plaintiff: "",
    defendant: "",
    nes_id: "",
  });

  const set = <K extends keyof CourtCaseWrite>(k: K, v: CourtCaseWrite[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    listCourts<CourtOption>()
      .then((res) => setCourts(res.results ?? []))
      .catch(() => {});
  }, []);

  const { loading, saving, error, handleSubmit, navigate } =
    useAdminForm<Record<string, unknown>>({
      editing,
      load: () => getCourtCase<Record<string, unknown>>(params.court!, params.caseNumber!),
      hydrate: (c) =>
        setForm({
          case_number: str(c.case_number),
          court_identifier: str(c.court_identifier),
          registration_date_bs: str(c.registration_date_bs),
          registration_date_ad: str(c.registration_date_ad),
          case_type: str(c.case_type),
          case_status: str(c.case_status),
          plaintiff: str(c.plaintiff),
          defendant: str(c.defendant),
          nes_id: str(c.nes_id),
        }),
      listPath: LIST_PATH,
      resourceLabel: "case",
      recordKey: `${params.court ?? ""}/${params.caseNumber ?? ""}`,
    });

  const nesIdValid = !form.nes_id || isValidEntityIri(form.nes_id);
  const canSave =
    !saving &&
    form.case_number.trim() !== "" &&
    form.court_identifier.trim() !== "" &&
    nesIdValid;

  const onSubmit = handleSubmit(canSave, async () => {
    // Send empty optional strings as null so the backend stores NULL, not "".
    const payload: CourtCaseWrite = {
      ...form,
      registration_date_bs: form.registration_date_bs || null,
      registration_date_ad: form.registration_date_ad || null,
      case_type: form.case_type || null,
      case_status: form.case_status || null,
      plaintiff: form.plaintiff || null,
      defendant: form.defendant || null,
      nes_id: form.nes_id || null,
    };
    if (editing) await updateCourtCase(params.court!, params.caseNumber!, payload);
    else await createCourtCase(payload);
  });

  return (
    <FormPageShell
      title={editing ? "Edit Court Case" : "New Court Case"}
      backLabel="Court cases"
      onBack={() => navigate(LIST_PATH)}
      error={error}
      loading={loading}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Court</Label>
            <Select
              value={form.court_identifier}
              onValueChange={(v) => set("court_identifier", v)}
              disabled={editing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a court" />
              </SelectTrigger>
              <SelectContent>
                {courts.map((c) => (
                  <SelectItem key={c.identifier} value={c.identifier}>
                    {c.full_name_english || c.full_name_nepali || c.identifier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="case_number">Case number</Label>
            <Input
              id="case_number"
              value={form.case_number}
              onChange={(e) => set("case_number", e.target.value)}
              disabled={editing}
              placeholder="082-OA-0503"
            />
          </div>
        </div>

        <DatePairInput
          label="Registration date"
          idBase="reg"
          adValue={str(form.registration_date_ad)}
          bsValue={str(form.registration_date_bs)}
          onAdChange={(v) => set("registration_date_ad", v)}
          onBsChange={(v) => set("registration_date_bs", v)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="case_type">Case type</Label>
            <Input
              id="case_type"
              value={str(form.case_type)}
              onChange={(e) => set("case_type", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="case_status">Case status</Label>
            <Input
              id="case_status"
              value={str(form.case_status)}
              onChange={(e) => set("case_status", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="plaintiff">Plaintiff</Label>
          <Textarea
            id="plaintiff"
            value={str(form.plaintiff)}
            onChange={(e) => set("plaintiff", e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="defendant">Defendant</Label>
          <Textarea
            id="defendant"
            value={str(form.defendant)}
            onChange={(e) => set("defendant", e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="nes_id">Entity IRI (optional)</Label>
          <Input
            id="nes_id"
            value={str(form.nes_id)}
            onChange={(e) => set("nes_id", e.target.value)}
            className="font-mono text-xs"
            placeholder="https://jawafdehi.org/entity/person/ram-bahadur"
          />
          <FieldError
            message={
              !nesIdValid &&
              "Must be a canonical entity @id IRI (https://<base>/entity/<prefix>/<slug>)."
            }
          />
        </div>

        <AdminFormActions
          saving={saving}
          canSave={canSave}
          submitLabel={editing ? "Save changes" : "Create case"}
          onCancel={() => navigate(LIST_PATH)}
          deleteSlot={
            editing ? (
              <DeleteButton
                resourceLabel="court case"
                onDelete={() => deleteCourtCase(params.court!, params.caseNumber!)}
                onDeleted={() => navigate(LIST_PATH)}
              />
            ) : undefined
          }
        />
      </form>
    </FormPageShell>
  );
}
