import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ClipboardCheck,
  FileText,
  Gavel,
  Network,
  ShieldCheck,
} from "lucide-react";

// Landing page for the unified admin panel. Each card is a doorway into one of
// the data domains (Entities / Data Lake / Jawafdehi) plus casework. Counts are
// intentionally not fetched here yet — the resource pages own their own data.
const SECTIONS = [
  {
    to: "/admin/entities",
    icon: Network,
    title: "Entities",
    body: "Schema.org JSON-LD entities. Create, edit, view versions, and trigger an OpenSearch reindex.",
  },
  {
    to: "/admin/datalake/courtcases",
    icon: Gavel,
    title: "Data Lake",
    body: "Court cases, hearings, and materials sourced into the governance data lake (read + ingestion).",
  },
  {
    to: "/admin/jawafdehi/cases",
    icon: FileText,
    title: "Jawafdehi Cases",
    body: "Accountability cases and their document sources — full create / edit / publish workflow.",
  },
  {
    to: "/admin/reviews",
    icon: ClipboardCheck,
    title: "Casework Reviews",
    body: "AI-assisted casework reviews, grading rules, and the review job queue.",
  },
  {
    to: "/admin/moderation",
    icon: ShieldCheck,
    title: "Moderation",
    body: "Triage and approve incoming submissions (admin / moderator only).",
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          One panel for entities, the data lake, Jawafdehi cases, and casework.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.to} to={s.to} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-5 w-5 text-primary" />
                    {s.title}
                  </CardTitle>
                  <CardDescription>{s.body}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
