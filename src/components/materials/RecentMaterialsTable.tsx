import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { seriesBySource } from "@/data/material-series";
import { sourceKeyFor } from "@/lib/material-source-labels";
import {
  folderTintClass,
  formatLedgerDate,
  pickLocalized,
  sourceFromMaterialUrl,
} from "@/lib/materials-landing";

import type { RecentMaterial } from "@/lib/materials-landing";

/**
 * The "recently added" register: newest documents on a raised surface panel.
 * Every cell is real API data; documents without a resolvable date never
 * reach this component (lib/materials-landing drops them).
 */
export function RecentMaterialsTable({
  materials,
}: Readonly<{ materials: readonly RecentMaterial[] }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-elev-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4 md:pl-6">
              {t("materialsLanding.recent.document", "Document")}
            </TableHead>
            <TableHead>{t("materialsLanding.recent.series", "Series")}</TableHead>
            <TableHead>{t("materialsLanding.recent.date", "Date")}</TableHead>
            <TableHead className="pr-4 text-right md:pr-6">
              <span className="sr-only">{t("materialsLanding.recent.open", "Open")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map(({ result, date }) => {
            const source = sourceFromMaterialUrl(result.url);
            const series = source ? seriesBySource(source) : undefined;
            const seriesLabel = series
              ? pickLocalized(series.name, language)
              : t(
                  `dataQuality.materialsBySource.source.${sourceKeyFor(source ?? "")}`,
                  source ?? "—",
                );
            const title =
              pickLocalized(result.title, language) ||
              t("materialsLanding.recent.untitled", "Untitled document");
            return (
              <TableRow
                key={result.id}
                className="transition-colors hover:bg-surface-2 hover:shadow-elev-xs"
              >
                <TableCell className="max-w-[22rem] pl-4 font-medium text-foreground md:pl-6">
                  <Link
                    to={result.url}
                    className="line-clamp-2 rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {title}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 shrink-0 rounded-full border border-primary/20 ${
                        series ? folderTintClass(series.tint) : "bg-muted"
                      }`}
                    />
                    {seriesLabel}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono text-sm tabular-nums text-muted-foreground">
                  {formatLedgerDate(date, language)}
                </TableCell>
                <TableCell className="pr-4 text-right md:pr-6">
                  <Link
                    to={result.url}
                    aria-label={t("materialsLanding.recent.openDocument", "Open: {{title}}", {
                      title,
                    })}
                    className="whitespace-nowrap rounded-sm text-sm font-semibold text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {t("materialsLanding.recent.view", "View")} →
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
