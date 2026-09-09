import { useTranslation } from "react-i18next";

import { MaterialCard } from "@/components/materials/MaterialCard";
import { getMaterialSourceLinks } from "@/lib/material-links";
import {
  formatLedgerDate,
  pickLocalized,
  resolveMaterialDate,
} from "@/lib/materials-landing";
import { materialTail } from "@/services/datalake-api";
import { SITE_URL } from "@/utils/seo";

import type { MaterialSeries } from "@/data/material-series";
import type { Material } from "@/services/datalake-api";

function materialName(material: Material, language: string): string {
  if (typeof material.name === "string") return material.name;
  return pickLocalized(material.name, language);
}

/**
 * One series-browse row: maps a full data-lake Material (JSON-LD record) onto
 * the shared <MaterialCard>. This surface has the complete record, so it fills
 * the download/source links the search index cannot.
 */
export function MaterialListCard({
  material,
  series,
}: Readonly<{
  material: Material;
  series: MaterialSeries;
}>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const title =
    materialName(material, language) ||
    t("materialsLanding.recent.untitled", "Untitled document");
  const date = resolveMaterialDate({
    date: material.datePublished || material.dateCreated,
  });
  const dateLabel =
    formatLedgerDate(date, language) ||
    t("materialsLanding.series.undated", "Undated");
  const detailsPath = `/material/${materialTail(material["@id"])}`;

  return (
    <li>
      <MaterialCard
        title={title}
        href={detailsPath}
        metaLine={`${pickLocalized(series.typeLabel, language)} · ${dateLabel}`}
        links={getMaterialSourceLinks(material)}
        shareUrl={`${SITE_URL}${detailsPath}`}
      />
    </li>
  );
}
