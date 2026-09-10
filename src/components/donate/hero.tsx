import type { ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { FaFacebook, FaWhatsapp } from "react-icons/fa";
import { useTranslation } from "react-i18next";

import { PayCard } from "@/components/donate/pay-card";
import { JAWAFDEHI_EMAIL, JAWAFDEHI_SOCIALS } from "@/config/constants";
import { getStatistics } from "@/services/jds-api";
import { trackEvent } from "@/utils/analytics";

/** The channels a donor can actually reach a human on. Email is the record
 * channel for receipts and donation questions; Facebook and WhatsApp are where
 * most of the Nepali audience already talks to us, so a donor who will not
 * write an email still has a way in. Labels reuse the footer's channel names,
 * which are already translated. */
const CONTACT_CHANNELS: readonly {
  id: string;
  href: string;
  labelKey: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
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

/** One live figure under the headline. Loading/error/missing all render the
 * "—" placeholder rather than "0", so an absent stat never reads as a real
 * zero (same convention as the home hero). */
function Stat({ value, label }: Readonly<{ value?: number; label: string }>) {
  return (
    <div>
      <div className="text-2xl font-bold text-primary-foreground">
        {typeof value === "number" ? value.toLocaleString() : "—"}
      </div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wide text-primary-foreground/60">
        {label}
      </div>
    </div>
  );
}

/**
 * Donate hero, payment-first: the headline and the archive's live footprint on
 * the left, the actual payment card on the right — a donor never scrolls to
 * find out *how* to give. The panel is always navy (`--primary-surface`), same
 * as the home hero's stage, so the card reads as the single bright object.
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
    <section
      id="donate-hero"
      aria-labelledby="donate-hero-title"
      className="bg-primary-surface"
    >
      <div className="layout-container py-12 md:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-12">
          <div>
            <h1
              id="donate-hero-title"
              className="text-4xl font-bold leading-[1.08] text-primary-foreground md:text-5xl"
            >
              {/* Three slots so the amber emphasis can sit mid-sentence in
                  either language. Nepali needs no lead-in — its verb phrase
                  carries the whole clause — so the lead renders only when the
                  locale supplies one, rather than leaving a stray space. */}
              {titleLead ? (
                <>
                  {titleLead}{" "}
                </>
              ) : null}
              <span className="text-[hsl(var(--accent-on-dark))] sm:whitespace-nowrap">
                {t("donate.hero.titleHighlight")}
              </span>{" "}
              {t("donate.hero.titleTail")}
            </h1>

            <p className="mt-4 max-w-prose text-base leading-7 text-primary-foreground/75">
              {t("donate.hero.description")}
            </p>

            {/* What the money already sustains — real figures, not pledges. */}
            <div className="mt-8 flex gap-10 border-t border-primary-foreground/15 pt-6">
              <Stat
                value={stats?.published_cases}
                label={t("donate.hero.stats.cases")}
              />
              <Stat
                value={stats?.entities_tracked}
                label={t("donate.hero.stats.entities")}
              />
            </div>

            <p className="mt-6 text-sm text-primary-foreground/60">
              <span className="mr-1">{t("donate.hero.contactUs")}</span>
              {CONTACT_CHANNELS.map((channel) => (
                <a
                  key={channel.id}
                  href={channel.href}
                  {...(channel.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  onClick={() =>
                    trackEvent("donate_click", {
                      method: channel.id,
                      action: "contact",
                      link_url: channel.href,
                    })
                  }
                  className="mr-4 inline-flex items-center gap-1.5 font-medium text-primary-foreground/80 underline underline-offset-4 transition-colors last:mr-0 hover:text-primary-foreground"
                >
                  <channel.icon className="h-4 w-4" aria-hidden="true" />
                  {t(channel.labelKey)}
                </a>
              ))}
            </p>
          </div>

          <PayCard />
        </div>
      </div>
    </section>
  );
}
