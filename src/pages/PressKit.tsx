import { useTranslation } from "react-i18next";

import { Seo } from "@/components/Seo";
import { PressKitBrand } from "@/components/press-kit/brand";
import { PressKitDownloads } from "@/components/press-kit/downloads";
import { PressKitHero } from "@/components/press-kit/hero";
import { PressKitIdentity } from "@/components/press-kit/identity";
import { PressKitLogos } from "@/components/press-kit/logos";
import { PressKitUsage } from "@/components/press-kit/usage";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

const PressKit = () => {
  const { t, i18n } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`${t("pressKit.meta.title")} | ${SITE_NAME}`}
        description={t("pressKit.meta.description")}
        canonicalUrl={`${SITE_URL}/press-kit/`}
        language={i18n.language}
      />

      <main id="main-content" className="flex-1">
        <PressKitHero />

        <PressKitDownloads />

        <PressKitIdentity />

        <PressKitLogos />

        <PressKitBrand />

        <PressKitUsage />
      </main>
    </div>
  );
};

export default PressKit;
