import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarDays, Clock, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JAWAFDEHI_SOCIALS } from "@/config/constants";
import {
  LAUNCH_EVENT_FLYER,
  LAUNCH_EVENT_FLYER_CARD,
  LAUNCH_EVENT_FLYER_CARD_2X,
  LAUNCH_EVENT_URL_LABEL,
  LAUNCH_EVENT_URL_SECTION,
  useLaunchEventPast,
} from "@/lib/launch-event";

/**
 * Placement A: a full-width band directly under the hero on the home page.
 *
 * Rebuilt for the 23/24 September launch from the band that announced the
 * 2/3 September session, which was deleted with it in 437ae7e.
 *
 * The flyer carries the same facts as the text beside it, so it is decorative
 * here — every detail a visitor needs is real, selectable, translatable HTML.
 * That is deliberate: the flyer is a raster of baked-in English, and a Nepali
 * reader on a phone should not have to pinch-zoom an image to find out what
 * time to show up.
 *
 * The flyer also carries a summed बिगो and a "Featuring" list that states
 * charges as fact. That was raised and accepted for this surface. The text
 * beside it deliberately repeats neither: the description leads with what the
 * archive is and what the hour will cover, and names no case and no total.
 * If the flyer is re-cut, the renditions in public/assets/events/ have to be
 * regenerated — see launch-event.ts.
 */
export function LaunchEvent() {
  const { t } = useTranslation();
  const isPast = useLaunchEventPast();

  if (isPast) return null;

  const details = [
    {
      key: "dateUs",
      icon: CalendarDays,
      content: t(
        "launchEvent.dateUs",
        "Wednesday 23 September 2026, 6:00 PM Pacific · 8:00 PM Central · 9:00 PM Eastern",
      ),
    },
    {
      key: "dateNepal",
      icon: Clock,
      content: t(
        "launchEvent.dateNepal",
        "Thursday 24 September 2026 in Nepal, 6:45 AM (आश्विन ८)",
      ),
    },
    {
      key: "format",
      icon: Video,
      // Two keys rather than one string with markup in it: the stream host is a
      // link, and a translator should never have to keep an anchor tag intact.
      content: (
        <>
          {t("launchEvent.formatZoom", "Zoom")}
          {" · "}
          <a
            href={JAWAFDEHI_SOCIALS.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-surface"
          >
            {t("launchEvent.formatFacebook", "live on Facebook")}
          </a>
        </>
      ),
    },
  ];

  return (
    <section
      id="launch-event"
      aria-labelledby="launch-event-heading"
      className="border-b border-border bg-[linear-gradient(135deg,hsl(var(--primary-surface))_0%,hsl(var(--primary-surface))_46%,hsl(215_52%_22%)_100%)] py-12 md:py-16"
    >
      <div className="layout-container">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:gap-12 lg:gap-16">
          {/* Flyer. Links to the full-size render so it can be saved and shared.
              Ordered second on phones: the flyer's text is baked-in English, so a
              Nepali reader should meet the translated headline first, not a
              screen-height image they have to scroll past. */}
          <a
            href={LAUNCH_EVENT_FLYER}
            target="_blank"
            rel="noopener noreferrer"
            className="group order-2 mx-auto block w-full max-w-[260px] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-surface md:order-1"
          >
            <img
              src={LAUNCH_EVENT_FLYER_CARD}
              srcSet={`${LAUNCH_EVENT_FLYER_CARD} 1x, ${LAUNCH_EVENT_FLYER_CARD_2X} 2x`}
              alt={t(
                "launchEvent.flyerAlt",
                "Launch flyer: Nepal's Permanent Corruption Database. 23 September, 6 PM Pacific; 24 September, 6:45 AM Nepal time. Register at jawafdehi.org/launch.",
              )}
              width={260}
              height={325}
              loading="lazy"
              decoding="async"
              className="w-full rounded-xl border border-white/15 shadow-2xl shadow-black/30 transition-transform duration-200 group-hover:-translate-y-1"
            />
            <span className="mt-3 block text-center text-xs font-medium text-white/70 underline-offset-4 group-hover:underline">
              {t("launchEvent.viewFlyer", "View the full flyer")}
            </span>
          </a>

          <div className="order-1 min-w-0 text-center md:order-2 md:text-left">
            <p className="font-eyebrow text-white/70">
              <em>{t("launchEvent.eyebrow", "Public launch · Free · Open to everyone")}</em>
            </p>

            <h2
              id="launch-event-heading"
              className="mt-4 text-3xl font-extrabold leading-tight tracking-normal text-white md:text-4xl"
            >
              {t("launchEvent.title", "The public launch of Nepal's corruption database")}
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
              {t(
                "launchEvent.description",
                "Built over the past year and open to everyone: a permanent, searchable public record of corruption cases, with the documents behind them. We will show you what is in it and what has to happen to a case before it goes public. After that the floor is yours. You do not need a background in law or technology to follow it.",
              )}
            </p>

            <ul className="mt-7 flex flex-col gap-3 text-sm text-white/90 md:text-base">
              {details.map(({ key, icon: Icon, content }) => (
                <li key={key} className="flex items-start justify-center gap-3 md:justify-start">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-foreground/80" aria-hidden="true" />
                  <span className="text-left">{content}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Button
                asChild
                size="lg"
                className="bg-white font-semibold text-primary-surface shadow-lg shadow-black/10 hover:bg-white/90 dark:bg-white dark:text-primary-surface dark:hover:bg-white/90"
              >
                <a href={LAUNCH_EVENT_URL_SECTION} target="_blank" rel="noopener noreferrer">
                  {t("launchEvent.cta", "Learn more")}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </a>
              </Button>

              <span className="text-sm text-white/70">{LAUNCH_EVENT_URL_LABEL}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
