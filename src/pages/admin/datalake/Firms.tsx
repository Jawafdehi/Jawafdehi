import { useNavigate } from "react-router-dom";
import ResourceTable, { type Column } from "@/components/admin/ResourceTable";
import { listBlacklistedFirms } from "@/services/admin-api";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Row = Record<string, unknown>;
const str = (v: unknown): string => (v == null ? "—" : String(v));

// The model uses the historical field name `firm_name` / `blacklist_date_*`;
// UI copy says "blocklisted" per inclusive-language.
const columns: Column<Row>[] = [
  { header: "Firm", cell: (r) => <span className="font-medium">{str(r.firm_name)}</span> },
  { header: "Proprietor", cell: (r) => str(r.proprietor_name) },
  { header: "Reason", cell: (r) => str(r.reason) },
  { header: "Blocklisted", cell: (r) => str(r.blacklist_date_ad ?? r.blacklist_date_bs) },
];

const PAGE_SIZE = 25;

// F7 — blocklisted firms list. Firms are keyed by their numeric `id` (the model
// PK); firm names are not unique, so the row/route key is the id.
export default function Firms() {
  const navigate = useNavigate();
  return (
    <ResourceTable<Row>
      title="Blocklisted firms"
      description="Blocklisted firms. Create and edit firm records."
      columns={columns}
      pageSize={PAGE_SIZE}
      rowKey={(r) => str(r.id)}
      onRowClick={(r) => {
        const id = str(r.id);
        if (id && id !== "—") navigate(`/admin/datalake/firms/${encodeURIComponent(id)}/edit`);
      }}
      headerAction={
        <Button size="sm" onClick={() => navigate("/admin/datalake/firms/new")}>
          <Plus className="mr-1 h-4 w-4" /> New Firm
        </Button>
      }
      fetchPage={(page) =>
        listBlacklistedFirms<Row>({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      }
    />
  );
}
