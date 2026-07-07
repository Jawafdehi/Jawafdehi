import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  listEntities,
  adminErrorMessage,
  type EntityRecord,
} from "@/services/admin-api";
import { FormError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Search } from "lucide-react";

const PAGE_SIZE = 50;

// Bilingual name -> display string. Entity names are either a plain string or a
// language map {ne, en}; prefer English, fall back to Nepali.
function displayName(name: EntityRecord["name"]): string {
  if (!name) return "—";
  if (typeof name === "string") return name;
  return name.en || name.ne || "—";
}

function typeLabel(t: EntityRecord["@type"]): string {
  if (!t) return "—";
  return Array.isArray(t) ? t.join(", ") : t;
}

// The IRI tail used for routing/detail: strip the canonical IRI prefix to the
// `<prefix>/<slug>` ref the detail endpoint accepts.
function entityRef(id: string): string {
  const m = id.match(/\/entity\/(.+)$/);
  return m ? m[1] : id;
}

export default function EntitiesList() {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string, off: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listEntities({
        query: q || undefined,
        limit: PAGE_SIZE,
        offset: off,
      });
      setEntities(res.entities ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(adminErrorMessage(err, "Failed to load entities"));
      setEntities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(submittedQuery, offset);
  }, [load, submittedQuery, offset]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setSubmittedQuery(query.trim());
  };

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entities</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} entities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(submittedQuery, offset)}
            disabled={loading}
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild size="sm">
            <Link to="/admin/entities/new">
              <Plus className="mr-1 h-4 w-4" /> New entity
            </Link>
          </Button>
        </div>
      </div>

      <form onSubmit={onSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entities (name, keyword)…"
          className="max-w-md"
        />
        <Button type="submit" variant="secondary" disabled={loading}>
          <Search className="mr-1 h-4 w-4" /> Search
        </Button>
      </form>

      <FormError message={error} />

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>@id</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && entities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : entities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                  No entities found.
                </TableCell>
              </TableRow>
            ) : (
              entities.map((ent) => {
                const ref = entityRef(ent["@id"]);
                return (
                  <TableRow
                    key={ent["@id"]}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/entities/edit/${ref}`)}
                  >
                    <TableCell className="font-medium">
                      {displayName(ent.name)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{typeLabel(ent["@type"])}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {ref}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {from}–{to} of {total.toLocaleString()}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={to >= total || loading}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
