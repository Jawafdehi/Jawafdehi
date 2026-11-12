import { useTranslation } from "react-i18next";

import { LightHero } from "@/components/ui/light-hero";

export function PressKitHero() {
  const { t } = useTranslation();

  return (
    <LightHero
      id="press-kit-hero"
      eyebrow={t("pressKit.hero.eyebrow")}
      description={t("pressKit.hero.description")}
      title={
        <>
          {t("pressKit.hero.title")} <span className="text-accent">{t("pressKit.hero.titleAccent")}</span>
        </>
      }
    />
  );
}
