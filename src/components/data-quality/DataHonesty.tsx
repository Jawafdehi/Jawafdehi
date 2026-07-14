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

interface HonestyGroup {
  key: string;
  heading: string;
  total: number;
  items: HonestyItem[];
}

/** Health colour by completeness: thin (<25%) -> partial (<75%) -> solid (>=75%). */
function healthColor(pct: number): string {
  if (pct < 25) return "hsl(var(--alert))";
  if (pct < 75) return "hsl(var(--muted-foreground))";
  return "hsl(var(--success))";
}

/** One completeness metric: a label, a thin health-coloured bar, and the count. */
function Bar({ item, t }: { item: HonestyItem; t: Translate }) {
  const pct = truncPct(item.part, item.whole);
  const color = healthColor(pct);
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-foreground">{item.label}</span>
        <span className="font-mono text-sm font-bold tabular-nums" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div
        className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {t("dataQuality.honesty.count", "{{part}} of {{total}}", {
            part: item.part.toLocaleString(),
            total: item.whole.toLocaleString(),
          })}
        </span>
        {pct === 0 && (
          <span className="text-xs text-muted-foreground/70">
            · {t("dataQuality.honesty.notStarted", "not started yet")}
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * The trust close. Completeness grouped by the three record sets it describes
 * (court records, entities, materials), each metric a thin health-coloured bar
 * ordered best-first within its group. Honest by construction: percentages are
 * truncated (never rounded up), and every gap is shown rather than hidden.
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

  const groups: HonestyGroup[] = [];

  if (ngm) {
    groups.push({
      key: "court",
      heading: t("dataQuality.honesty.group.court", "Court records"),
      total: ngm.court_cases_total,
      items: [
        {
          label: t("dataQuality.honesty.item.regDate", "Have an official registration date"),
          part: ngm.counts.with_registration_date,
          whole: ngm.court_cases_total,
        },
        {
          label: t("dataQuality.honesty.item.sourceDoc", "Have an attached source document"),
          part: ngm.counts.with_document_sources,
          whole: ngm.court_cases_total,
        },
        {
          label: t("dataQuality.honesty.item.linkedEntity", "Linked to the people and offices named"),
          part: ngm.counts.nes_resolved,
          whole: ngm.court_cases_total,
        },
      ],
    });
  }

  if (nes) {
    groups.push({
      key: "entities",
      heading: t("dataQuality.honesty.group.entities", "People & offices tracked"),
      total: nes.total,
      items: [
        {
          label: t("dataQuality.honesty.item.stableId", "Have a stable identifier"),
          part: nes.counts.with_identifier,
          whole: nes.total,
        },
        {
          label: t("dataQuality.honesty.item.bilingual", "Have both an English and Nepali name"),
          part: nes.counts.with_bilingual_name,
          whole: nes.total,
        },
      ],
    });
  }

  if (materials) {
    groups.push({
      key: "materials",
      heading: t("dataQuality.honesty.group.materials", "Source materials"),
      total: materials.total,
      items: [
        {
          label: t("dataQuality.honesty.item.materialLink", "Have a source link"),
          part: materials.counts.with_url,
          whole: materials.total,
        },
      ],
    });
  }

  if (groups.length === 0) return null;

  // Best-first within each group: each record set leads on its strength, then
  // shows where it thins out — instead of the whole section opening on a 0%.
  for (const g of groups) {
    g.items.sort((a, b) => truncPct(b.part, b.whole) - truncPct(a.part, a.whole));
  }

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.honesty.heading", "How solid is this data?")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.honesty.description",
          "What the records back up today, and where they fall short — we show the gaps rather than round them away.",
        )}
      </p>

      <div className="mt-8 max-w-2xl space-y-8">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {g.heading}
              <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                {" · "}
                {t("dataQuality.honesty.ofTotal", "of {{total}}", {
                  total: g.total.toLocaleString(),
                })}
              </span>
            </p>
            <ul className="mt-3 space-y-4">
              {g.items.map((item) => (
                <Bar key={item.label} item={item} t={t} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
