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
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import { hasNesWriteAccess, hasNgmWriteAccess, isModerator } from "@/lib/roles";

// Landing page for the unified admin panel. Each card is a doorway into one of
// the data domains (Entities / Data Lake / Jawafdehi) plus casework. Counts are
// intentionally not fetched here yet — the resource pages own their own data.
//
// Cards are role-filtered with the SAME predicates the sidebar uses (see
// AdminLayout NAV): a card is shown to everyone who cleared the panel gate
// unless `canAccess` narrows it. Otherwise a caseworker would see prominent
// Entities / Moderation doorways that dead-end in a 403 (the sidebar hides
// them, so the two surfaces must agree).
interface Section {
  to: string;
  icon: typeof Network;
  title: string;
  body: string;
  canAccess?: (roles: string[]) => boolean;
}

const SECTIONS: Section[] = [
  {
    to: "/admin/entities",
    icon: Network,
    title: "Entities",
    body: "Schema.org JSON-LD entities. Create, edit, view versions, and trigger an OpenSearch reindex.",
    canAccess: hasNesWriteAccess,
  },
  {
    to: "/admin/datalake/courtcases",
    icon: Gavel,
    title: "Data Lake",
    body: "Court cases, hearings, and materials sourced into the governance data lake (read + ingestion).",
    canAccess: hasNgmWriteAccess,
  },
  {
    to: "/admin/jawafdehi/cases",
    icon: FileText,
    title: "Jawafdehi Cases",
    body: "Accountability cases — full create / edit / publish workflow.",
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
    canAccess: isModerator,
  },
];

export default function AdminDashboard() {
  const { user } = useCaseworkAuth();
  const roles = user?.roles ?? [];
  const sections = SECTIONS.filter((s) => !s.canAccess || s.canAccess(roles));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          One panel for entities, the data lake, Jawafdehi cases, and casework.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
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
