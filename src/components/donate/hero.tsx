import type { ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail } from "@/components/icons";
import { FaFacebook, FaWhatsapp } from "react-icons/fa";
import { useTranslation } from "react-i18next";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { PayCard } from "@/components/donate/pay-card";
import { JAWAFDEHI_EMAIL, JAWAFDEHI_SOCIALS } from "@/config/constants";
import { getStatistics } from "@/services/jds-api";
import { trackEvent, type DonateMethod } from "@/utils/analytics";

/** The channels a donor can actually reach a human on. Email is the record
 * channel for receipts and donation questions; Facebook and WhatsApp are where
 * most of the Nepali audience already talks to us, so a donor who will not
 * write an email still has a way in. Labels reuse the footer's channel names,
 * which are already translated. */
const CONTACT_CHANNELS: readonly {
  id: DonateMethod;
  href: string;
  labelKey: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  external?: boolean;
}[] = [
  {
    id: "email",
    href: `mailto:${JAWAFDEHI_EMAIL}`,
    labelKey: "donate.hero.email",
    icon: Mail,
  },
  {
    id: "facebook",
    href: JAWAFDEHI_SOCIALS.facebook,
    labelKey: "footer.social.facebook",
    icon: FaFacebook,
    external: true,
  },
  {
    id: "whatsapp",
    href: JAWAFDEHI_SOCIALS.whatsapp,
    labelKey: "footer.social.whatsapp",
    icon: FaWhatsapp,
    external: true,
  },
];

/** One live figure. Loading/error/missing all render the "—" placeholder
 * rather than "0", so an absent stat never reads as a real zero (same
 * convention as the home hero). Label first in the markup (dt before dd),
 * figure first on screen. */
function Stat({ value, label }: Readonly<{ value?: number; label: string }>) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1.5 text-sm text-muted-foreground">{label}</dt>
      {/* Inter tabular figures, per the press kit: a count should line up
          digit for digit as it loads. */}
      <dd className="text-3xl font-medium leading-none tracking-tight tabular-nums text-primary">
        {typeof value === "number" ? value.toLocaleString() : "—"}
      </dd>
    </div>
  );
}

/**
 * The top of /donate in two parts. A short navy banner says what the money is
 * for, and the giving itself sits right under it on white: the payment card on
 * the left and, beside it like a checkout summary, what the money already
 * sustains and how to reach a person. The banner stays short so the card is in
 * view without scrolling on a laptop.
 */
export function DonateHero() {
  const { t } = useTranslation();
  const titleLead = t("donate.hero.titleLead");

  const { data: stats } = useQuery({
    queryKey: ["statistics"],
    queryFn: getStatistics,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return (
    <>
      <section
        id="donate-hero"
        aria-labelledby="donate-hero-title"
        className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]"
      >
        {/* The same grain stage as /mcp, pooled navy behind the words. */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <ShaderBackdrop design="grain" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--primary-surface)/0.92)_0%,hsl(var(--primary-surface)/0.6)_55%,hsl(var(--primary-surface)/0.3)_100%)]" />
        </div>

        <div className="layout-container grid gap-6 pb-12 pt-10 md:pb-14 md:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-end lg:gap-16">
          <h1
            id="donate-hero-title"
            className="font-home-display max-w-[17ch] text-[clamp(2.25rem,4.4vw,3.75rem)] text-primary-foreground [:root[lang=ne]_&]:max-w-[22ch]"
          >
            {/* Three slots so the crimson emphasis can sit mid-sentence in
                either language. Nepali needs no lead-in — its verb phrase
                carries the whole clause — so the lead renders only when the
                locale supplies one. The highlight is allowed to wrap. */}
            {titleLead ? <>{titleLead} </> : null}
            <span className="text-[hsl(var(--accent-on-dark))]">{t("donate.hero.titleHighlight")}</span>{" "}
            {t("donate.hero.titleTail")}
          </h1>
          <p className="max-w-xl text-base leading-7 text-primary-foreground/75 md:text-lg md:leading-8">
            {t("donate.hero.description")}
          </p>
        </div>
      </section>

      <section id="donate-give" aria-labelledby="donate-give-title" className="bg-background pb-4 pt-12 md:pt-16">
        <div className="layout-container">
          <h2 id="donate-give-title" className="font-home-section-title text-primary">
            {t("donate.ways.title")}
          </h2>

          <div className="mt-8 grid gap-10 md:mt-10 lg:grid-cols-[minmax(0,46rem)_minmax(0,1fr)] lg:gap-14">
            <PayCard />

            <aside className="lg:border-l lg:border-border lg:pl-10">
              {/* What the money already sustains — real figures, not pledges. */}
              <dl className="grid grid-cols-2 gap-8 lg:grid-cols-1 lg:gap-7">
                <Stat value={stats?.published_cases} label={t("donate.hero.stats.cases")} />
                <Stat value={stats?.entities_tracked} label={t("donate.hero.stats.entities")} />
              </dl>

              <div className="mt-8 border-t border-border pt-6">
                <p className="text-sm text-muted-foreground">{t("donate.hero.contactUs")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CONTACT_CHANNELS.map((channel) => (
                    <a
                      key={channel.id}
                      href={channel.href}
                      {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      onClick={() =>
                        trackEvent("donate_click", {
                          method: channel.id,
                          action: "contact",
                          link_url: channel.href,
                        })
                      }
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-muted px-3.5 text-sm text-primary transition-[background-color,transform] duration-150 ease-out hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
                    >
                      <channel.icon className="h-4 w-4" aria-hidden="true" />
                      {t(channel.labelKey)}
                    </a>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
