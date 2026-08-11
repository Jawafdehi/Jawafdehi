import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { FileDown, Mail, ShieldAlert } from "lucide-react";
import { FaFacebook, FaLinkedin, FaWhatsapp, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { SiLinktree } from "react-icons/si";

import { CaseReportForm } from "@/components/CaseReportForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JAWAFDEHI_SOCIALS, JAWAFDEHI_WHATSAPP_NUMBER } from "@/config/constants";

const PAGE_URL = "https://jawafdehi.org/report";
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

  const socialChannels: Channel[] = [
    { label: t("footer.social.facebook"), href: JAWAFDEHI_SOCIALS.facebook, icon: FaFacebook },
    { label: t("footer.social.x"), href: JAWAFDEHI_SOCIALS.x, icon: FaXTwitter },
    { label: t("footer.social.youtube"), href: JAWAFDEHI_SOCIALS.youtube, icon: FaYoutube },
    { label: t("footer.social.linkedin"), href: JAWAFDEHI_SOCIALS.linkedin, icon: FaLinkedin },
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
  return (
    <div className="bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://jawafdehi.org/assets/social-preview.png" />
      </Helmet>

      <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
        <header className="mb-8 space-y-3">
          <h1 className="text-3xl font-extrabold tracking-normal text-primary md:text-4xl">
            {t("report.title")}
          </h1>
          <p className="text-base leading-7 text-foreground/70">{t("report.description")}</p>
        </header>

        {/* Safety guidance sits above the form deliberately: someone about to
            describe a live case should read it before they start typing. */}
        <section
          aria-labelledby="report-safety-heading"
          className="mb-8 rounded-2xl border border-accent/20 bg-accent/[0.06] p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <div className="space-y-3">
              <h2 id="report-safety-heading" className="text-base font-bold text-accent">
                {t("report.page.safetyTitle")}
              </h2>
              <p className="text-sm leading-6 text-foreground/75">{t("report.page.safetyIntro")}</p>
              <ul className="space-y-2 text-sm leading-6 text-foreground/75">
                {safetyPoints.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">{t("report.page.formTitle")}</CardTitle>
            <CardDescription className="text-base">{t("report.page.formDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <CaseReportForm />
          </CardContent>
        </Card>

        <section aria-labelledby="report-channels-heading" className="mb-8 space-y-5">
          <div className="space-y-2">
            <h2 id="report-channels-heading" className="text-2xl font-bold text-primary">
              {t("report.page.channelsTitle")}
            </h2>
            <p className="text-sm leading-6 text-foreground/70">{t("report.page.channelsDescription")}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={`mailto:${REPORT_EMAIL}`}
              className="group flex min-h-14 items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors group-hover:bg-accent">
                <Mail className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("report.page.emailLabel")}
                </span>
                <span className="block truncate text-sm font-semibold text-primary">{REPORT_EMAIL}</span>
              </span>
            </a>

            <a
              href={JAWAFDEHI_SOCIALS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-14 items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white transition-colors group-hover:bg-[#1fbd59]">
                <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("report.page.whatsappLabel")}
                </span>
                <span className="block truncate text-sm font-semibold text-primary">
                  {JAWAFDEHI_WHATSAPP_NUMBER}
                </span>
              </span>
            </a>
          </div>

          <div className="space-y-3 rounded-2xl bg-muted/45 p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">{t("report.page.socialTitle")}</h3>
              <p className="text-xs leading-5 text-muted-foreground">{t("report.page.socialDescription")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {socialChannels.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border/70 bg-background px-4 text-sm font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="report-templates-heading"
          className="flex flex-col gap-3 rounded-2xl bg-muted/45 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-1">
            <h2 id="report-templates-heading" className="text-sm font-bold text-foreground">
              {t("report.templateDownload.title")}
            </h2>
            <p className="text-xs leading-5 text-muted-foreground">{t("report.page.templatesDescription")}</p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <a
              href="/case-entry-template/case-entry-template.docx"
              download
              className="inline-flex h-9 min-w-20 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-bold tracking-wide text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
              {t("report.templateDownload.downloadDocx")}
            </a>
            <a
              href="/case-entry-template/case-entry-template.md"
              download
              className="inline-flex h-9 min-w-20 items-center justify-center gap-1.5 rounded-md bg-accent px-3 text-xs font-bold tracking-wide text-accent-foreground shadow-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
              {t("report.templateDownload.downloadMd")}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
