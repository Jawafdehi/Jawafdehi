import { FileCheck2, FileSearch, Handshake, Scale, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

type CoreValue = {
  key: "integrity" | "transparency" | "accuracy" | "publicService";
  icon: LucideIcon;
};

const coreValues: CoreValue[] = [
  { key: "integrity", icon: Scale },
  { key: "transparency", icon: FileSearch },
  { key: "accuracy", icon: FileCheck2 },
  { key: "publicService", icon: Handshake },
];

export function CoreValues() {
  const { t } = useTranslation();

  return (
    <section id="values" className="bg-muted/20 pt-10 pb-12 md:pt-12 md:pb-14">
      <div className="layout-container">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            {t("about.values.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-foreground/70">
            {t("about.values.description")}
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 lg:grid-cols-4 lg:gap-10">
          {coreValues.map(({ key, icon: Icon }) => (
            <div key={key} className="mx-auto flex max-w-[15rem] flex-col items-center text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.07] text-primary">
                <Icon aria-hidden="true" className="h-10 w-10" strokeWidth={1.45} />
              </div>
              <h3 className="mb-2 text-lg font-bold leading-tight text-foreground">
                {t(`about.values.${key}.title`)}
              </h3>
              <p className="text-sm leading-6 text-foreground/70">
                {t(`about.values.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
