import { ArrowUpRight, Github, Mail } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { FaDiscord } from "react-icons/fa";

import { FeedbackForm } from "@/components/FeedbackForm";
import { Seo } from "@/components/Seo";
import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { LightHero } from "@/components/ui/light-hero";
import { JAWAFDEHI_SOCIALS } from "@/config/constants";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

const OTHER_WAYS = [
  { key: "email", href: "mailto:report@jawafdehi.org", Icon: Mail, external: false },
  { key: "discord", href: JAWAFDEHI_SOCIALS.discord, Icon: FaDiscord, external: true },
  { key: "github", href: "https://github.com/Jawafdehi/Jawafdehi/issues", Icon: Github, external: true },
] as const;

/**
 * Feedback in the site's light page shape: the light hero, the form in one
 * hairline card, and beside it a grey panel with the other ways to reach the
 * team, for anything a form is the wrong place for.
 */
export default function Feedback() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`Submit Feedback | ${SITE_NAME}`}
        description="Share your feedback, suggestions, or corrections with the Jawafdehi team to help improve Nepal's corruption accountability platform."
        canonicalUrl={`${SITE_URL}/feedback/`}
      />

      {/* The archive's dither field behind the whole page, not just its
          heading: it fades in from the top right and the form and the other
          ways to reach us sit on it as white cards. */}
      <main id="main-content" className="relative isolate flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_90%_80%_at_85%_10%,#000_20%,transparent_75%)]"
        >
          <ShaderBackdrop design="diamondLight" />
        </div>
        <LightHero
          shader={false}
          tight
          id="feedback-title"
          eyebrow={t("feedback.eyebrow", "Feedback")}
          title={t("feedback.title")}
          description={t("feedback.titleDescription")}
        />

        <section aria-label={t("feedback.title")} className="pb-20 md:pb-28">
          <div className="layout-container grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-8">
            <div className="rounded-[28px] border border-border/70 bg-surface p-6 shadow-[0_1px_2px_rgb(15_23_42/0.04)] md:p-8">
              <FeedbackForm />
            </div>

            <aside className="lg:self-start">
              <div className="rounded-[28px] border border-border/70 bg-surface p-6 md:p-8">
                <h2 className="text-xl font-normal leading-snug text-primary">
                  {t("feedback.other.title", "Other ways to reach us")}
                </h2>
                <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
                  {t("feedback.other.line", "For a correction to a case, a lead, or a longer conversation.")}
                </p>
                <ul className="mt-6 space-y-2">
                  {OTHER_WAYS.map(({ key, href, Icon, external }) => (
                    <li key={key}>
                      <a
                        href={href}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="group flex items-center gap-3 rounded-2xl bg-muted px-4 py-3.5 transition-colors hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] text-primary">{t(`feedback.other.${key}.name`)}</span>
                          <span className="block truncate text-sm text-muted-foreground">{t(`feedback.other.${key}.line`)}</span>
                        </span>
                        <ArrowUpRight
                          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
