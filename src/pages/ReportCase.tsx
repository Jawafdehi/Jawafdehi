import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { FileDown, Mail, ShieldAlert } from "@/components/icons";
import { FaDiscord, FaFacebook, FaInstagram, FaLinkedin, FaWhatsapp, FaYoutube } from "react-icons/fa";
import { FaTiktok, FaXTwitter } from "react-icons/fa6";
import { SiLinktree } from "react-icons/si";

import { CaseReportForm } from "@/components/CaseReportForm";
import { Seo } from "@/components/Seo";
import { LightHero } from "@/components/ui/light-hero";
import { JAWAFDEHI_SOCIALS, JAWAFDEHI_WHATSAPP_NUMBER } from "@/config/constants";
import { SITE_URL } from "@/utils/seo";

const PAGE_URL = `${SITE_URL}/report/`;
const REPORT_EMAIL = "report@jawafdehi.org";

type Channel = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export default function ReportCase() {
  const { t } = useTranslation();

  const title = t("report.page.metaTitle");
  const description = t("report.page.metaDescription");

  // Every channel except WhatsApp, which gets its own card above because it is
  // the one people actually send tip-offs to. Mirrors the footer list.
  const socialChannels: Channel[] = [
    { label: t("footer.social.facebook"), href: JAWAFDEHI_SOCIALS.facebook, icon: FaFacebook },
    { label: t("footer.social.x"), href: JAWAFDEHI_SOCIALS.x, icon: FaXTwitter },
    { label: t("footer.social.instagram"), href: JAWAFDEHI_SOCIALS.instagram, icon: FaInstagram },
    { label: t("footer.social.tiktok"), href: JAWAFDEHI_SOCIALS.tiktok, icon: FaTiktok },
    { label: t("footer.social.youtube"), href: JAWAFDEHI_SOCIALS.youtube, icon: FaYoutube },
    { label: t("footer.social.linkedin"), href: JAWAFDEHI_SOCIALS.linkedin, icon: FaLinkedin },
    { label: t("footer.social.discord"), href: JAWAFDEHI_SOCIALS.discord, icon: FaDiscord },
    { label: t("footer.social.linktree"), href: JAWAFDEHI_SOCIALS.linktree, icon: SiLinktree },
  ];

  const safetyPoints = [
    t("report.page.safetyPoint1"),
    t("report.page.safetyPoint2"),
    t("report.page.safetyPoint3"),
    t("report.page.safetyPoint4"),
  ];

  // No <main> wrapper here: AppLayout already renders one around <Outlet />.
  // Most sibling pages nest a second <main id="main-content"> inside it, which
  // duplicates the id the skip link targets — this page does not repeat that.
  const pill =
    "inline-flex min-h-11 items-center gap-2 rounded-full bg-muted px-4 text-[15px] text-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100";

  return (
    <div className="bg-background">
      <Seo title={title} description={description} canonicalUrl={PAGE_URL} />

      <LightHero
        id="report-title"
        shader={false}
        eyebrow={t("report.page.eyebrow", "Report")}
        title={t("report.title")}
        description={t("report.description")}
      />

      {/* What to read first, the other ways to reach us and the templates come
          FIRST in the document, so a screen reader and the Tab key meet the
          safety guidance before the form, as a phone shows it; a desktop
          places them in a sticky right column (scrolling within itself when
          taller than the window) beside the form in its hairline card. */}
      <div className="layout-container grid grid-cols-1 items-start gap-10 pb-20 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">

        <aside className="min-w-0 space-y-8 lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:thin]">
          <section aria-labelledby="report-safety-heading" className="rounded-[24px] bg-muted/60 p-6">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <h2 id="report-safety-heading" className="text-lg text-primary">
                {t("report.page.safetyTitle")}
              </h2>
            </div>
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{t("report.page.safetyIntro")}</p>
            <ul className="mt-4 space-y-3 text-[15px] leading-7 text-primary/85">
              {safetyPoints.map((point) => (
                <li key={point} className="flex gap-3">
                  <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="report-channels-heading">
            <h2 id="report-channels-heading" className="text-lg text-primary">
              {t("report.page.channelsTitle")}
            </h2>
            <p className="mt-1.5 text-[15px] leading-7 text-muted-foreground">{t("report.page.channelsDescription")}</p>
            <div className="mt-4 grid gap-2">
              <a href={`mailto:${REPORT_EMAIL}`} className={pill}>
                <Mail className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                <span className="sr-only">{t("report.page.emailLabel")}: </span>
                <span className="truncate">{REPORT_EMAIL}</span>
              </a>
              <a href={JAWAFDEHI_SOCIALS.whatsapp} target="_blank" rel="noopener noreferrer" className={pill}>
                <FaWhatsapp className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                <span className="sr-only">{t("report.page.whatsappLabel")}: </span>
                <span className="tabular-nums">{JAWAFDEHI_WHATSAPP_NUMBER}</span>
              </a>
            </div>
            <h3 className="mt-6 text-[15px] text-muted-foreground">{t("report.page.socialTitle")}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {socialChannels.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>

          <section aria-labelledby="report-templates-heading" className="border-t border-border/70 pt-6">
            <h2 id="report-templates-heading" className="text-lg text-primary">
              {t("report.templateDownload.title")}
            </h2>
            <p className="mt-1.5 text-[15px] leading-7 text-muted-foreground">{t("report.page.templatesDescription")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/case-entry-template/case-entry-template.docx" download className={pill}>
                <FileDown className="h-[18px] w-[18px]" aria-hidden="true" />
                {t("report.templateDownload.downloadDocx")}
              </a>
              <a href="/case-entry-template/case-entry-template.md" download className={pill}>
                <FileDown className="h-[18px] w-[18px]" aria-hidden="true" />
                {t("report.templateDownload.downloadMd")}
              </a>
            </div>
          </section>
        </aside>

        <section
          aria-labelledby="report-form-heading"
          className="min-w-0 rounded-[24px] border border-border/70 bg-surface p-6 sm:p-8 lg:col-start-1 lg:row-start-1 lg:p-10"
        >
          <h2 id="report-form-heading" className="font-home-display text-3xl text-primary md:text-4xl">
            {t("report.page.formTitle")}
          </h2>
          <p className="mt-3 max-w-xl text-lg leading-8 text-muted-foreground">{t("report.page.formDescription")}</p>
          <div className="mt-8">
            <CaseReportForm />
          </div>
        </section>
      </div>
    </div>
  );
}
