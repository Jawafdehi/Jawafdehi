import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ResourceTable, { type Column } from "@/components/admin/ResourceTable";
import { listCases } from "@/services/admin-api";
import { CASE_STATES } from "@/lib/jawafdehi-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

type Row = Record<string, unknown>;

const str = (v: unknown): string => (v == null ? "—" : String(v));

const columns: Column<Row>[] = [
  { header: "Title", cell: (r) => <span className="font-medium">{str(r.title)}</span> },
  { header: "Slug", cell: (r) => <span className="font-mono text-xs">{str(r.slug)}</span> },
  { header: "Type", cell: (r) => str(r.case_type) },
  {
    header: "State",
    cell: (r) => <Badge variant="secondary">{str(r.state ?? r.status)}</Badge>,
  },
  { header: "Updated", cell: (r) => str(r.updated_at ?? r.modified) },
];

const PAGE_SIZE = 25;
const ALL = "__all__";

export default function AdminCases() {
  const navigate = useNavigate();
  // F10 — state filter. "__all__" sends no ?state= param.
  const [state, setState] = useState<string>(ALL);

  return (
    <ResourceTable<Row>
      // Re-mount the table (resetting pagination) whenever the filter changes,
      // so the new fetchPage closure runs from page 1.
      key={state}
      title="Jawafdehi Cases"
      description="Accountability / corruption cases. Full create / edit / delete."
      columns={columns}
      pageSize={PAGE_SIZE}
      rowKey={(r) => str(r.slug ?? r.id)}
      onRowClick={(r) => {
        const slug = r.slug;
        if (typeof slug === "string" && slug)
          navigate(`/admin/jawafdehi/cases/${encodeURIComponent(slug)}/edit`);
      }}
      headerAction={
        <div className="flex items-center gap-2">
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="h-9 w-[9rem]">
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All states</SelectItem>
              {CASE_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => navigate("/admin/jawafdehi/cases/new")}>
            <Plus className="mr-1 h-4 w-4" /> New case
          </Button>
        </div>
      }
      fetchPage={(page) =>
        listCases<Row>({
          page,
          page_size: PAGE_SIZE,
          ...(state !== ALL ? { state } : {}),
        })
      }
    />
  );
}
