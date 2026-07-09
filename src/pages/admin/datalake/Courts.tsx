import { useNavigate } from "react-router-dom";
import ResourceTable, { type Column } from "@/components/admin/ResourceTable";
import { listCourts } from "@/services/admin-api";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Row = Record<string, unknown>;
const str = (v: unknown): string => (v == null ? "—" : String(v));

const columns: Column<Row>[] = [
  {
    header: "Identifier",
    cell: (r) => <span className="font-mono text-xs">{str(r.identifier)}</span>,
  },
  {
    header: "Name (EN)",
    cell: (r) => <span className="font-medium">{str(r.full_name_english)}</span>,
  },
  { header: "Name (NE)", cell: (r) => str(r.full_name_nepali) },
  { header: "Type", cell: (r) => str(r.court_type) },
];

// /api/courts/ is unpaginated (bare array, ~97 rows) — listCourts normalizes it
// to a single page with next=null, so every row arrives at once. Size the window
// larger than the whole set so the "N–M of total" footer reads accurately (and
// the Next button stays disabled) rather than claiming a page split that the
// single-shot response never produces.
const PAGE_SIZE = 500;

export default function Courts() {
  const navigate = useNavigate();
  return (
    <ResourceTable<Row>
      title="Courts"
      description="Courts. Create and edit court records."
      columns={columns}
      pageSize={PAGE_SIZE}
      rowKey={(r) => str(r.identifier)}
      onRowClick={(r) => {
        const id = str(r.identifier);
        if (id && id !== "—") navigate(`/admin/datalake/courts/${encodeURIComponent(id)}/edit`);
      }}
      headerAction={
        <Button size="sm" onClick={() => navigate("/admin/datalake/courts/new")}>
          <Plus className="mr-1 h-4 w-4" /> New Court
        </Button>
      }
      // Unpaginated endpoint: fetch the whole (normalized) set once; the page
      // arg is unused because the backend returns every court in one array.
      fetchPage={() => listCourts<Row>()}
    />
  );
}
