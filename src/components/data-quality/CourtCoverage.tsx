import { useTranslation } from "react-i18next";

import type { CourtCoverageRow } from "@/lib/data-quality-mock";

/**
 * Coverage of the judiciary, court level by court level: how many of each
 * court's records we hold and the date span they cover (Bikram Sambat + AD).
 * Modelled on how open court-record archives state coverage per jurisdiction
 * with explicit gaps, rather than implying the archive is complete.
 *
 * Record counts are real; court tallies and date ranges are mock for now.
 */
export function CourtCoverage({ rows }: { rows: CourtCoverageRow[] }) {
  const { t } = useTranslation();

  return (
    <section>
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.courtCoverage.heading", "How far the court records reach")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.courtCoverage.description",
          "Which courts we hold records from, and the years they span. We don't yet have every court or every year, so here is exactly what is covered.",
        )}
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4 font-semibold">{t("dataQuality.courtCoverage.colCourt", "Court level")}</th>
              <th className="py-2 pr-4 font-semibold">{t("dataQuality.courtCoverage.colCourts", "Courts covered")}</th>
              <th className="py-2 pr-4 text-right font-semibold">{t("dataQuality.courtCoverage.colRecords", "Records")}</th>
              <th className="py-2 font-semibold">{t("dataQuality.courtCoverage.colRange", "Registered between")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.courtType} className="border-b border-border/60">
                <td className="py-3 pr-4 font-medium text-foreground">
                  {t(`dataQuality.courtCoverage.court.${r.courtType}`, r.courtType)}
                </td>
                <td className="py-3 pr-4 font-mono tabular-nums text-muted-foreground">
                  {t("dataQuality.courtCoverage.courtsValue", "{{covered}} of {{total}}", {
                    covered: r.courtsCovered,
                    total: r.courtsTotal,
                  })}
                </td>
                <td className="py-3 pr-4 text-right font-mono font-semibold tabular-nums text-foreground">
                  {r.count.toLocaleString()}
                </td>
                <td className="py-3 font-mono text-xs tabular-nums text-muted-foreground">
                  {t("dataQuality.courtCoverage.rangeValue", "BS {{from}} to {{to}} · {{fromAd}} to {{toAd}} AD", {
                    from: r.fromBs,
                    to: r.toBs,
                    fromAd: r.fromAd.slice(0, 4),
                    toAd: r.toAd.slice(0, 4),
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs leading-6 text-muted-foreground">
        {t(
          "dataQuality.courtCoverage.gapsNote",
          "Known gaps: some district and high courts, and cases registered before the start years above, are still being ingested. A missing court or year here means we haven't collected it yet, not that no cases exist.",
        )}
      </p>
      <p className="mt-2 text-xs italic text-muted-foreground">
        {t("dataQuality.courtCoverage.mockNote", "Record counts are real; court tallies and date spans are sample values for this preview.")}
      </p>
    </section>
  );
}
