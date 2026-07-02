import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ResourceTable, { type Column } from "@/components/admin/ResourceTable";
import {
  listMaterials,
  getMaterialByIri,
  adminErrorMessage,
} from "@/services/admin-api";
import { parseMaterialIri } from "@/lib/datalake-forms";
import { FormError } from "@/components/admin/FormError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Pencil, Plus, Search } from "lucide-react";

type Row = Record<string, unknown>;

const PAGE_SIZE = 25;

// A material name is a bilingual language map {en, ne} or a plain string.
function displayName(name: unknown): string {
  if (!name) return "—";
  if (typeof name === "string") return name;
  if (typeof name === "object") {
    const m = name as { en?: string; ne?: string };
    return m.en || m.ne || "—";
  }
  return "—";
}

function typeLabel(t: unknown): string {
  if (!t) return "—";
  return Array.isArray(t) ? t.join(", ") : String(t);
}

// Route tail (source/ident) for the edit page, parsed from the material @id.
function editTail(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const parts = parseMaterialIri(id);
  return parts ? `${parts.source}/${parts.ident}` : null;
}

const columns: Column<Row>[] = [
  {
    header: "Name",
    cell: (r) => <span className="font-medium">{displayName(r.name)}</span>,
  },
  {
    header: "Type",
    cell: (r) => (
      <Badge variant="secondary">
        {typeLabel(r.additionalType ?? r["@type"])}
      </Badge>
    ),
  },
  {
    header: "@id",
    cell: (r) => (
      <span className="font-mono text-xs text-muted-foreground">
        {typeof r["@id"] === "string" ? (r["@id"] as string) : "—"}
      </span>
    ),
  },
];

// Materials browse page. The backend now exposes a paginated list
// (GET /api/materials -> {results, next}), so this is a proper ResourceTable
// with an IRI look-up kept alongside for jumping straight to one material.
export default function Materials() {
  const navigate = useNavigate();
  const [iri, setIri] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Look up a single material by IRI and jump to its edit page.
  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iri.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      const doc = await getMaterialByIri<Record<string, unknown>>(iri.trim());
      const tail = editTail(doc["@id"]);
      if (tail) navigate(`/admin/datalake/materials/edit/${tail}`);
      else setLookupError("Resolved material has no usable @id.");
    } catch (err) {
      setLookupError(adminErrorMessage(err, "Material not found"));
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={lookup} className="flex gap-2">
        <Input
          value={iri}
          onChange={(e) => setIri(e.target.value)}
          placeholder="Jump to a material by @id IRI…"
          className="max-w-xl font-mono text-xs"
        />
        <Button type="submit" variant="secondary" disabled={lookupLoading}>
          {lookupLoading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-1 h-4 w-4" />
          )}
          Look up
        </Button>
      </form>
      <FormError message={lookupError} />

      <ResourceTable<Row>
        title="Materials"
        description="Governance documents (JSON-LD keyed by @id). Mostly bulk-ingested; you can create, edit, and delete by hand."
        columns={columns}
        pageSize={PAGE_SIZE}
        rowKey={(r) =>
          typeof r["@id"] === "string"
            ? (r["@id"] as string)
            : JSON.stringify(r)
        }
        headerAction={
          <Button asChild size="sm">
            <Link to="/admin/datalake/materials/new">
              <Plus className="mr-1 h-4 w-4" /> New material
            </Link>
          </Button>
        }
        onRowClick={(r) => {
          const tail = editTail(r["@id"]);
          if (tail) navigate(`/admin/datalake/materials/edit/${tail}`);
        }}
        fetchPage={(page) =>
          listMaterials<Row>({
            limit: PAGE_SIZE,
            offset: (page - 1) * PAGE_SIZE,
          })
        }
      />

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Pencil className="h-3 w-3" /> Click a row to edit.
      </p>
    </div>
  );
}
