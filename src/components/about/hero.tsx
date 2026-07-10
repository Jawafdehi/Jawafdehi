import { useTranslation } from "react-i18next";

import { PageHero } from "@/components/ui/page-hero";

export function AboutHero() {
  const { t } = useTranslation();

  return (
    <PageHero
      id="about-hero"
      contentClassName="min-h-[42svh] py-12 md:min-h-[44svh] md:py-14 lg:py-16"
      contentWrapperClassName="max-w-6xl"
      title={
        <>
          {t("about.hero.prefix")}{" "}
          <span className="text-accent sm:whitespace-nowrap">
            {t("about.hero.valuesStart")}{" "}
            <span className="text-primary">
              {t("about.hero.valuesConnector")}
            </span>{" "}
            {t("about.hero.valuesEnd")}
          </span>
          <span className="block text-primary">
            {t("about.hero.suffix")}
          </span>
        </>
      }
    />
  );
}
