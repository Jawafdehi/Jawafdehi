import { useTranslation } from "react-i18next";

import { PRESS_KIT_LOGOS } from "./constants";

type LogoCardProps = {
  src: string;
  alt: string;
  label: string;
  use: string;
  /** The off-white wordmark needs a navy field or it vanishes. */
  dark?: boolean;
  downloads: ReadonlyArray<{ href: string; label: string }>;
};

function LogoCard({ src, alt, label, use, dark, downloads }: Readonly<LogoCardProps>) {
  return (
    <figure className="flex flex-col overflow-hidden rounded-lg border border-border bg-background">
      <div
        className={
          dark
            ? "flex min-h-[150px] flex-1 items-center justify-center bg-primary p-8"
            : "flex min-h-[150px] flex-1 items-center justify-center bg-[#FAFAF7] p-8"
        }
      >
        <img
          src={src}
          alt={alt}
          className={dark ? "max-h-20 w-auto max-w-full" : "max-h-24 w-auto max-w-full"}
          loading="lazy"
        />
      </div>

      <figcaption className="border-t border-border p-4">
        <p className="font-bold text-primary">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{use}</p>

        <p className="mt-3 flex flex-wrap gap-2">
          {downloads.map((file) => (
            <a
              key={file.href}
              href={file.href}
              download
              className="rounded border border-primary px-2.5 py-1 text-xs font-bold text-primary transition-colors hover:bg-accent hover:border-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {file.label}
            </a>
          ))}
        </p>
      </figcaption>
    </figure>
  );
}

export function PressKitLogos() {
  const { t } = useTranslation();

  return (
    <section id="logo" className="py-12 md:py-16">
      <div className="layout-container">
        <h2 className="mb-3 text-center text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
          {t("pressKit.logo.title")}
        </h2>
        <p className="mx-auto mb-8 max-w-3xl text-center font-paragraph font-paragraph-foreground">
          {t("pressKit.logo.intro")}
        </p>

        <div className="grid gap-5 md:grid-cols-3">
          <LogoCard
            src={PRESS_KIT_LOGOS.navyPng}
            alt={t("pressKit.logo.navyLabel")}
            label={t("pressKit.logo.navyLabel")}
            use={t("pressKit.logo.navyUse")}
            downloads={[
              { href: PRESS_KIT_LOGOS.navyPng, label: t("pressKit.logo.downloadPng") },
              { href: PRESS_KIT_LOGOS.navySvg, label: t("pressKit.logo.downloadSvg") },
            ]}
          />

          <LogoCard
            dark
            src={PRESS_KIT_LOGOS.whitePng}
            alt={t("pressKit.logo.whiteLabel")}
            label={t("pressKit.logo.whiteLabel")}
            use={t("pressKit.logo.whiteUse")}
            downloads={[
              { href: PRESS_KIT_LOGOS.whitePng, label: t("pressKit.logo.downloadPng") },
              { href: PRESS_KIT_LOGOS.whiteSvg, label: t("pressKit.logo.downloadSvg") },
            ]}
          />

          <LogoCard
            /* Display the transparent variant: the on-white PNG shows as a
               bright square against the warm-white card field. */
            src={PRESS_KIT_LOGOS.markTransparentPng}
            alt={t("pressKit.logo.markLabel")}
            label={t("pressKit.logo.markLabel")}
            use={t("pressKit.logo.markUse")}
            downloads={[
              { href: PRESS_KIT_LOGOS.markPng, label: t("pressKit.logo.downloadPng") },
              {
                href: PRESS_KIT_LOGOS.markTransparentPng,
                label: t("pressKit.logo.transparent"),
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
