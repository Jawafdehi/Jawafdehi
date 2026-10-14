import { Download, ExternalLink, FileText } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";

import { PRESS_KIT_FILES } from "./constants";

type DownloadCardProps = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  meta: string;
  /** External links open in a new tab; same-origin files download in place. */
  external?: boolean;
};

function DownloadCard({ href, icon: Icon, label, meta, external }: Readonly<DownloadCardProps>) {
  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : { download: true };

  return (
    <a
      href={href}
      {...linkProps}
      className="group flex items-center gap-4 rounded-lg border border-border bg-background p-5 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary transition-colors group-hover:bg-accent/10 group-hover:text-accent">
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-bold text-primary">{label}</span>
        <span className="block text-sm text-muted-foreground">{meta}</span>
      </span>

      {external ? (
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      ) : (
        <Download className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
    </a>
  );
}

export function PressKitDownloads() {
  const { t } = useTranslation();

  return (
    <section id="download" className="bg-muted/10 py-12 md:py-16">
      <div className="layout-container">
        <h2 className="mb-8 text-center text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
          {t("pressKit.download.title")}
        </h2>

        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
          <DownloadCard
            href={PRESS_KIT_FILES.zip}
            icon={Download}
            label={t("pressKit.download.zipLabel")}
            meta={t("pressKit.download.zipMeta")}
          />
          <DownloadCard
            href={PRESS_KIT_FILES.pdf}
            icon={FileText}
            label={t("pressKit.download.pdfLabel")}
            meta={t("pressKit.download.pdfMeta")}
          />
          <DownloadCard
            href={PRESS_KIT_FILES.faq}
            icon={ExternalLink}
            label={t("pressKit.download.faqLabel")}
            meta={t("pressKit.download.faqMeta")}
            external
          />
        </div>
      </div>
    </section>
  );
}
