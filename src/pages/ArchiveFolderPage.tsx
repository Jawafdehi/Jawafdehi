import { useTranslation } from "react-i18next";

import Seo from "@/components/Seo";
import { ArchiveFolders } from "@/components/materials/ArchiveFolders";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

/** /materials/?folder=<path>: one folder or office of the archive tree. */
export default function ArchiveFolderPage({ path }: Readonly<{ path: string[] }>) {
  const { t, i18n } = useTranslation();
  return (
    <div className="layout-container py-12 md:py-16">
      <Seo
        title={`${t("materialsPage.heading", "Documents & other materials")} | ${SITE_NAME}`}
        description={t("materialsPage.description", "")}
        canonicalUrl={`${SITE_URL}/materials/?folder=${path.join("/")}`}
        language={i18n.language}
        robots="noindex, follow"
      />
      <ArchiveFolders path={path} />
    </div>
  );
}
