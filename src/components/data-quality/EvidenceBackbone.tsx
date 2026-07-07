import { useTranslation } from "react-i18next";
import CountUp from "react-countup";
import { Database, FileText, Gavel, Landmark } from "lucide-react";

import type {
  DataLakeMetrics,
  EntityMetrics,
  MaterialsMetrics,
} from "@/types/jds";

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
 * "The record base behind every case." The redesign leads with the story (the
 * gap), then grounds it in the sheer scale of source records that back it —
 * 1.6M court records, tens of thousands of materials, 184k entities. Framed as
 * the raw material accountability is built from, not a dataset inventory.
 */
export function EvidenceBackbone({
  nes,
  ngm,
  materials,
}: {
  nes?: EntityMetrics;
  ngm?: DataLakeMetrics;
  materials?: MaterialsMetrics;
}) {
  const { t } = useTranslation();

  const courtMax =
    ngm?.by_court_type.reduce((m, c) => Math.max(m, c.count), 0) ?? 0;

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.backbone.heading", "The record base behind every case")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.backbone.description",
          "Each case is cross-checked against millions of public records: court filings, tracked entities, and source documents. This is the raw material the investigation stands on.",
        )}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ngm && (
          <ScaleTile
            icon={<Gavel className="h-6 w-6" />}
            value={ngm.court_cases_total}
            label={t("dataQuality.backbone.courtRecords", "Court records")}
          />
        )}
        {ngm && (
          <ScaleTile
            icon={<Landmark className="h-6 w-6" />}
            value={ngm.courts_total}
            label={t("dataQuality.backbone.courts", "Courts covered")}
          />
        )}
        {nes && (
          <ScaleTile
            icon={<Database className="h-6 w-6" />}
            value={nes.total}
            label={t("dataQuality.backbone.entities", "Entities tracked")}
          />
        )}
        {materials && (
          <ScaleTile
            icon={<FileText className="h-6 w-6" />}
            value={materials.total}
            label={t("dataQuality.backbone.materials", "Source materials")}
          />
        )}
      </div>

      {ngm && ngm.by_court_type.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("dataQuality.backbone.byCourtType", "Court records by court level")}
          </p>
          <ul className="space-y-2.5">
            {[...ngm.by_court_type]
              .sort((a, b) => b.count - a.count)
              .map((c) => {
                const width = courtMax > 0 ? (c.count / courtMax) * 100 : 0;
                return (
                  <li key={c.court__court_type} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-sm capitalize text-foreground">
                      {c.court__court_type}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(width, 0.5)}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-foreground">
                      {c.count.toLocaleString()}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </section>
  );
}
