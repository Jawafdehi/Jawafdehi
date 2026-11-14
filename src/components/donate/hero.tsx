import type { ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail } from "@/components/icons";
import { FaFacebook, FaWhatsapp } from "react-icons/fa";
import { useTranslation } from "react-i18next";

import { PayCard } from "@/components/donate/pay-card";
import { LightHero } from "@/components/ui/light-hero";
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
 * The top of /donate in two parts. A short light banner, the same diamond
 * field as /updates and /feedback, says what the money is for and what it
 * already sustains. The giving itself follows straight on: which side of the
 * border you are giving from, then how.
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
      <LightHero
        id="donate-hero-title"
        tight
        eyebrow={t("nav.donate")}
        title={
          // Three slots so the crimson emphasis can sit mid-sentence in either
          // language. Nepali needs no lead-in, so the lead renders only when
          // the locale supplies one.
          <>
            {titleLead ? <>{titleLead} </> : null}
            <span className="text-accent">{t("donate.hero.titleHighlight")}</span> {t("donate.hero.titleTail")}
          </>
        }
        description={t("donate.hero.description")}
      >
        {/* What the money already sustains — real figures, not pledges. */}
        <dl className="mt-8 flex gap-12">
          <Stat value={stats?.published_cases} label={t("donate.hero.stats.cases")} />
          <Stat value={stats?.entities_tracked} label={t("donate.hero.stats.entities")} />
        </dl>
      </LightHero>

      <section id="donate-give" aria-labelledby="donate-give-title" className="bg-background pb-4 pt-6 md:pt-10">
        <div className="layout-container">
          <PayCard
            header={
              <h2 id="donate-give-title" className="font-home-section-title text-primary">
                {t("donate.ways.title")}
              </h2>
            }
            footer={
              // A person to ask, for either route.
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-sm text-muted-foreground">{t("donate.hero.contactUs")}</span>
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
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-background px-3.5 text-sm text-primary transition-[background-color,transform] duration-150 ease-out hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
                  >
                    <channel.icon className="h-4 w-4" aria-hidden="true" />
                    {t(channel.labelKey)}
                  </a>
                ))}
              </div>
            }
          />
        </div>
      </section>
    </>
  );
}
