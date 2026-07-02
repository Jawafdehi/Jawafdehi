import { useState } from "react";
import { searchEntities, adminErrorMessage } from "@/services/admin-api";
import {
  RELATIONSHIP_TYPES,
  type EntityRelationshipRow,
} from "@/lib/jawafdehi-forms";
import { isValidEntityIri } from "@/lib/datalake-forms";
import { FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";

// Display the bilingual/plain name of an entity search hit.
function entityName(e: Record<string, unknown>): string {
  const n = e.name;
  if (typeof n === "string") return n;
  if (n && typeof n === "object") {
    const o = n as { en?: string; ne?: string };
    return o.en || o.ne || "";
  }
  return "";
}

interface Props {
  rows: EntityRelationshipRow[];
  onChange: (rows: EntityRelationshipRow[]) => void;
}

// F3 — entity-relationship editor. Rows of {nes_id, relationship_type, notes}.
// The parent diffs these into a replace op on /entities (§3). Includes an entity
// entity picker hitting GET /api/entities?query=.
export default function EntityRelationshipsEditor({ rows, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  const update = (i: number, patch: Partial<EntityRelationshipRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  const addRow = (nes_id = "") =>
    onChange([...rows, { nes_id, relationship_type: "ACCUSED", notes: "" }]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchErr(null);
    try {
      const hits = await searchEntities(query.trim(), 15);
      setResults(hits as Record<string, unknown>[]);
    } catch (err) {
      setSearchErr(adminErrorMessage(err, "Search failed"));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border bg-white p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Entity relationships</Label>
        <Button type="button" size="sm" variant="outline" onClick={() => addRow()}>
          <Plus className="mr-1 h-4 w-4" /> Add row
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        CORRUPTION cases require an ACCUSED entity; other types require a
        non-LOCATION entity (enforced by the API on publish).
      </p>

      {/* Entity picker */}
      <div className="rounded-md bg-slate-50 p-3">
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
            placeholder="Search entities to link…"
          />
          <Button type="button" variant="outline" onClick={runSearch} disabled={searching}>
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        <FieldError message={searchErr} className="mt-1" />
        {results.length > 0 && (
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
            {results.map((e) => {
              const id = String(e["@id"] ?? "");
              return (
                <li key={id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{entityName(e) || "(unnamed)"}</span>{" "}
                    <span className="font-mono text-xs text-muted-foreground">{id}</span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      addRow(id);
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
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entities linked yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => {
            const iriBad = r.nes_id.trim() !== "" && !isValidEntityIri(r.nes_id);
            return (
              <div key={i} className="grid gap-2 rounded border p-2 sm:grid-cols-[1fr_10rem_auto]">
                <div className="space-y-1">
                  <Input
                    value={r.nes_id}
                    onChange={(e) => update(i, { nes_id: e.target.value })}
                    className="font-mono text-xs"
                    placeholder="https://jawafdehi.org/entity/person/…"
                  />
                  <FieldError message={iriBad && "Not a canonical entity @id IRI."} />
                  <Input
                    value={r.notes}
                    onChange={(e) => update(i, { notes: e.target.value })}
                    placeholder="Notes (optional)"
                  />
                </div>
                <Select
                  value={r.relationship_type}
                  onValueChange={(v) =>
                    update(i, { relationship_type: v as EntityRelationshipRow["relationship_type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(i)}
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
