import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarDays, Clock, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JAWAFDEHI_SOCIALS } from "@/config/constants";
import {
  SEPTEMBER_EVENT_FLYER,
  SEPTEMBER_EVENT_FLYER_CARD,
  SEPTEMBER_EVENT_FLYER_CARD_2X,
  SEPTEMBER_EVENT_URL_LABEL,
  SEPTEMBER_EVENT_URL_SECTION,
  useSeptemberEventPast,
} from "@/lib/september-event";

/**
 * Placement A: a full-width band directly under the hero on the home page.
 *
 * The flyer carries the same facts as the text beside it, so it is decorative
 * here — every detail a visitor needs is real, selectable, translatable HTML.
 * That is deliberate: the flyer is a 1200x1500 raster of baked-in English, and
 * a Nepali reader on a phone should not have to pinch-zoom an image to find out
 * what time to show up.
 */
export function SeptemberEvent() {
  const { t } = useTranslation();
  const isPast = useSeptemberEventPast();

  if (isPast) return null;

  const details = [
    { key: "dateUs", icon: CalendarDays, content: t("septemberEvent.dateUs") },
    { key: "dateNepal", icon: Clock, content: t("septemberEvent.dateNepal") },
    {
      key: "format",
      icon: Video,
      // Two keys rather than one string with markup in it: the stream host is a
      // link, and a translator should never have to keep an anchor tag intact.
      content: (
        <>
          {t("septemberEvent.formatZoom")}
          {" · "}
          <a
            href={JAWAFDEHI_SOCIALS.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            {t("septemberEvent.formatFacebook")}
          </a>
        </>
      ),
    },
  ];

  return (
    <section
      id="september-event"
      aria-labelledby="september-event-heading"
      className="border-b border-border bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--primary))_46%,hsl(215_52%_22%)_100%)] py-12 md:py-16"
    >
      <div className="layout-container">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:gap-12 lg:gap-16">
          {/* Flyer. Links to the full-size render so it can be saved and shared.
              Ordered second on phones: the flyer's text is baked-in English, so a
              Nepali reader should meet the translated headline first, not a
              screen-height image they have to scroll past. */}
          <a
            href={SEPTEMBER_EVENT_FLYER}
            target="_blank"
            rel="noopener noreferrer"
            className="group order-2 mx-auto block w-full max-w-[260px] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary md:order-1"
          >
            <img
              src={SEPTEMBER_EVENT_FLYER_CARD}
              srcSet={`${SEPTEMBER_EVENT_FLYER_CARD} 1x, ${SEPTEMBER_EVENT_FLYER_CARD_2X} 2x`}
              alt={t("septemberEvent.flyerAlt")}
              width={260}
              height={325}
              loading="lazy"
              decoding="async"
              className="w-full rounded-xl border border-white/15 shadow-2xl shadow-black/30 transition-transform duration-200 group-hover:-translate-y-1"
            />
            <span className="mt-3 block text-center text-xs font-medium text-white/70 underline-offset-4 group-hover:underline">
              {t("septemberEvent.viewFlyer")}
            </span>
          </a>

          <div className="order-1 min-w-0 text-center md:order-2 md:text-left">
            <p className="font-eyebrow text-white/70">
              <em>{t("septemberEvent.eyebrow")}</em>
            </p>

            <h2
              id="september-event-heading"
              className="mt-4 text-3xl font-extrabold leading-tight tracking-normal text-white md:text-4xl"
            >
              {t("septemberEvent.title")}
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
              {t("septemberEvent.description")}
            </p>

            <ul className="mt-7 flex flex-col gap-3 text-sm text-white/90 md:text-base">
              {details.map(({ key, icon: Icon, content }) => (
                <li key={key} className="flex items-start justify-center gap-3 md:justify-start">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
                  <span className="text-left">{content}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Button
                asChild
                size="lg"
                className="bg-white font-semibold text-slate-950 shadow-lg shadow-black/10 hover:bg-white/90 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
              >
                <a href={SEPTEMBER_EVENT_URL_SECTION} target="_blank" rel="noopener noreferrer">
                  {t("septemberEvent.cta")}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </a>
              </Button>

              <span className="text-sm text-white/70">{SEPTEMBER_EVENT_URL_LABEL}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
