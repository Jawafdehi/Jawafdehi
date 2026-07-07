import { Link, useNavigate } from "react-router-dom";
import ResourceTable, { type Column } from "@/components/admin/ResourceTable";
import { listCourtCases } from "@/services/admin-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Row = Record<string, unknown>;

const str = (v: unknown): string => (v == null ? "—" : String(v));

// Columns follow the CourtCaseSerializer wire shape (court_identifier,
// case_status, …), not guessed names.
const columns: Column<Row>[] = [
  { header: "Case number", cell: (r) => <span className="font-mono text-xs">{str(r.case_number)}</span> },
  { header: "Court", cell: (r) => str(r.court_identifier) },
  { header: "Type", cell: (r) => str(r.case_type) },
  { header: "Status", cell: (r) => <Badge variant="secondary">{str(r.case_status)}</Badge> },
];

const PAGE_SIZE = 25;

export default function CourtCases() {
  const navigate = useNavigate();
  return (
    <ResourceTable<Row>
      title="Court Cases"
      description="Judicial cases in the governance data lake. Mostly scraped; you can also create/edit by hand."
      columns={columns}
      pageSize={PAGE_SIZE}
      rowKey={(r) => `${str(r.court_identifier)}/${str(r.case_number)}`}
      headerAction={
        <Button asChild size="sm">
          <Link to="/admin/datalake/courtcases/new">
            <Plus className="mr-1 h-4 w-4" /> New case
          </Link>
        </Button>
      }
      onRowClick={(r) =>
        navigate(
          `/admin/datalake/courtcases/${encodeURIComponent(
            str(r.court_identifier),
          )}/${encodeURIComponent(str(r.case_number))}/edit`,
        )
      }
      fetchPage={(page) =>
        listCourtCases<Row>({
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        })
      }
    />
  );
}
