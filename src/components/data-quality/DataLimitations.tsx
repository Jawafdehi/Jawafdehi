import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

import type { CaseStatistics } from "@/types/jds";

/**
 * "What this data can't tell you yet." A plain, named list of the real limits of
 * the archive, drawn from the actual numbers. Standard practice on serious data
 * pages (the "known issues" of a dataset nutrition label) and squarely on-brand
 * here, where the whole page is an argument for honesty about the gap.
 */
export function DataLimitations({ stats }: { stats?: CaseStatistics }) {
  const { t } = useTranslation();
  if (!stats) return null;

  const ngm = stats.ngm;
  const nes = stats.nes;
  const investigating = stats.cases_under_investigation;

  const items: string[] = [];

  if (ngm && ngm.completeness.nes_resolved === 0) {
    items.push(
      t(
        "dataQuality.limitations.linked",
        "None of the {{total}} court records are linked yet to the specific people or offices they name, so you can't jump from an official to their court history.",
        { total: ngm.court_cases_total.toLocaleString() },
      ),
    );
  }

  if (investigating > 0) {
    items.push(
      t(
        "dataQuality.limitations.investigating",
        "{{count}} cases sit under investigation in our counts but aren't yet browsable one by one.",
        { count: investigating.toLocaleString() },
      ),
    );
  }

  if (ngm) {
    items.push(
      t(
        "dataQuality.limitations.sourceDocs",
        "Only {{pct}}% of court records have an attached source document, so most can't be traced back to a filing yet.",
        { pct: ngm.completeness.with_document_sources },
      ),
    );
  }

  if (nes) {
    items.push(
      t(
        "dataQuality.limitations.reconcile",
        "Two internal counts of tracked entities differ by one ({{a}} and {{b}}); we're reconciling which is right.",
        { a: nes.total.toLocaleString(), b: (nes.total - 1).toLocaleString() },
      ),
    );
  }

  items.push(
    t(
      "dataQuality.limitations.coverage",
      "We don't hold every court or every year yet. A missing record means we haven't collected it, not that nothing happened.",
    ),
  );

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.limitations.heading", "What this data can't tell you yet")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.limitations.description",
          "The honest limits of what's here today. We list them so you don't read more into a number than it can carry.",
        )}
      </p>

      <ul className="mt-6 max-w-3xl space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-alert" aria-hidden="true" />
            <span className="text-sm leading-6 text-foreground/80">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
