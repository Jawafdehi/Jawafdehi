import { Download, ExternalLink, FileText } from "@/components/icons";
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
      className="group flex items-center gap-4 rounded-[22px] bg-muted p-5 transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.07] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[17px] text-primary">{label}</span>
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
    <section id="download" aria-labelledby="press-kit-download-title">
      <div className="layout-container">
        <h2 id="press-kit-download-title" className="sr-only">
          {t("pressKit.download.title")}
        </h2>

        {/* Straight under the hero: what most visitors came for. */}
        <div className="grid gap-3 md:grid-cols-3">
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
