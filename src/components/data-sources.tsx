import { Mic2, Youtube } from "lucide-react";
import type { ElementType } from "react";
import { useTranslation } from "react-i18next";
import { BsCameraReelsFill } from "react-icons/bs";
import { FaEye } from "react-icons/fa";

type ExternalSource = {
  key: string;
  icon?: ElementType;
  imageSrc?: string;
};

// Icons/logos live in code; the labels and descriptions come from i18n
// under ourProcess.sources.items.*
const EXTERNAL_SOURCES: ExternalSource[] = [
  { key: "ciaa", imageSrc: "/assets/ciaa.png" },
  { key: "cib", imageSrc: "/assets/cib.png" },
  { key: "media", icon: BsCameraReelsFill },
  { key: "journalists", icon: Mic2 },
  { key: "watchdogs", icon: FaEye },
  { key: "creators", icon: Youtube },
];

export function DataSources() {
  const { t } = useTranslation();

  return (
    <section id="data-sources" className="bg-background py-14 md:py-20">
      <div className="layout-container">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {t("ourProcess.sources.heading")}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {t("ourProcess.sources.description")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          {EXTERNAL_SOURCES.map(({ icon: Icon, imageSrc, key }) => (
            <div
              key={key}
              className="group flex flex-col items-center text-center"
            >
              <div className="mb-4 flex h-16 items-center justify-center">
                {imageSrc && (
                  <img
                    src={imageSrc}
                    alt=""
                    aria-hidden="true"
                    className="h-14 w-auto object-contain opacity-85 transition duration-300 group-hover:-translate-y-1 group-hover:opacity-100"
                  />
                )}
                {!imageSrc && Icon && (
                  <Icon
                    className="h-11 w-11 text-primary opacity-85 transition duration-300 group-hover:-translate-y-1 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                )}
              </div>

              <h3 className="text-base font-bold leading-tight text-foreground">
                {t(`ourProcess.sources.items.${key}.label`)}
              </h3>

              <p className="mt-2 max-w-[180px] text-sm leading-5 text-muted-foreground">
                {t(`ourProcess.sources.items.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
