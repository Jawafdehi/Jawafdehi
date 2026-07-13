import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { EntityMetrics } from "@/types/jds";
import { institutionGroups, personCount } from "@/lib/entity-type-labels";
import { personSectorKey, rollupToCoarse } from "@/lib/person-sector-labels";
import { BreakdownBar } from "./BreakdownBar";

/**
 * "Who we hold to account." Tracked entities — most are individual
 * people, so that fact leads as a sentence; the institutions bar then breaks
 * down the rest (hospitals, government offices, local governments...), and a
 * second sub-block breaks the PEOPLE down by the position they hold. The
 * section reads: headline -> institutions we track -> what positions the people
 * hold. Raw schema/sector tokens are mapped to plain labels.
 *
 * Reads live nes.by_type + nes.persons_by_sector from /api/statistics/.
 */
export function EntityBreakdown({ nes }: { nes?: EntityMetrics }) {
  const { t } = useTranslation();
  if (!nes?.by_type?.length) return null;

  const people = personCount(nes.by_type);
  const items = institutionGroups(nes.by_type).map((g) => ({
    label: t(`dataQuality.entities.group.${g.key}`, g.key),
    count: g.count,
  }));

  return (
    <section>
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.entities.heading", "Who we hold to account")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.entities.description",
          "{{people}} of {{total}} tracked entities are individual people. The rest are the institutions they act through.",
          { people: people.toLocaleString(), total: nes.total.toLocaleString() },
        )}
      </p>

      {items.length > 0 && (
        <>
          <p className="mt-6 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("dataQuality.entities.institutionsLabel", "Institutions we track")}
          </p>
          <BreakdownBar
            items={items}
            tooltipLabel={t("dataQuality.entities.tooltip", "Entities")}
          />
        </>
      )}

      <PersonsBySector sectors={nes.persons_by_sector} />
    </section>
  );
}

/**
 * The people, broken down by the sector/branch of the position they hold.
 * Discrete unordered categories -> a horizontal BreakdownBar (same family as
 * the institutions bar), never an area chart. Two client-side toggles: hide the
 * (dominant) "position not recorded" bucket, and switch detailed ~8 sectors ↔
 * coarse public/private/other. Renders nothing until the field is present.
 */
function PersonsBySector({
  sectors,
}: {
  sectors?: EntityMetrics["persons_by_sector"];
}) {
  const { t } = useTranslation();
  const [coarse, setCoarse] = useState(false);
  const [hideUnknown, setHideUnknown] = useState(false);

  if (!sectors?.length) return null;

  const filtered = hideUnknown
    ? sectors.filter((s) => s.sector !== "not_recorded")
    : sectors;

  const items = coarse
    ? rollupToCoarse(filtered).map((c) => ({
        label: t(`dataQuality.entities.coarse.${c.sector}`, c.sector),
        count: c.count,
      }))
    : filtered.map((s) => ({
        label: t(`dataQuality.entities.sector.${personSectorKey(s.sector)}`, s.sector),
        count: s.count,
      }));

  if (!items.length) return null;

  return (
    <div className="mt-8">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("dataQuality.entities.sectorHeading", "What positions the people hold")}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setHideUnknown((v) => !v)}
            aria-pressed={hideUnknown}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:border-accent aria-pressed:bg-accent/10 aria-pressed:text-foreground"
          >
            {t("dataQuality.entities.toggleHideUnknown", "Hide not recorded")}
          </button>
          <button
            type="button"
            onClick={() => setCoarse((v) => !v)}
            aria-pressed={coarse}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:border-accent aria-pressed:bg-accent/10 aria-pressed:text-foreground"
          >
            {t("dataQuality.entities.toggleGranularity", "Group broadly")}
          </button>
        </div>
      </div>
      <BreakdownBar
        items={items}
        labelWidth={180}
        tooltipLabel={t("dataQuality.entities.sectorTooltip", "People")}
      />
    </div>
  );
}
