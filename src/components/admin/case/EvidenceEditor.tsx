import { useState } from "react";
import { listMaterials, adminErrorMessage } from "@/services/admin-api";
import { type EvidenceRow } from "@/lib/jawafdehi-forms";
import { isValidMaterialIri } from "@/lib/datalake-forms";
import { FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";

interface Props {
  rows: EvidenceRow[];
  onChange: (rows: EvidenceRow[]) => void;
}

function materialIri(m: Record<string, unknown>): string {
  return String(m["@id"] ?? m.iri ?? m.id ?? "");
}

// A stored material's `name`/`title` comes from JSON-LD as a language map
// ({en, ne}); String()-ing that object yields "[object Object]" (BB-19). Unwrap
// it to a readable string — prefer English, then Nepali, then any string value.
function pickLangString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const map = v as Record<string, unknown>;
    // Check each candidate for a string value; a non-string `en` (e.g. a number
    // or nested object) must not short-circuit past `ne`/other languages.
    for (const candidate of [map.en, map.ne, ...Object.values(map)]) {
      if (typeof candidate === "string") return candidate;
    }
  }
  return "";
}

function materialTitle(m: Record<string, unknown>): string {
  return pickLangString(m.name) || pickLangString(m.title) || materialIri(m);
}

// F5 — evidence linker. Case evidence is a reference to a data-lake material (the
// CaseMaterialReference join; ADR "cases own no documents"), NOT a document
// source. Each row is { material_iri, additional_details }; the parent diffs
// into a replace op on /evidence (§3). Includes a materials search
// (GET /api/materials/) and a manual "add by material IRI" input.
export default function EvidenceEditor({ rows, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [manualIri, setManualIri] = useState("");

  const update = (i: number, patch: Partial<EvidenceRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  const addRow = (iri: string, title?: string) => {
    const value = iri.trim();
    if (!isValidMaterialIri(value)) return;
    if (rows.some((r) => r.material_iri === value)) return; // no dupes
    onChange([...rows, { material_iri: value, additional_details: "", title }]);
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchErr(null);
    try {
      const page = await listMaterials<Record<string, unknown>>({
        search: query.trim(),
        limit: 15,
      });
      setResults(page.results ?? []);
    } catch (err) {
      setSearchErr(adminErrorMessage(err, "Search failed"));
    } finally {
      setSearching(false);
    }
  };

  const manualValid = isValidMaterialIri(manualIri.trim());

  return (
    <div className="space-y-3 rounded-md border bg-white p-4">
      <Label className="text-sm font-semibold">Evidence (materials)</Label>
      <p className="text-xs text-muted-foreground">
        Link materials by their canonical <code>@id</code> IRI. Add an
        optional case-specific note per link.
      </p>

      <div className="rounded-md bg-slate-50 p-3 space-y-2">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            placeholder="Search materials…"
          />
          <Button
            type="button"
            variant="outline"
            onClick={runSearch}
            disabled={searching}
            aria-label="Search materials"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        <FieldError message={searchErr} />
        {results.length > 0 && (
          <ul className="max-h-40 space-y-1 overflow-auto">
            {results.map((m) => {
              const iri = materialIri(m);
              return (
                <li key={iri} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {materialTitle(m)}
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {iri}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={!isValidMaterialIri(iri)}
                    aria-label={`Link ${materialTitle(m) || iri}`}
                    onClick={() => {
                      addRow(iri, materialTitle(m));
                      setResults([]);
                      setQuery("");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex items-center gap-2">
          <Input
            value={manualIri}
            onChange={(e) => setManualIri(e.target.value)}
            className="font-mono text-xs"
            placeholder="…or add by material IRI (https://…/material/<source>/<ident>)"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              addRow(manualIri);
              setManualIri("");
            }}
            disabled={!manualValid}
          >
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
        <FieldError
          message={
            manualIri.trim() !== "" &&
            !manualValid &&
            "Not a canonical material IRI (expected https://…/material/<source>/<ident>)."
          }
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No evidence linked yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div
              key={r.material_iri}
              className="grid items-center gap-2 rounded border p-2 sm:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0 space-y-1">
                {r.title ? (
                  <>
                    <span className="block truncate text-sm font-medium">{r.title}</span>
                    <span className="font-code block truncate">
                      {r.material_iri}
                    </span>
                  </>
                ) : (
                  <span className="block truncate font-mono text-xs">{r.material_iri}</span>
                )}
                <Input
                  value={r.additional_details}
                  onChange={(e) => update(i, { additional_details: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="Optional note (why this material matters)…"
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => remove(i)}
                title="Unlink"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
