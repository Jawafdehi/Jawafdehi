import { Mic2, Youtube } from "@/components/icons";
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
  { key: "ciaa", imageSrc: "/assets/ciaa.webp" },
  { key: "cib", imageSrc: "/assets/cib.webp" },
  { key: "media", icon: BsCameraReelsFill },
  { key: "journalists", icon: Mic2 },
  { key: "watchdogs", icon: FaEye },
  { key: "creators", icon: Youtube },
];

export function DataSources() {
  const { t } = useTranslation();

  return (
    <section id="data-sources" aria-labelledby="data-sources-title" className="pb-20 md:pb-28">
      <div className="layout-container">
        <h2 id="data-sources-title" className="font-home-section-title text-primary">
          {t("ourProcess.sources.heading")}
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{t("ourProcess.sources.description")}</p>

        {/* Each source as a grey tile: its mark, its name, one line. */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {EXTERNAL_SOURCES.map(({ icon: Icon, imageSrc, key }) => (
            <div
              key={key}
              className="group flex flex-col rounded-[22px] bg-muted p-5"
            >
              <div className="mb-6 flex h-14 items-center">
                {imageSrc && (
                  <img
                    src={imageSrc}
                    alt=""
                    aria-hidden="true"
                    // 56 CSS px tall (h-14) at DPR 4.5 = the 336x252 the
                    // generated logos are sized for; w-auto keeps the aspect.
                    width={336}
                    height={252}
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-auto object-contain"
                  />
                )}
                {!imageSrc && Icon && (
                  <Icon
                    className="h-10 w-10 text-primary"
                    aria-hidden="true"
                  />
                )}
              </div>

              <h3 className="mt-auto text-[17px] font-normal leading-snug text-primary">
                {t(`ourProcess.sources.items.${key}.label`)}
              </h3>

              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {t(`ourProcess.sources.items.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
