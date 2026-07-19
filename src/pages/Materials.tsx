import { useTranslation } from "react-i18next";

import ArchiveSearch from "./ArchiveSearch";

// Data-lake governance materials browse page — a single-type view of the unified
// archive search (faceted, sorted, bilingual), pinned to the `material` type.
export default function Materials() {
  const { t } = useTranslation();
  return (
    <ArchiveSearch
      lockedType="material"
      heading={t("materialsPage.heading", "Documents & other materials")}
      description={t(
        "materialsPage.description",
        "Browse public government records and documents in the Jawafdehi archive — development projects, agency publications, and official materials.",
      )}
      placeholder={t("materialsPage.placeholder", "Search documents & other materials")}
      canonicalPath="/materials"
    />
  );
}
