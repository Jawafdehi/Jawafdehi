import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  createCourt,
  updateCourt,
  getCourt,
  type CourtWrite,
} from "@/services/admin-api";
import { useAdminForm } from "@/hooks/useAdminForm";
import FormPageShell from "@/components/admin/FormPageShell";
import AdminFormActions from "@/components/admin/AdminFormActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const str = (v: unknown): string => (v == null ? "" : String(v));
const LIST_PATH = "/admin/datalake/courts";

// F7 — create + edit a data-lake court. `identifier` is the natural key and is locked
// in edit mode. Create POSTs; edit PUTs (replace).
export default function CourtForm() {
  const params = useParams();
  const editing = Boolean(params.identifier);
  const identifier = params.identifier ?? "";

  const [form, setForm] = useState<CourtWrite>({
    identifier,
    full_name_english: "",
    full_name_nepali: "",
    court_type: "",
  });

  const set = <K extends keyof CourtWrite>(k: K, v: CourtWrite[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const { loading, saving, error, handleSubmit, navigate } =
    useAdminForm<Record<string, unknown>>({
      editing,
      load: () => getCourt<Record<string, unknown>>(identifier),
      hydrate: (c) =>
        setForm({
          identifier: str(c.identifier),
          full_name_english: str(c.full_name_english),
          full_name_nepali: str(c.full_name_nepali),
          court_type: str(c.court_type),
        }),
      listPath: LIST_PATH,
      resourceLabel: "court",
      recordKey: identifier,
    });

  const canSave = !saving && str(form.identifier).trim() !== "";

  const onSubmit = handleSubmit(canSave, async () => {
    const payload: CourtWrite = {
      ...form,
      // identifier is the natural key and immutable after create — trim so a
      // stray leading/trailing space isn't baked into the record permanently.
      identifier: str(form.identifier).trim(),
      full_name_english: form.full_name_english || null,
      full_name_nepali: form.full_name_nepali || null,
      court_type: form.court_type || null,
    };
    if (editing) await updateCourt(identifier, payload);
    else await createCourt(payload);
  });

  return (
    <FormPageShell
      title={editing ? "Edit Court" : "New Court"}
      backLabel="Courts"
      onBack={() => navigate(LIST_PATH)}
      error={error}
      loading={loading}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1">
          <Label htmlFor="identifier">Identifier</Label>
          <Input
            id="identifier"
            value={str(form.identifier)}
            onChange={(e) => set("identifier", e.target.value)}
            disabled={editing}
            className="font-mono text-xs"
            placeholder="special / district-kathmandu"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="en">Full name (English)</Label>
            <Input
              id="en"
              value={str(form.full_name_english)}
              onChange={(e) => set("full_name_english", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ne">Full name (Nepali)</Label>
            <Input
              id="ne"
              value={str(form.full_name_nepali)}
              onChange={(e) => set("full_name_nepali", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="court_type">Court type</Label>
          <Input
            id="court_type"
            value={str(form.court_type)}
            onChange={(e) => set("court_type", e.target.value)}
            placeholder="supreme / high / district / special"
          />
        </div>

        <AdminFormActions
          saving={saving}
          canSave={canSave}
          submitLabel={editing ? "Save changes" : "Create court"}
          onCancel={() => navigate(LIST_PATH)}
        />
      </form>
    </FormPageShell>
  );
}
