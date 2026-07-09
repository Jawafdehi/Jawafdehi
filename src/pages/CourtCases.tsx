import { useTranslation } from "react-i18next";

import ArchiveSearch from "./ArchiveSearch";

// Data-lake court cases browse page — a single-type view of the unified archive search
// pinned to the `courtcase` type (Supreme, Special, High, District court records).
export default function CourtCases() {
  const { t } = useTranslation();
  return (
    <ArchiveSearch
      lockedType="courtcase"
      heading={t("courtCasesPage.heading", "Court cases")}
      description={t(
        "courtCasesPage.description",
        "Browse court cases from Nepal's judiciary in the Jawafdehi governance archive — listings, hearings, and orders harvested from public court records.",
      )}
      placeholder={t("courtCasesPage.placeholder", "Search court cases")}
      canonicalPath="/courtcases"
    />
  );
}
