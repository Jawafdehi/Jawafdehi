import { useTranslation } from "react-i18next";

import type { EntityMetrics } from "@/types/jds";
import { institutionGroups, personCount } from "@/lib/entity-type-labels";
import { BreakdownBar } from "./BreakdownBar";

/**
 * "Who we hold to account." Of the 184k tracked entities, ~88% are individual
 * people, so that fact leads as a sentence; the bar then breaks down the
 * remaining institutions (hospitals, government offices, local governments...)
 * with the raw schema tokens mapped to plain labels.
 *
 * Reads live nes.by_type from /api/statistics/ (no mock).
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
    </section>
  );
}
