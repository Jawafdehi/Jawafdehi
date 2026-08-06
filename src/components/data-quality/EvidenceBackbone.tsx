import { useTranslation } from "react-i18next";
import CountUp from "react-countup";
import { Gavel, Landmark } from "lucide-react";

import type { DataLakeMetrics } from "@/types/jds";
import { bsYearRows } from "@/lib/data-quality";
import { CourtYearMatrix } from "./CourtYearMatrix";
import { CourtYearTrend } from "./CourtYearTrend";

/** A single scale figure with an icon and label. */
function ScaleTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-5">
      <div className="mb-3 text-accent">{icon}</div>
      <p className="font-mono text-2xl font-bold tabular-nums text-foreground md:text-3xl">
        <CountUp end={value} duration={1.2} separator="," />
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * "Court cases." The judicial record base behind every case: the scale of court
 * records and the courts they span, then a court x year heatmap that shows how
 * that volume distributes across court levels and time. Entities and materials
 * live in their own sections; the standalone per-court-level bars are gone —
 * their totals are the heatmap's row totals now.
 */
export function EvidenceBackbone({ ngm }: { ngm?: DataLakeMetrics }) {
  const { t } = useTranslation();

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.courtCases.heading", "Court cases")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.courtCases.description",
          "Each case is cross-checked against millions of public court records. This is the judicial record base the investigation stands on.",
        )}
      </p>

      {ngm && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ScaleTile
            icon={<Gavel className="h-6 w-6" />}
            value={ngm.court_cases_total}
            label={t("dataQuality.backbone.courtRecords", "Court records")}
          />
          <ScaleTile
            icon={<Landmark className="h-6 w-6" />}
            value={ngm.courts_total}
            label={t("dataQuality.backbone.courts", "Courts covered")}
          />
        </div>
      )}

      {/* Both guards mirror the charts' own BS-year filter, so a pre-cutover
          payload leaves no orphan heading above an empty chart. */}
      {bsYearRows(ngm?.by_year).length ? (
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t(
              "dataQuality.courtCases.trendHeading",
              "Court cases filed per year (Bikram Sambat)",
            )}
          </p>
          <CourtYearTrend ngm={ngm} />
        </div>
      ) : null}

      {bsYearRows(ngm?.by_court_type_year).length ? (
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t(
              "dataQuality.courtCases.matrixHeading",
              "Court records by level and year (Bikram Sambat)",
            )}
          </p>
          <CourtYearMatrix ngm={ngm} />
        </div>
      ) : null}
    </section>
  );
}
