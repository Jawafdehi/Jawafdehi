import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileEdit,
  FileText,
  Gavel,
  Loader2,
  MessageSquare,
  Network,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import { hasNesWriteAccess, hasNgmWriteAccess, isModerator } from "@/lib/roles";
import { listCases } from "@/services/admin-api";
import { listReviewsGrouped } from "@/services/casework-api";

// Landing page for the unified admin panel. The top row is live "situational"
// metrics (queue depth, published, drafts, AI reviews) that double as nav
// doorways; below them are the section cards — one doorway per data domain
// (Entities / Data Lake / Jawafdehi) plus casework.
//
// Both rows are role-filtered with the SAME predicates the sidebar uses (see
// AdminLayout NAV): a card is shown to everyone who cleared the panel gate
// unless a predicate narrows it. Otherwise a caseworker would see prominent
// Entities / Moderation doorways that dead-end in a 403 (the sidebar hides
// them, so the two surfaces must agree).
interface Section {
  to: string;
  icon: typeof Network;
  // i18n keys under `admin.dashboard.sections.*`, resolved at render.
  titleKey: string;
  bodyKey: string;
  canAccess?: (roles: string[], isAdmin: boolean) => boolean;
}

const SECTIONS: Section[] = [
  {
    to: "/admin/entities",
    icon: Network,
    titleKey: "admin.dashboard.sections.entitiesTitle",
    bodyKey: "admin.dashboard.sections.entitiesBody",
    canAccess: hasNesWriteAccess,
  },
  {
    to: "/admin/datalake/courtcases",
    icon: Gavel,
    titleKey: "admin.dashboard.sections.dataLakeTitle",
    bodyKey: "admin.dashboard.sections.dataLakeBody",
    canAccess: hasNgmWriteAccess,
  },
  {
    to: "/admin/jawafdehi/cases",
    icon: FileText,
    titleKey: "admin.dashboard.sections.casesTitle",
    bodyKey: "admin.dashboard.sections.casesBody",
  },
  {
    to: "/admin/reviews",
    icon: ClipboardCheck,
    titleKey: "admin.dashboard.sections.reviewsTitle",
    bodyKey: "admin.dashboard.sections.reviewsBody",
  },
  {
    to: "/admin/moderation",
    icon: ShieldCheck,
    titleKey: "admin.dashboard.sections.moderationTitle",
    bodyKey: "admin.dashboard.sections.moderationBody",
    canAccess: isModerator,
  },
  {
    to: "/admin/feedback",
    icon: MessageSquare,
    titleKey: "admin.dashboard.sections.feedbackTitle",
    bodyKey: "admin.dashboard.sections.feedbackBody",
    canAccess: isModerator,
  },
];

// A live count is `null` while loading and `undefined` when its fetch failed
// (rendered as "—"). Distinguishing the two lets the card show a spinner vs. a
// graceful placeholder instead of crashing the whole dashboard.
type Count = number | null | undefined;

interface Metrics {
  inReview: Count;
  published: Count;
  drafts: Count;
  reviews: Count;
}

interface Metric {
  key: keyof Metrics;
  to: string;
  icon: typeof Network;
  // i18n keys under `admin.dashboard.metrics.*`, resolved at render.
  labelKey: string;
  subKey: string;
  // Narrow the metric to a subset of roles (matches the section predicates).
  canAccess?: (roles: string[], isAdmin: boolean) => boolean;
  // Headline metric — rendered with emphasis (accent border/title).
  headline?: boolean;
}

const METRICS: Metric[] = [
  {
    key: "inReview",
    to: "/admin/moderation",
    icon: Clock,
    labelKey: "admin.dashboard.metrics.awaitingReview",
    subKey: "admin.dashboard.metrics.awaitingReviewSub",
    canAccess: isModerator,
    headline: true,
  },
  {
    key: "published",
    to: "/admin/jawafdehi/cases",
    icon: CheckCircle2,
    labelKey: "admin.dashboard.metrics.published",
    subKey: "admin.dashboard.metrics.publishedSub",
  },
  {
    key: "drafts",
    to: "/admin/jawafdehi/cases",
    icon: FileEdit,
    labelKey: "admin.dashboard.metrics.drafts",
    subKey: "admin.dashboard.metrics.draftsSub",
  },
  {
    key: "reviews",
    to: "/admin/reviews",
    icon: ClipboardCheck,
    labelKey: "admin.dashboard.metrics.reviews",
    subKey: "admin.dashboard.metrics.reviewsSub",
  },
];

// Fetch a single count from a paginated list endpoint, swallowing failures so
// one bad call surfaces as "—" rather than rejecting the whole Promise.all.
async function safeCount(fetcher: () => Promise<{ count: number }>): Promise<Count> {
  try {
    const { count } = await fetcher();
    return count;
  } catch {
    return undefined;
  }
}

function MetricValue({ value, loadingLabel }: { value: Count; loadingLabel: string }) {
  if (value === null) {
    return (
      <Loader2
        className="h-6 w-6 animate-spin text-muted-foreground"
        aria-label={loadingLabel}
      />
    );
  }
  return (
    <span className="text-3xl font-bold tabular-nums">
      {value === undefined ? "—" : value.toLocaleString()}
    </span>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user, isAdmin } = useCaseworkAuth();
  const roles = user?.roles ?? [];
  const sections = SECTIONS.filter(
    (s) => !s.canAccess || s.canAccess(roles, isAdmin),
  );
  const metrics = METRICS.filter(
    (m) => !m.canAccess || m.canAccess(roles, isAdmin),
  );

  const [counts, setCounts] = useState<Metrics>({
    inReview: null,
    published: null,
    drafts: null,
    reviews: null,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      safeCount(() => listCases({ state: "IN_REVIEW", page_size: 1 })),
      safeCount(() => listCases({ state: "PUBLISHED", page_size: 1 })),
      safeCount(() => listCases({ state: "DRAFT", page_size: 1 })),
      safeCount(() => listReviewsGrouped({ page_size: 1 })),
    ]).then(([inReview, published, drafts, reviews]) => {
      if (cancelled) return;
      setCounts({ inReview, published, drafts, reviews });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("admin.dashboard.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("admin.dashboard.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.key} to={m.to} className="group">
              <Card
                className={`h-full transition-colors group-hover:border-primary/50 ${
                  m.headline ? "border-primary/40 bg-primary/5" : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <CardTitle
                    className={`flex items-center gap-2 text-sm font-medium ${
                      m.headline ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(m.labelKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <MetricValue
                    value={counts[m.key]}
                    loadingLabel={t("admin.common.loading")}
                  />
                  <p className="text-xs text-muted-foreground">{t(m.subKey)}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.to} to={s.to} className="group">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-5 w-5 text-primary" />
                    {t(s.titleKey)}
                  </CardTitle>
                  <CardDescription>{t(s.bodyKey)}</CardDescription>
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
