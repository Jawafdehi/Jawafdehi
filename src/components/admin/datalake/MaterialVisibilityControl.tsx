import { useState } from "react";
import {
  patchMaterialVisibilityPolicy,
  adminErrorMessage,
} from "@/services/admin-api";
import { MATERIAL_VISIBILITY_POLICIES } from "@/lib/datalake-forms";
import { FieldError } from "@/components/admin/FormError";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Badge tone for the derived `visibility` so a caseworker sees at a glance
// whether the document is actually public right now: LISTED (public) reads
// prominent; the withheld states read muted.
const VISIBILITY_TONE: Record<string, "default" | "secondary" | "outline"> = {
  LISTED: "default",
  UNLISTED: "secondary",
  PRIVATE: "outline",
};

interface Props {
  // Full material @id IRI — the PATCH addresses the material by ?iri=.
  iri: string;
  // Current caseworker policy + the resulting derived visibility, read from the
  // authed GET's jawafdehi:visibilityPolicy / jawafdehi:visibility annotations.
  policy: string;
  visibility: string;
}

// Caseworker control for a material's visibility policy. Deliberately SEPARATE
// from the document-field form (whose Save PUTs the doc): the policy is a control
// key the API strips from stored JSON-LD, so it is set out-of-band via a dedicated
// PATCH that also recomputes the cached `visibility`. It therefore applies
// immediately on change — mirroring CaseStateControl — not on the form's Save.
export default function MaterialVisibilityControl({
  iri,
  policy: initialPolicy,
  visibility: initialVisibility,
}: Props) {
  const [policy, setPolicy] = useState(initialPolicy);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = async (next: string) => {
    if (next === policy || saving) return;
    const prev = policy;
    // Optimistic — the Select reflects the choice immediately; revert on failure.
    setPolicy(next);
    setSaving(true);
    setError(null);
    try {
      const updated = await patchMaterialVisibilityPolicy<Record<string, unknown>>(
        iri,
        next,
      );
      // Trust the server's echo (jawafdehi:visibility[Policy]) for both the
      // applied policy and the freshly-recomputed derived visibility.
      const appliedPolicy =
        typeof updated["jawafdehi:visibilityPolicy"] === "string"
          ? (updated["jawafdehi:visibilityPolicy"] as string)
          : next;
      const appliedVisibility =
        typeof updated["jawafdehi:visibility"] === "string"
          ? (updated["jawafdehi:visibility"] as string)
          : visibility;
      setPolicy(appliedPolicy);
      setVisibility(appliedVisibility);
      toast({
        title: "Visibility updated",
        description: `${appliedPolicy} → now ${appliedVisibility}`,
      });
    } catch (err) {
      setPolicy(prev);
      setError(adminErrorMessage(err, "Failed to update visibility"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border bg-white p-4">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-semibold">Visibility</Label>
        <Badge variant={VISIBILITY_TONE[visibility] ?? "outline"}>
          {visibility || "—"}
        </Badge>
        {saving && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Who can see this document, independent of the cases that cite it. Applies
        immediately — it is not part of Save.
      </p>
      <Select value={policy || undefined} onValueChange={onChange} disabled={saving}>
        <SelectTrigger className="max-w-md" aria-label="Visibility policy">
          <SelectValue placeholder="Pick a visibility policy" />
        </SelectTrigger>
        <SelectContent>
          {MATERIAL_VISIBILITY_POLICIES.map((p) => (
            <SelectItem key={p.token} value={p.token}>
              {p.label}
            </SelectItem>
          ))}
          {/* A stored value outside the known vocabulary stays selectable so
              opening the form doesn't force a change. */}
          {policy &&
            !MATERIAL_VISIBILITY_POLICIES.some((p) => p.token === policy) && (
              <SelectItem value={policy}>{policy}</SelectItem>
            )}
        </SelectContent>
      </Select>
      <FieldError message={error} />
    </div>
  );
}
