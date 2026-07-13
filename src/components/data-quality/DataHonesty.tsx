import { useTranslation } from "react-i18next";

import type {
  DataLakeMetrics,
  EntityMetrics,
  MaterialsMetrics,
} from "@/types/jds";
import { truncPct } from "@/lib/data-quality";

type Translate = ReturnType<typeof useTranslation>["t"];

interface HonestyItem {
  label: string;
  part: number;
  whole: number;
}

/** Health colour by completeness: thin (<25%) -> mid (<75%) -> solid (>=75%). */
function healthColor(pct: number): string {
  if (pct < 25) return "hsl(var(--alert))";
  if (pct < 75) return "hsl(var(--muted-foreground))";
  return "hsl(var(--success))";
}

/** One completeness metric as a dot on a 0-100% track, coloured by health. */
function DotRow({ item, t }: { item: HonestyItem; t: Translate }) {
  const pct = truncPct(item.part, item.whole);
  const color = healthColor(pct);
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-foreground">{item.label}</span>
        <span
          className="font-mono text-sm font-bold tabular-nums"
          style={{ color }}
        >
          {pct}%
        </span>
      </div>
      <div
        className="relative mt-2 h-2 w-full rounded-full bg-muted"
        role="img"
        aria-label={`${item.label}: ${pct}%`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.25 }}
        />
        <span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
          style={{ left: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
        {t("dataQuality.honesty.count", "{{part}} of {{total}}", {
          part: item.part.toLocaleString(),
          total: item.whole.toLocaleString(),
        })}
      </p>
    </li>
  );
}

/**
 * The trust close. Every completeness metric on ONE sorted track — worst first —
 * so the reader sees at a glance where the data holds up and where it is still
 * thin, coloured by health. Honesty is the point, so the thin metrics lead
 * instead of being tucked into a second column.
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

  const items: HonestyItem[] = [];

  if (ngm) {
    items.push({
      label: t("dataQuality.honesty.item.regDate", "Court records with an official registration date"),
      part: ngm.counts.with_registration_date,
      whole: ngm.court_cases_total,
    });
    items.push({
      label: t("dataQuality.honesty.item.linkedEntity", "Court records linked to the people or offices they name"),
      part: ngm.counts.nes_resolved,
      whole: ngm.court_cases_total,
    });
    items.push({
      label: t("dataQuality.honesty.item.sourceDoc", "Court records with an attached source document"),
      part: ngm.counts.with_document_sources,
      whole: ngm.court_cases_total,
    });
  }

  if (nes) {
    items.push({
      label: t("dataQuality.honesty.item.stableId", "Tracked people and offices with a stable ID"),
      part: nes.counts.with_identifier,
      whole: nes.total,
    });
    items.push({
      label: t("dataQuality.honesty.item.bilingual", "Entities with both an English and Nepali name"),
      part: nes.counts.with_bilingual_name,
      whole: nes.total,
    });
  }

  if (materials) {
    items.push({
      label: t("dataQuality.honesty.item.materialLink", "Materials with a working source link"),
      part: materials.counts.with_url,
      whole: materials.total,
    });
  }

  if (items.length === 0) return null;

  // Sort worst-first: the gaps lead, the strengths close.
  const sorted = [...items].sort(
    (a, b) => truncPct(a.part, a.whole) - truncPct(b.part, b.whole),
  );

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

      {/* Health legend */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <LegendDot color="hsl(var(--alert))" label={t("dataQuality.honesty.legendThin", "Thin (under 25%)")} />
        <LegendDot color="hsl(var(--muted-foreground))" label={t("dataQuality.honesty.legendPartial", "Partial")} />
        <LegendDot color="hsl(var(--success))" label={t("dataQuality.honesty.legendSolid", "Solid (75%+)")} />
      </div>

      <ul className="mt-6 max-w-2xl space-y-6">
        {sorted.map((item) => (
          <DotRow key={item.label} item={item} t={t} />
        ))}
      </ul>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
