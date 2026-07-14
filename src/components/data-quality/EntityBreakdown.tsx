import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { EntityMetrics } from "@/types/jds";
import { institutionGroups, personCount } from "@/lib/entity-type-labels";
import {
  entityFilterForGroup,
  entityTypeSearchHref,
} from "@/lib/entity-filter-links";
import { personSectorKey } from "@/lib/person-sector-labels";
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
  const groups = institutionGroups(nes.by_type).map((g) => ({
    key: g.key,
    label: t(`dataQuality.entities.group.${g.key}`, g.key),
    count: g.count,
  }));
  // Drill-down link per bar, keyed by the (translated) label the bar carries.
  const hrefByLabel = new Map<string, string>();
  for (const g of groups) {
    const href = entityFilterForGroup(g.key);
    if (href) hrefByLabel.set(g.label, href);
  }

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
      <Link
        to={entityTypeSearchHref(["Person"])}
        className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
      >
        {t("dataQuality.entities.browsePeople", "Browse all people")} →
      </Link>

      {groups.length > 0 && (
        <>
          <p className="mt-6 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("dataQuality.entities.institutionsLabel", "Institutions we track")}
          </p>
          <BreakdownBar
            items={groups}
            tooltipLabel={t("dataQuality.entities.tooltip", "Entities")}
            hrefFor={(item) => hrefByLabel.get(item.label)}
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
 * the institutions bar), never an area chart. Renders nothing until the field
 * is present.
 */
function PersonsBySector({
  sectors,
}: {
  sectors?: EntityMetrics["persons_by_sector"];
}) {
  const { t } = useTranslation();

  if (!sectors?.length) return null;

  const items = sectors.map((s) => ({
    label: t(`dataQuality.entities.sector.${personSectorKey(s.sector)}`, s.sector),
    count: s.count,
  }));

  if (!items.length) return null;

  return (
    <div className="mt-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("dataQuality.entities.sectorHeading", "What positions the people hold")}
      </p>
      <BreakdownBar
        items={items}
        labelWidth={180}
        tooltipLabel={t("dataQuality.entities.sectorTooltip", "People")}
      />
    </div>
  );
}
