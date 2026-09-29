import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Clock,
  FileWarning,
  HandHeart,
  HeartHandshake,
  MessagesSquare,
  UserPlus,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

import { Seo } from "@/components/Seo";
import { OpenHouseSignupForm } from "@/components/open-house/signup-form";
import { Button } from "@/components/ui/button";
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
const SIGNUP_ANCHOR = `${OPEN_HOUSE_PATH}#signup`;

type Topic = {
  icon: LucideIcon;
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
  icon: LucideIcon;
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
          actionsClassName="flex flex-col items-center justify-center gap-3 sm:flex-row"
          actions={
            <>
              {/* Register leads, because most arrivals are between sessions and
                  the useful thing for them is getting told about the next one
                  for their region. A plain in-page anchor, so it works before
                  hydration and is a real link for keyboard and screen readers. */}
              <Button asChild size="lg" className="font-semibold">
                <a href={SIGNUP_ANCHOR}>
                  <UserPlus className="h-5 w-5" aria-hidden="true" />
                  {t("openHouse.hero.register")}
                </a>
              </Button>
              {/* Demoted, never removed. The room is a "No Fixed Time" meeting
                  whose link is permanent, so this stays reachable at all times:
                  someone arriving mid-session needs it, and between sessions
                  Zoom itself says the host has not started the meeting. */}
              <Button asChild size="lg" variant="secondary" className="font-semibold">
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

        {/* When it runs. The time moves every week, so the page deliberately
            promises no fixed schedule — see the requirements note in meta. */}
        <section id="when" className="bg-muted/10 py-12 md:py-14">
          <div className="layout-container">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
              <Clock className="h-8 w-8 text-primary" aria-hidden="true" />
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                {t("openHouse.when.title")}
              </h2>
              <p className="text-base leading-7 text-foreground/70">
                {t("openHouse.when.description")}
              </p>
              <p className="text-base leading-7 text-foreground/70">
                {t("openHouse.when.waitingRoom")}
              </p>
            </div>
          </div>
        </section>

        {/* Express interest. Paired with the always-live Join button above:
            the page serves both someone arriving mid-session and someone who
            wants to be told about the next one for their region. */}
        {/* scroll-mt clears the sticky navbar, which would otherwise cover the
            eyebrow and heading when the hero's Register button jumps here. */}
        <section id="signup" className="scroll-mt-24 py-12 md:py-14">
          <div className="layout-container">
            <div className="mx-auto max-w-xl">
              <div className="text-center">
                <p className="font-eyebrow mb-3">{t("openHouse.signup.eyebrow")}</p>
                <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                  {t("openHouse.signup.title")}
                </h2>
                <p className="mt-4 text-base leading-7 text-foreground/70">
                  {t("openHouse.signup.description")}
                </p>
              </div>
              <div className="mt-8 rounded-lg border border-border bg-card p-6 md:p-8">
                <OpenHouseSignupForm />
              </div>
            </div>
          </div>
        </section>

        {/* What we talk about */}
        <section id="topics" className="bg-muted/10 py-12 md:py-14">
          <div className="layout-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-eyebrow mb-3">{t("openHouse.topics.eyebrow")}</p>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                {t("openHouse.topics.title")}
              </h2>
            </div>
            <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3">
              {topics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <div
                    key={topic.titleKey}
                    className="rounded-lg border border-border bg-card p-6"
                  >
                    <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                    <h3 className="mt-4 text-lg font-semibold text-foreground">
                      {t(topic.titleKey)}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-foreground/70">
                      {t(topic.descKey)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Donate / volunteer / report */}
        <section id="next-steps" className="py-12 md:py-14">
          <div className="layout-container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                {t("openHouse.nextSteps.title")}
              </h2>
              <p className="mt-4 text-base leading-7 text-foreground/70">
                {t("openHouse.nextSteps.description")}
              </p>
            </div>
            <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3">
              {nextSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <Link
                    key={step.to}
                    to={step.to}
                    className="flex flex-col items-center rounded-lg border border-border bg-card p-6 text-center transition-colors hover:border-primary"
                  >
                    <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                    <span className="mt-4 text-lg font-semibold text-foreground">
                      {t(step.labelKey)}
                    </span>
                    <span className="mt-2 text-sm leading-6 text-foreground/70">
                      {t(step.descKey)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default OpenHouse;
