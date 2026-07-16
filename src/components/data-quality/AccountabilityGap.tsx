import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import CountUp from "react-countup";

import type { CaseStatistics } from "@/types/jds";
import { StatusDonut, type DonutSegment } from "./StatusDonut";
import { AccountabilityFunnel, type FunnelStage } from "./AccountabilityFunnel";

/**
 * The page centerpiece: corruption cases. Thousands of cases are documented and
 * under investigation, but almost none reach a published finding. A drop-off
 * funnel shows that status split; the right-column donut breaks the same cases
 * into CIAA vs non-CIAA prosecutions (the status donut it replaces was a ~99%
 * single slice — no information).
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

  // "In review" (being prepared for publication) is a subset of the
  // under-investigation bucket; the rest are drafts. When the backend provides
  // the split, the funnel shows draft vs in-review separately; otherwise it
  // keeps a single "under investigation" bar (graceful pre-deploy fallback).
  const inReviewProvided = stats?.cases_in_review != null;
  const inReview = stats?.cases_in_review ?? 0;
  const draftOnly = Math.max(0, investigating - inReview);

  // CIAA vs non-CIAA split (classified by the CR court-case number). Optional:
  // present only once the backend deploys, so the donut renders conditionally.
  const ciaa = stats?.cases_ciaa ?? 0;
  const nonCiaa = stats?.cases_non_ciaa ?? 0;
  const ciaaTotal = ciaa + nonCiaa;

  // Only the mutually-exclusive status buckets go in the bars. "Documented" is
  // their sum (the sum of the status buckets) — a derived total, not an API field — so it is
  // shown as the header/denominator above, never as a fourth competing bar.
  const stages: FunnelStage[] = [
    {
      key: "investigating",
      label: t("dataQuality.cases.status.investigating", "Under investigation"),
      count: inReviewProvided ? draftOnly : investigating,
      color: "hsl(var(--alert))",
    },
    ...(inReviewProvided
      ? [
          {
            key: "in_review",
            label: t("dataQuality.gap.stage.inReview", "In review (being prepared)"),
            count: inReview,
            color: "hsl(var(--accent))",
          } as FunnelStage,
        ]
      : []),
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

  // CIAA vs non-CIAA — two balanced slices (unlike the retired status donut).
  const ciaaSegments: DonutSegment[] = [
    {
      key: "ciaa",
      label: t("dataQuality.corruptionCases.ciaaLabel", "CIAA prosecutions"),
      value: ciaa,
      color: "hsl(var(--accent))",
    },
    {
      key: "non_ciaa",
      label: t("dataQuality.corruptionCases.nonCiaaLabel", "Other bodies"),
      value: nonCiaa,
      color: "hsl(var(--muted-foreground))",
    },
  ];

  return (
    <section>
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
        {t("dataQuality.corruptionCases.eyebrow", "The core finding")}
      </p>
      <h2 className="font-display text-[1.9rem] font-bold leading-tight tracking-tight text-foreground md:text-[2.5rem]">
        {t("dataQuality.corruptionCases.heading", "Corruption cases")}
      </h2>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
        {t(
          "dataQuality.corruptionCases.lead",
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
          {/* Documented total + funnel */}
          <div>
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
            {published > 0 && (
              <Link
                to="/cases"
                className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
              >
                {t("dataQuality.corruptionCases.browsePublished", "Browse published cases")} →
              </Link>
            )}
          </div>

          {/* Who is prosecuting: CIAA vs other bodies. Renders only once the
              split is in the payload (post-deploy); otherwise this column is
              omitted so the section degrades gracefully. */}
          {ciaaTotal > 0 && (
            <div>
              {isLoading ? (
                <div className="mx-auto h-[200px] w-[200px] animate-pulse rounded-full bg-muted" />
              ) : (
                <StatusDonut
                  segments={ciaaSegments}
                  centerValue={ciaaTotal.toLocaleString()}
                  centerLabel={t("dataQuality.cases.donutCenter", "cases")}
                />
              )}
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                {t(
                  "dataQuality.corruptionCases.ciaaCaption",
                  "Cases split by who prosecutes them. CIAA files corruption as criminal (CR) cases; the rest run through other bodies.",
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
