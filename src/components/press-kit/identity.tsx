import { useTranslation } from "react-i18next";

import { PRESS_KIT_DESCRIPTORS, PRESS_KIT_NAMES } from "./constants";

function Descriptor({ label, text }: Readonly<{ label: string; text: string }>) {
  return (
    <div>
      <p className="text-sm font-bold text-primary">{label}</p>
      <blockquote className="mt-1 border-l-2 border-accent bg-muted/20 py-2 pl-4 pr-3 font-paragraph font-paragraph-foreground">
        {text}
      </blockquote>
    </div>
  );
}

export function PressKitIdentity() {
  const { t } = useTranslation();

  return (
    <section id="identity" className="py-12 md:py-16">
      <div className="layout-container">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-extrabold tracking-normal text-accent md:text-3xl">
              {t("pressKit.name.title")}
            </h2>

            <p className="font-paragraph font-paragraph-foreground">
              {t("pressKit.name.body")}
            </p>

            <dl className="mt-5 rounded-lg border border-border bg-background p-4">
              <dt className="text-sm font-bold text-primary">
                {t("pressKit.name.registeredLabel")}
              </dt>
              <dd className="mt-1 font-paragraph font-paragraph-foreground">
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
            <h2 className="mb-4 text-2xl font-extrabold tracking-normal text-accent md:text-3xl">
              {t("pressKit.descriptor.title")}
            </h2>

            <p className="mb-5 font-paragraph font-paragraph-foreground">
              {t("pressKit.descriptor.intro")}
            </p>

            <div className="space-y-4">
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
