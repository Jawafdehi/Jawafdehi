import { useTranslation } from "react-i18next";
import CountUp from "react-countup";

import type { CaseStatistics } from "@/types/jds";
import { StatusDonut, type DonutSegment } from "./StatusDonut";
import { AccountabilityFunnel, type FunnelStage } from "./AccountabilityFunnel";

/**
 * The page centerpiece: the accountability gap. Thousands of cases are
 * documented and under investigation, but almost none reach a published
 * finding. A headline ratio names the gap; a drop-off funnel shows it; the
 * status donut is the secondary "where do they all sit" read.
 */
export function AccountabilityGap({
  stats,
  isLoading,
  isError,
}: {
  stats?: CaseStatistics;
  isLoading: boolean;
  isError: boolean;
}) {
  const { t } = useTranslation();

  const published = stats?.published_cases ?? 0;
  const investigating = stats?.cases_under_investigation ?? 0;
  const closed = stats?.cases_closed ?? 0;
  const documented = published + investigating + closed;
  const ratio = published > 0 ? Math.round(documented / published) : 0;

  // Only the mutually-exclusive status buckets go in the bars. "Documented" is
  // their sum (the sum of the status buckets) — a derived total, not an API field — so it is
  // shown as the header/denominator above, never as a fourth competing bar.
  const stages: FunnelStage[] = [
    {
      key: "investigating",
      label: t("dataQuality.cases.status.investigating", "Under investigation"),
      count: investigating,
      color: "hsl(var(--alert))",
    },
    {
      key: "published",
      label: t("dataQuality.gap.stage.published", "Reached a published finding"),
      count: published,
      color: "hsl(var(--success))",
    },
    {
      key: "closed",
      label: t("dataQuality.cases.status.closed", "Closed"),
      count: closed,
      color: "hsl(var(--muted-foreground))",
    },
  ];

  const segments: DonutSegment[] = [
    {
      key: "investigating",
      label: t("dataQuality.cases.status.investigating", "Under investigation"),
      value: investigating,
      color: "hsl(var(--alert))",
    },
    {
      key: "published",
      label: t("dataQuality.cases.status.published", "Published"),
      value: published,
      color: "hsl(var(--success))",
    },
    {
      key: "closed",
      label: t("dataQuality.cases.status.closed", "Closed"),
      value: closed,
      color: "hsl(var(--muted-foreground))",
    },
  ];

  return (
    <section>
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
        {t("dataQuality.gap.eyebrow", "The core finding")}
      </p>
      <h2 className="font-display text-[1.9rem] font-bold leading-tight tracking-tight text-foreground md:text-[2.5rem]">
        {t("dataQuality.gap.heading", "The accountability gap")}
      </h2>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
        {t(
          "dataQuality.gap.lead",
          "Every case here is a public official, office, or contract we're holding to account. Thousands are documented and under investigation, but only a handful have reached a published finding. That gap is the story.",
        )}
      </p>

      {isError && !stats ? (
        <p className="mt-6 rounded-lg border border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
          {t(
            "dataQuality.cases.error",
            "Live case counts are unavailable right now. Please check back shortly.",
          )}
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
          {/* Ratio headline + funnel */}
          <div>
            {ratio > 0 && (
              <div className="mb-8 rounded-xl border border-border bg-muted/20 px-5 py-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("dataQuality.gap.ratioEyebrow", "The accountability ratio")}
                </p>
                <p className="mt-1 font-mono text-[2.75rem] font-bold leading-none tracking-tight text-accent">
                  <CountUp end={ratio} duration={1.2} separator="," />
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground/70">
                  {t(
                    "dataQuality.gap.ratioCaption",
                    "documented cases for every one that has reached a published finding. The rest are still under investigation.",
                  )}
                </p>
              </div>
            )}

            {/* The documented total: parent of the buckets below, shown as a
                header so it never reads as a peer of its own components. */}
            {!isLoading && (
              <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-border pb-3">
                <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("dataQuality.gap.totalLabel", "Documented cases")}
                </span>
                <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                  <CountUp end={documented} duration={1.2} separator="," />
                </span>
              </div>
            )}

            <AccountabilityFunnel
              stages={stages}
              denominator={documented}
              isLoading={isLoading}
              ofLabel={(pct) =>
                t("dataQuality.gap.ofDocumented", "{{pct}}% of documented", { pct })
              }
            />

            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              {t(
                "dataQuality.gap.bucketsCaption",
                "Every documented case sits in exactly one of these. The three add up to the total above.",
              )}
            </p>
          </div>

          {/* Status mix */}
          <div>
            {isLoading ? (
              <div className="mx-auto h-[200px] w-[200px] animate-pulse rounded-full bg-muted" />
            ) : (
              <StatusDonut
                segments={segments}
                centerValue={documented.toLocaleString()}
                centerLabel={t("dataQuality.cases.donutCenter", "cases")}
              />
            )}
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              {t(
                "dataQuality.cases.donutCaption",
                "Status of every documented case. Most sit in investigation, where accountability moves slowly.",
              )}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
