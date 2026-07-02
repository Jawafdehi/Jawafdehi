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

const PAGE_SIZE = 25;

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
      fetchPage={(page) =>
        listCourts<Row>({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      }
    />
  );
}
