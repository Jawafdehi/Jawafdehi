import { useTranslation } from "react-i18next";

import { PageHero } from "@/components/ui/page-hero";

export function PressKitHero() {
  const { t } = useTranslation();

  return (
    <PageHero
      id="press-kit-hero"
      eyebrow={t("pressKit.hero.eyebrow")}
      description={t("pressKit.hero.description")}
      descriptionClassName="max-w-3xl"
      title={
        <>
          {t("pressKit.hero.title")}{" "}
          <span className="text-accent">{t("pressKit.hero.titleAccent")}</span>
        </>
      }
    />
  );
}
