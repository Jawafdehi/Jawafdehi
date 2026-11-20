import { useTranslation } from "react-i18next";

import { PRESS_KIT_DESCRIPTORS, PRESS_KIT_NAMES } from "./constants";

function Descriptor({ label, text }: Readonly<{ label: string; text: string }>) {
  return (
    <div className="rounded-[22px] bg-muted p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <blockquote className="mt-2 text-[17px] leading-7 text-primary">{text}</blockquote>
    </div>
  );
}

export function PressKitIdentity() {
  const { t } = useTranslation();

  return (
    <section id="identity" className="pt-16 md:pt-24">
      <div className="layout-container">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-home-section-title text-primary">{t("pressKit.name.title")}</h2>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
              {t("pressKit.name.body")}
            </p>

            <dl className="mt-6 rounded-[22px] border border-border/70 bg-surface p-5">
              <dt className="text-sm text-muted-foreground">
                {t("pressKit.name.registeredLabel")}
              </dt>
              <dd className="mt-2 text-xl text-primary">
                {PRESS_KIT_NAMES.latin}
                <span className="mx-2 text-muted-foreground">·</span>
                {PRESS_KIT_NAMES.devanagari}
              </dd>
            </dl>

            <p className="mt-4 text-sm text-muted-foreground">
              {t("pressKit.name.spelling")}
            </p>
          </div>

          <div>
            <h2 className="font-home-section-title text-primary">{t("pressKit.descriptor.title")}</h2>

            <p className="mb-6 mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
              {t("pressKit.descriptor.intro")}
            </p>

            <div className="space-y-3">
              <Descriptor
                label={t("pressKit.descriptor.nepaliLabel")}
                text={PRESS_KIT_DESCRIPTORS.nepali}
              />
              <Descriptor
                label={t("pressKit.descriptor.longLabel")}
                text={PRESS_KIT_DESCRIPTORS.long}
              />
              <Descriptor
                label={t("pressKit.descriptor.mediumLabel")}
                text={PRESS_KIT_DESCRIPTORS.medium}
              />
              <Descriptor
                label={t("pressKit.descriptor.shortLabel")}
                text={PRESS_KIT_DESCRIPTORS.short}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
