import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Clock,
  FileWarning,
  HandHeart,
  HeartHandshake,
  MessagesSquare,
  UserPlus,
  Users,
  Video,
  type IconComponent,
} from "@/components/icons";

import { Seo } from "@/components/Seo";
import { OpenHouseSignupForm } from "@/components/open-house/signup-form";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Panel } from "@/components/ui/panel";
import { PageHero } from "@/components/ui/page-hero";
import { JAWAFDEHI_OPEN_HOUSE } from "@/config/constants";
import { SITE_URL } from "@/utils/seo";

// 🚨 index.html declares <base href="/" />, and a fragment-only URL resolves
// against the document BASE, not the current page. So href="#signup" navigates
// to https://jawafdehi.org/#signup — the home page — rather than scrolling down
// this one. In-page anchors here must carry the full path.
//
// Not hypothetical and not only ours: /materials ships href="#series" and
// /research/corruption ships href="#methodology", both of which land on the
// home page in production today, as does the skip-to-content link in Navbar.
const OPEN_HOUSE_PATH = "/openhouse/";

const SIGNUP_ID = "signup";

// ⚠️ Two different pathnames reach this page — "/openhouse" when React Router
// handles it from the nav menu, and "/openhouse/" on a direct hit — and a
// fragment link only scrolls when everything BEFORE the "#" matches the current
// document exactly. Get that wrong and the browser does a full cross-document
// navigation instead, which is what "it opens a new tab" turned out to be.
//
// Normalised to the trailing slash rather than echoing the pathname verbatim,
// because that is the one form a no-JS reader can actually be at: the edge
// redirects bare "/openhouse" to "/openhouse/", so the served document is
// always the slashed one. It also keeps the pre-rendered href identical to the
// hydrated one — the pre-render renders the route as "/openhouse", so echoing
// the pathname would emit "/openhouse#signup" into static HTML and then change
// it on hydration, which is exactly the attribute mismatch React complains
// about. A client-side arrival at "/openhouse" is covered by the click handler.
function signupHref(pathname: string): string {
  const base = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return `${base}#${SIGNUP_ID}`;
}

type Topic = {
  icon: IconComponent;
  titleKey: string;
  descKey: string;
};

const topics: Topic[] = [
  {
    icon: MessagesSquare,
    titleKey: "openHouse.topics.accountability.title",
    descKey: "openHouse.topics.accountability.desc",
  },
  {
    icon: Video,
    titleKey: "openHouse.topics.tech.title",
    descKey: "openHouse.topics.tech.desc",
  },
  {
    icon: HandHeart,
    titleKey: "openHouse.topics.givingBack.title",
    descKey: "openHouse.topics.givingBack.desc",
  },
];

type NextStep = {
  icon: IconComponent;
  to: string;
  labelKey: string;
  descKey: string;
};

// Donate, volunteer and report — a session is meant to do all three at once, so
// the page offers all three rather than picking one.
const nextSteps: NextStep[] = [
  {
    icon: HeartHandshake,
    to: "/donate",
    labelKey: "openHouse.nextSteps.donate.label",
    descKey: "openHouse.nextSteps.donate.desc",
  },
  {
    icon: Users,
    to: "/volunteer",
    labelKey: "openHouse.nextSteps.volunteer.label",
    descKey: "openHouse.nextSteps.volunteer.desc",
  },
  {
    icon: FileWarning,
    to: "/report",
    labelKey: "openHouse.nextSteps.report.label",
    descKey: "openHouse.nextSteps.report.desc",
  },
];

