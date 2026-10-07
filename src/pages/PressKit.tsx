import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

import { PressKitBrand } from "@/components/press-kit/brand";
import { PressKitDownloads } from "@/components/press-kit/downloads";
import { PressKitHero } from "@/components/press-kit/hero";
import { PressKitIdentity } from "@/components/press-kit/identity";
import { PressKitLogos } from "@/components/press-kit/logos";
import { PressKitUsage } from "@/components/press-kit/usage";

const PressKit = () => {
  const { t } = useTranslation();

  const title = t("pressKit.meta.title");
  const description = t("pressKit.meta.description");
  const url = "https://jawafdehi.org/press-kit";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://jawafdehi.org/assets/social-preview.png" />
      </Helmet>

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
