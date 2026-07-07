import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

import type { SourceRow } from "@/lib/data-quality-mock";
import { formatFreshness } from "@/lib/data-quality";

/**
 * Per-source freshness, the way open-data registers do it: each feed lists what
 * it contributes, how often it updates, and when it last refreshed. One source
 * is shown as stale on purpose, because hiding a feed that stopped updating is
 * exactly the dishonesty this page exists to avoid.
 *
 * Counts are real; cadences and refresh times are sample values for now.
 */
export function SourceCoverage({ sources }: { sources: SourceRow[] }) {
  const { t } = useTranslation();

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.sources.heading", "Where each number comes from")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.sources.description",
          "Every figure on this page traces to one of these feeds. Here is what each contributes, how often it updates, and when we last pulled it.",
        )}
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4 font-semibold">{t("dataQuality.sources.colSource", "Source")}</th>
              <th className="py-2 pr-4 text-right font-semibold">{t("dataQuality.sources.colRecords", "Records")}</th>
              <th className="py-2 pr-4 font-semibold">{t("dataQuality.sources.colUpdates", "Updates")}</th>
              <th className="py-2 font-semibold">{t("dataQuality.sources.colRefreshed", "Last refreshed")}</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => {
              const fresh = formatFreshness(s.lastUpdatedIso);
              return (
                <tr key={s.key} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {t(`dataQuality.sources.item.${s.key}`, s.key)}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono font-semibold tabular-nums text-foreground">
                    {s.count.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {t(`dataQuality.sources.frequency.${s.frequency}`, s.frequency)}
                  </td>
                  <td className="py-3 font-mono text-xs text-muted-foreground">
                    {s.stale ? (
                      <span className="inline-flex items-center gap-1.5 font-sans text-alert">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("dataQuality.sources.stale", "Stopped updating {{ago}}", { ago: fresh })}
                      </span>
                    ) : (
                      fresh
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
