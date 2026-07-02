import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  createFirm,
  updateFirm,
  getFirm,
  type FirmWrite,
} from "@/services/admin-api";
import { useAdminForm } from "@/hooks/useAdminForm";
import FormPageShell from "@/components/admin/FormPageShell";
import AdminFormActions from "@/components/admin/AdminFormActions";
import DatePairInput from "@/components/admin/DatePairInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const str = (v: unknown): string => (v == null ? "" : String(v));
const LIST_PATH = "/admin/datalake/firms";

// F7 — create + edit a blocklisted firm. The record is keyed by its numeric
// `id` (the PK; firm names are not unique). Fields mirror BlacklistedFirmSerializer.
// Create POSTs; edit PATCHes.
export default function FirmForm() {
  const params = useParams();
  const editing = Boolean(params.id);
  const id = params.id ?? "";

  const [form, setForm] = useState<FirmWrite>({
    firm_name: "",
    proprietor_name: "",
    address: "",
    reason: "",
    recommending_office: "",
    blacklist_date_bs: "",
    blacklist_date_ad: "",
    effective_until_bs: "",
    effective_until_ad: "",
    duration: "",
    nes_id: "",
  });

  const set = <K extends keyof FirmWrite>(k: K, v: FirmWrite[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const { loading, saving, error, handleSubmit, navigate } =
    useAdminForm<Record<string, unknown>>({
      editing,
      load: () => getFirm<Record<string, unknown>>(id),
      hydrate: (f) =>
        setForm({
          firm_name: str(f.firm_name),
          proprietor_name: str(f.proprietor_name),
          address: str(f.address),
          reason: str(f.reason),
          recommending_office: str(f.recommending_office),
          blacklist_date_bs: str(f.blacklist_date_bs),
          blacklist_date_ad: str(f.blacklist_date_ad),
          effective_until_bs: str(f.effective_until_bs),
          effective_until_ad: str(f.effective_until_ad),
          duration: str(f.duration),
          nes_id: str(f.nes_id),
        }),
      listPath: LIST_PATH,
      resourceLabel: "firm",
      recordKey: id,
    });

  const canSave = !saving && str(form.firm_name).trim() !== "";

  const onSubmit = handleSubmit(canSave, async () => {
    // Blank optional fields → null so the backend clears rather than stores "".
    const payload: FirmWrite = {
      firm_name: str(form.firm_name).trim(),
      proprietor_name: form.proprietor_name || null,
      address: form.address || null,
      reason: form.reason || null,
      recommending_office: form.recommending_office || null,
      blacklist_date_bs: form.blacklist_date_bs || null,
      blacklist_date_ad: form.blacklist_date_ad || null,
      effective_until_bs: form.effective_until_bs || null,
      effective_until_ad: form.effective_until_ad || null,
      duration: form.duration || null,
      nes_id: form.nes_id || null,
    };
    if (editing) await updateFirm(id, payload);
    else await createFirm(payload);
  });

  return (
    <FormPageShell
      title={editing ? "Edit Firm" : "New Firm"}
      backLabel="Firms"
      onBack={() => navigate(LIST_PATH)}
      error={error}
      loading={loading}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="firm_name">Firm name</Label>
            <Input
              id="firm_name"
              value={str(form.firm_name)}
              onChange={(e) => set("firm_name", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="proprietor_name">Proprietor</Label>
            <Input
              id="proprietor_name"
              value={str(form.proprietor_name)}
              onChange={(e) => set("proprietor_name", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={str(form.address)}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            value={str(form.reason)}
            onChange={(e) => set("reason", e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="recommending_office">Recommending office</Label>
          <Input
            id="recommending_office"
            value={str(form.recommending_office)}
            onChange={(e) => set("recommending_office", e.target.value)}
          />
        </div>

        <DatePairInput
          label="Blocklisted date"
          idBase="bl"
          adValue={str(form.blacklist_date_ad)}
          bsValue={str(form.blacklist_date_bs)}
          onAdChange={(v) => set("blacklist_date_ad", v)}
          onBsChange={(v) => set("blacklist_date_bs", v)}
        />

        <DatePairInput
          label="Effective until"
          idBase="eu"
          adValue={str(form.effective_until_ad)}
          bsValue={str(form.effective_until_bs)}
          onAdChange={(v) => set("effective_until_ad", v)}
          onBsChange={(v) => set("effective_until_bs", v)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="duration">Duration</Label>
            <Input
              id="duration"
              value={str(form.duration)}
              onChange={(e) => set("duration", e.target.value)}
              placeholder="e.g. 1 year"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nes_id">Entity @id (optional)</Label>
            <Input
              id="nes_id"
              value={str(form.nes_id)}
              onChange={(e) => set("nes_id", e.target.value)}
              className="font-mono text-xs"
              placeholder="https://…/entity/…"
            />
          </div>
        </div>

        <AdminFormActions
          saving={saving}
          canSave={canSave}
          submitLabel={editing ? "Save changes" : "Create firm"}
          onCancel={() => navigate(LIST_PATH)}
        />
      </form>
    </FormPageShell>
  );
}
