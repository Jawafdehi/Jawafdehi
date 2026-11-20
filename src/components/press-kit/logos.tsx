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
    <figure className="flex flex-col rounded-[28px] border border-border/70 bg-surface p-2">
      <div
        // Both preview fields must hold their lightness in BOTH themes: each one
        // demonstrates a wordmark that disappears against the opposite field, so
        // a token that flips would reproduce the exact failure this page warns
        // newsrooms about.
        //
        // Dark: --primary-surface, the *fill* role, which stays navy in .dark.
        // NOT --primary, which becomes light ink there (see Footer.tsx).
        //
        // Light: a literal. --background and --card both alias --base-paper,
        // which .dark redefines to 217 42% 6% — near-black. There is no
        // always-light token, and #FAFAF7 is the documented page background.
        className={
          dark
            ? "flex min-h-[180px] flex-1 items-center justify-center rounded-[22px] bg-primary-surface p-8"
            : "flex min-h-[180px] flex-1 items-center justify-center rounded-[22px] bg-[#FAFAF7] p-8"
        }
      >
        <img
          src={src}
          alt={alt}
          className={dark ? "max-h-20 w-auto max-w-full" : "max-h-24 w-auto max-w-full"}
          loading="lazy"
        />
      </div>

      <figcaption className="px-4 pb-4 pt-5">
        <p className="text-[17px] text-primary">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{use}</p>

        <p className="mt-4 flex flex-wrap gap-2">
          {downloads.map((file) => (
            <a
              key={file.href}
              href={file.href}
              download
              className="rounded-full bg-muted px-3.5 py-1.5 text-sm text-primary transition-colors hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
    <section id="logo" className="pt-16 md:pt-24">
      <div className="layout-container">
        <h2 className="font-home-section-title text-primary">{t("pressKit.logo.title")}</h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{t("pressKit.logo.intro")}</p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
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
