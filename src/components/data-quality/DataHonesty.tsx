import { useTranslation } from "react-i18next";
import { Check, Minus } from "lucide-react";

import type {
  DataLakeMetrics,
  EntityMetrics,
  MaterialsMetrics,
} from "@/types/jds";
import { Progress } from "@/components/ui/progress";

type Translate = ReturnType<typeof useTranslation>["t"];

interface HonestyItem {
  label: string;
  part: number;
  whole: number;
  pct: number;
}

function HonestyRow({ item, t }: { item: HonestyItem; t: Translate }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-sm text-foreground">{item.label}</span>
        <span className="font-mono text-sm font-bold tabular-nums text-foreground">{item.pct}%</span>
      </div>
      <Progress value={item.pct} className="h-1.5" />
      <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
        {t("dataQuality.honesty.count", "{{part}} of {{total}}", {
          part: item.part.toLocaleString(),
          total: item.whole.toLocaleString(),
        })}
      </p>
    </div>
  );
}

/**
 * The trust close. Instead of a wall of technical completeness bars, it answers
 * one question a reader actually has: how much of what you see here holds up?
 * A plain "what holds up" / "still thin" split, translating each database field
 * into what it means for someone reading a case. Honesty is the point, so the
 * thin side is not hidden.
 */
export function DataHonesty({
  nes,
  ngm,
  materials,
}: {
  nes?: EntityMetrics;
  ngm?: DataLakeMetrics;
  materials?: MaterialsMetrics;
}) {
  const { t } = useTranslation();

  const holdsUp: HonestyItem[] = [];
  const stillThin: HonestyItem[] = [];

  if (ngm) {
    holdsUp.push({
      label: t("dataQuality.honesty.item.regDate", "Court records with an official registration date"),
      part: ngm.counts.with_registration_date,
      whole: ngm.court_cases_total,
      pct: ngm.completeness.with_registration_date,
    });
    stillThin.push({
      label: t("dataQuality.honesty.item.linkedEntity", "Court records linked to the people or offices they name"),
      part: ngm.counts.nes_resolved,
      whole: ngm.court_cases_total,
      pct: ngm.completeness.nes_resolved,
    });
    stillThin.push({
      label: t("dataQuality.honesty.item.sourceDoc", "Court records with an attached source document"),
      part: ngm.counts.with_document_sources,
      whole: ngm.court_cases_total,
      pct: ngm.completeness.with_document_sources,
    });
  }

  if (nes) {
    holdsUp.push({
      label: t("dataQuality.honesty.item.stableId", "Tracked people and offices with a stable ID"),
      part: nes.counts.with_identifier,
      whole: nes.total,
      pct: nes.completeness.with_identifier,
    });
    holdsUp.push({
      label: t("dataQuality.honesty.item.bilingual", "Entities with both an English and Nepali name"),
      part: nes.counts.with_bilingual_name,
      whole: nes.total,
      pct: nes.completeness.with_bilingual_name,
    });
  }

  if (materials) {
    stillThin.push({
      label: t("dataQuality.honesty.item.materialLink", "Materials with a working source link"),
      part: materials.counts.with_url,
      whole: materials.total,
      pct: materials.completeness.with_url,
    });
  }

  if (holdsUp.length === 0 && stillThin.length === 0) return null;

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.honesty.heading", "How solid is this data?")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.honesty.description",
          "What the records back up today, and where they fall short. We show the gaps rather than round them away.",
        )}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
        {holdsUp.length > 0 && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Check className="h-4 w-4 text-success" aria-hidden="true" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                {t("dataQuality.honesty.holdsUp", "What holds up")}
              </h3>
            </div>
            <div className="space-y-5">
              {holdsUp.map((item) => (
                <HonestyRow key={item.label} item={item} t={t} />
              ))}
            </div>
          </div>
        )}

        {stillThin.length > 0 && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Minus className="h-4 w-4 text-alert" aria-hidden="true" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                {t("dataQuality.honesty.stillThin", "Still thin")}
              </h3>
            </div>
            <div className="space-y-5">
              {stillThin.map((item) => (
                <HonestyRow key={item.label} item={item} t={t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