const OpenHouse = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  // Smooth-scrolls instead of jumping, while staying a real link: the href is
  // still correct, so middle-click, right-click → open in new tab, and a
  // no-JS render all behave normally. Only a plain left-click is intercepted.
  const scrollToSignup = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = document.getElementById(SIGNUP_ID);
    // No target means something changed; let the browser follow the href
    // rather than swallowing the click and going nowhere.
    if (!target) return;

    event.preventDefault();

    // Honour prefers-reduced-motion. A long smooth scroll is a vestibular
    // trigger, and this one crosses most of the viewport.
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });

    // A fragment link is supposed to move focus, not just the viewport —
    // otherwise a keyboard user tabs on from the hero, not the form. Smooth
    // scrolling suppresses the browser's own focus handling, so do it here.
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });

    // Keep the URL shareable without pushing a history entry, so Back leaves
    // the page rather than silently undoing a scroll.
    window.history.replaceState(null, "", signupHref(pathname));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Jawafdehi Open House — Jawafdehi"
        description="Join a small, informal online session with the Jawafdehi team. We talk about Nepal's accountability infrastructure, using AI and tech for good, and giving back to our home country."
        canonicalUrl={`${SITE_URL}${OPEN_HOUSE_PATH}`}
        // The campaign flyer, recomposed to 1200x630 so the link previews as
        // the artwork people are being shown elsewhere rather than the generic
        // site card. This page is shared directly with prospects, so the
        // preview is often the whole first impression. The card carries
        // jawafdehi.org/openhouse in it, which survives platforms that strip
        // the link text and show only the image.
        imageUrl={`${SITE_URL}/assets/openhouse-preview.png`}
        imageAlt="Jawafdehi Open House — join us online via Zoom at jawafdehi.org/openhouse"
        imageWidth={1200}
        imageHeight={630}
      />

      <main id="main-content" className="flex-1">
        <PageHero
          id="open-house-hero"
          eyebrow={t("openHouse.hero.eyebrow")}
          title={t("openHouse.hero.title")}
          description={t("openHouse.hero.description")}
          actions={
            <>
              {/* Register leads, because most arrivals are between sessions and
                  the useful thing for them is getting told about the next one
                  for their region. A plain in-page anchor, so it works before
                  hydration and is a real link for keyboard and screen readers. */}
              <Button asChild size="lg">
                <a href={signupHref(pathname)} onClick={scrollToSignup}>
                  <UserPlus className="h-5 w-5" aria-hidden="true" />
                  {t("openHouse.hero.register")}
                </a>
              </Button>
              {/* Demoted, never removed. The room is a "No Fixed Time" meeting
                  whose link is permanent, so this stays reachable at all times:
                  someone arriving mid-session needs it, and between sessions
                  Zoom itself says the host has not started the meeting. */}
              <Button asChild size="lg" variant="secondary">
                <a
                  href={JAWAFDEHI_OPEN_HOUSE.zoomUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Video className="h-5 w-5" aria-hidden="true" />
                  {t("openHouse.hero.join")}
                </a>
              </Button>
            </>
          }
        />

        {/* When it runs, and the sign-up beside it. The time moves every week,
            so the page deliberately promises no fixed schedule — see the
            requirements note in meta. The form pairs with the always-live Join
            button above: it serves someone who wants to be told about the next
            session for their region. scroll-mt clears the sticky navbar when
            the hero's Register button jumps here. */}
        <section className="pt-8 md:pt-12">
          <div className="layout-container grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div id="when">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-primary">
                <Clock className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="font-home-section-title mt-6 text-primary">{t("openHouse.when.title")}</h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">{t("openHouse.when.description")}</p>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">{t("openHouse.when.waitingRoom")}</p>
            </div>
            <div id="signup" className="scroll-mt-24 rounded-[28px] border border-border/70 bg-surface p-6 md:p-8">
              <Eyebrow>{t("openHouse.signup.eyebrow")}</Eyebrow>
              <h2 className="font-home-display mt-4 text-3xl text-primary md:text-4xl">{t("openHouse.signup.title")}</h2>
              <p className="mt-3 text-lg leading-8 text-muted-foreground">{t("openHouse.signup.description")}</p>
              <div className="mt-6">
                <OpenHouseSignupForm />
              </div>
            </div>
          </div>
        </section>

        {/* What we talk about: the redesign's grey panels. */}
        <section id="topics" aria-labelledby="topics-title" className="pt-16 md:pt-24">
          <div className="layout-container">
            <Eyebrow>{t("openHouse.topics.eyebrow")}</Eyebrow>
            <h2 id="topics-title" className="font-home-section-title mt-4 text-primary">
              {t("openHouse.topics.title")}
            </h2>
            <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
              {topics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <li key={topic.titleKey}>
                    <Panel className="min-h-[13rem]">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-auto pt-8 text-xl font-normal leading-snug text-primary">{t(topic.titleKey)}</h3>
                      <p className="mt-2 text-base leading-7 text-muted-foreground">{t(topic.descKey)}</p>
                    </Panel>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Donate / volunteer / report: hairline link cards with an arrow. */}
        <section id="next-steps" aria-labelledby="next-steps-title" className="pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="layout-container">
            <h2 id="next-steps-title" className="font-home-section-title text-primary">
              {t("openHouse.nextSteps.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{t("openHouse.nextSteps.description")}</p>
            <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
              {nextSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <li key={step.to}>
                    <Link
                      to={step.to}
                      className="group flex h-full flex-col rounded-[28px] border border-border/70 bg-surface p-6 transition-[transform,border-color] duration-150 ease-out hover:border-border active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100"
                    >
                      <span className="flex items-center justify-between">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <ArrowRight
                          className="h-5 w-5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </span>
                      <span className="mt-8 text-xl text-primary">{t(step.labelKey)}</span>
                      <span className="mt-2 text-base leading-7 text-muted-foreground">{t(step.descKey)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default OpenHouse;
