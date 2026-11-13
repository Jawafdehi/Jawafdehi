import { FileCheck2, FileSearch, Handshake, Scale, type IconComponent } from "@/components/icons";
import { useTranslation } from "react-i18next";

import { Panel } from "@/components/ui/panel";

type CoreValue = {
  key: "integrity" | "transparency" | "accuracy" | "publicService";
  icon: IconComponent;
};

const coreValues: CoreValue[] = [
  { key: "integrity", icon: Scale },
  { key: "transparency", icon: FileSearch },
  { key: "accuracy", icon: FileCheck2 },
  { key: "publicService", icon: Handshake },
];

export function CoreValues() {
  const { t } = useTranslation();

  // The redesign's grey panels, the icon in a white disc (as on /volunteer).
  return (
    <section id="values" aria-labelledby="values-title" className="pb-20 pt-4 md:pb-28">
      <div className="layout-container">
        <h2 id="values-title" className="font-home-section-title text-primary">
          {t("about.values.title")}
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{t("about.values.description")}</p>

        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {coreValues.map(({ key, icon: Icon }) => (
            <li key={key}>
              <Panel className="min-h-[15rem]">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-primary">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3 className="mt-auto pt-8 text-xl font-normal leading-snug text-primary">
                  {t(`about.values.${key}.title`)}
                </h3>
                <p className="mt-2 text-base leading-7 text-muted-foreground">{t(`about.values.${key}.description`)}</p>
              </Panel>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
