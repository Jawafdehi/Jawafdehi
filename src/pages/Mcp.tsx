import {
  ArrowUpRight,
  CalendarDays,
  FileText,
  Landmark,
  Scale,
  Search,
  Users,
} from "lucide-react";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { Seo } from "@/components/Seo";
import { CopyButton } from "@/components/mcp/copy-field";
import { InstallPicker } from "@/components/mcp/install-picker";
import { TerminalCommand } from "@/components/mcp/terminal-block";
import { ToggleList, ToggleTrigger } from "@/components/mcp/toggle-tabs";
import { ToolCarousel } from "@/components/mcp/tool-carousel";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeroBackdrop } from "@/components/ui/page-hero";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

// The six things the server can do, grouped by what a reader is looking for
// rather than by which Django app serves them. The wire tool names are no
// longer printed on the page — this list is only the categories now — but the
// grouping still tracks the anonymous catalogue (ANONYMOUS_TOOL_NAMES in
// jawafdehi_mcp/identity.py), so a category must not outlive its tools.
//
// There is no court-SQL category beyond browsing: ngm_query_judicial is listed
// in ANONYMOUS_TOOL_NAMES, but that set is intersected with the registered
// tools and it is not registered in the monolith — tools/list against the live
// endpoint returns 12 names, not 13.
//
// `to` is the page on this site that browses the same data by hand. Five of the
// six have one; "dates and identity" has no page of its own and so carries no
// link rather than a link that goes somewhere only loosely related.
//
// Each preview is a screenshot of that page on jawafdehi.org, not of an AI
// answer: the data is what the tools read, and showing it as the site renders
// it claims nothing the server did not say. "dates" shows a case's court
// updates, where every date is printed in both calendars.
const TOOL_GROUPS = [
  { key: "cases", icon: Scale, to: "/cases" },
  { key: "entities", icon: Users, to: "/entities" },
  { key: "courts", icon: Landmark, to: "/courtcases" },
  { key: "materials", icon: FileText, to: "/materials" },
  { key: "search", icon: Search, to: "/search" },
  { key: "dates", icon: CalendarDays, to: undefined },
] as const;

// The agent skills live beside the server in Jawafdehi/mcp. These commands are
// copied from that repo's README — change them there first.
const SKILLS_REPO_URL = "https://github.com/Jawafdehi/mcp/tree/main/skills";
// Everything but Claude Code installs through the same `skills` CLI, so those
// tabs share one command; they are separate tabs so each reader finds the
// name of the tool they actually use.
const SKILLS_CLI = "npx skills add Jawafdehi/mcp --skill jawafdehi-archive";
const SKILL_INSTALLS = [
  {
    key: "claudeCode",
    label: "claude-code",
    command: "/plugin install jawafdehi-archive --marketplace Jawafdehi/mcp",
  },
  { key: "codex", label: "skills", command: SKILLS_CLI },
  { key: "cursor", label: "skills", command: SKILLS_CLI },
  { key: "gemini", label: "skills", command: SKILLS_CLI },
] as const;

// First questions to try once connected. Each one is answerable from data
// that is actually published — the Jumla licence cases, the Bhaktapur land
// revenue bribery case and court case 081-CR-0113 are all live on the site.
const EXAMPLE_PROMPTS = ["cases", "court", "entity"] as const;

// 🚨 index.html declares <base href="/" />, so a bare href="#install" resolves
// to the HOME page's #install, not this page's — which is exactly where the
// hero buttons used to go. In-page links carry the path, normalised to the
// trailing slash (the edge redirects "/mcp" there, and the pre-render must emit
// the same href the hydrated page does). See OpenHouse.tsx for the same fix.
const MCP_PATH = "/mcp/";

function sectionHref(pathname: string, id: string): string {
  const base = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return `${base}#${id}`;
}

// A client-side arrival at "/mcp" (no slash) would make the href above a
// cross-document navigation, so a plain left-click scrolls in place instead.
// Modified clicks fall through to the real link.
function scrollToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
  if (
    event.defaultPrevented ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  const target = document.getElementById(id);
  if (!target) return;

  event.preventDefault();
  const reduceMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  target.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });

  // Move focus with the viewport, as a fragment link would, so the next Tab
  // continues from the section rather than from the hero.
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}#${id}`,
  );
}

const SECTION_EYEBROW = "text-base md:text-lg [&>span]:h-3 [&>span]:w-3";

const Mcp = () => {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`${t("mcp.meta.title")} | ${SITE_NAME}`}
        description={t("mcp.meta.description")}
        canonicalUrl={`${SITE_URL}${MCP_PATH}`}
        language={i18n.language}
      />

      <main id="main-content" className="flex-1">
        {/* Hero — Linear's shape: one large statement, a short lede, one CTA
            pair, then the product itself drifting past underneath. The headline
            is the claim; the endpoint moved down into its own band so the first
            thing read is what this does, not where it lives. */}
        <section
          id="mcp-hero"
          className="relative isolate -mt-[76px] flex min-h-[90svh] flex-col overflow-hidden bg-background pt-[76px]"
        >
          <PageHeroBackdrop />

          <div className="relative z-10 flex flex-1 flex-col justify-center py-14 md:py-20">
            <div className="layout-container">
              <div>
                {/* Two display lines, each animating in on its own beat. The
                    locale picks its own split, so the accent always lands on
                    the archive rather than on a fixed word position. */}
                <h1 className="font-hero-title">
                  <span className="block animate-hero-rise [animation-delay:70ms] motion-reduce:animate-none">
                    {t("mcp.hero.titleLine1")}
                  </span>
                  <span className="block animate-hero-rise text-accent [animation-delay:150ms] motion-reduce:animate-none">
                    {t("mcp.hero.titleLine2")}
                  </span>
                </h1>

                <p className="font-hero-lede mt-6 max-w-2xl animate-hero-rise [animation-delay:240ms] motion-reduce:animate-none">
                  {t("mcp.hero.description")}
                </p>

                <div className="mt-8 flex flex-wrap gap-3 animate-hero-rise [animation-delay:320ms] motion-reduce:animate-none">
                  <Button asChild className="font-medium">
                    <a
                      href={sectionHref(pathname, "install")}
                      onClick={(event) => scrollToSection(event, "install")}
                    >
                      {t("mcp.hero.primaryCta")}
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="font-medium">
                    <a
                      href={sectionHref(pathname, "tools")}
                      onClick={(event) => scrollToSection(event, "tools")}
                    >
                      {t("mcp.hero.secondaryCta")}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Installation — one tab per client. scroll-mt clears the fixed
            navbar when the hero buttons land here. */}
        <section
          id="install"
          className="scroll-mt-24 py-12 outline-none md:py-16"
        >
          <div className="layout-container">
            <Eyebrow as="h2" className={SECTION_EYEBROW}>
              {t("mcp.install.title")}
            </Eyebrow>
            <InstallPicker />
          </div>
        </section>

        {/* Skills — the server gives an agent the tools; the skill teaches it
            which tool answers which question. Sits right after install
            because it is the second thing to set up, not a feature. */}
        <section id="skills" className="scroll-mt-24 py-12 md:py-16">
          <div className="layout-container">
            {/* Title and repo link share a row; on a phone the link drops under
                the title rather than squeezing it. */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <Eyebrow as="h2" className={SECTION_EYEBROW}>
                {t("mcp.skills.title")}
              </Eyebrow>
              <Button
                asChild
                variant="ghost"
                className="-mx-4 font-semibold sm:mx-0 sm:-mr-4"
              >
                <a
                  href={SKILLS_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("mcp.skills.repoCta")}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
            <p className="mt-3 max-w-2xl font-paragraph font-paragraph-foreground">
              {t("mcp.skills.body")}
            </p>

            <Tabs defaultValue={SKILL_INSTALLS[0].key} className="mt-6 max-w-3xl">
              <ToggleList>
                {SKILL_INSTALLS.map(({ key }) => (
                  <ToggleTrigger key={key} value={key}>
                    {t(`mcp.skills.install.${key}`)}
                  </ToggleTrigger>
                ))}
              </ToggleList>

              {SKILL_INSTALLS.map(({ key, label, command }) => (
                <TabsContent key={key} value={key} className="mt-4">
                  <TerminalCommand
                    command={command}
                    label={label}
                    copyLabel={t("mcp.clients.copyCommand")}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        {/* What to type once it is connected — the step every other install
            page leaves out, and the one that tells a reader it worked. */}
        <section id="try" className="scroll-mt-24 py-12 md:py-16">
          <div className="layout-container">
            <Eyebrow as="h2" className={SECTION_EYEBROW}>
              {t("mcp.prompts.title")}
            </Eyebrow>
            <p className="mt-3 max-w-2xl font-paragraph font-paragraph-foreground">
              {t("mcp.prompts.body")}
            </p>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {EXAMPLE_PROMPTS.map((key) => {
                const prompt = t(`mcp.prompts.items.${key}`);
                return (
                  <li
                    key={key}
                    className="flex items-start gap-3 rounded-lg border border-border bg-background p-5"
                  >
                    <p className="min-w-0 flex-1 font-paragraph text-foreground">
                      {prompt}
                    </p>
                    <CopyButton
                      value={prompt}
                      label={t("mcp.prompts.copyLabel")}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* The example prompts used to repeat here as a static terminal. The
            hero marquee carries them now — printing the same six questions
            twice on one page read as padding. */}
        <section
          id="tools"
          className="scroll-mt-24 bg-muted/10 py-12 outline-none md:py-14"
        >
          <div className="layout-container">
            <div>
              {/* The eyebrow IS this section's heading, so it renders as h2
                  rather than the default p — the cards below still need
                  something above them in the document outline. */}
              <Eyebrow as="h2" className={SECTION_EYEBROW}>
                {t("mcp.tools.title")}
              </Eyebrow>

              <ToolCarousel
                learnMore={t("mcp.tools.learnMore")}
                learnMoreAbout={(name) =>
                  t("mcp.tools.learnMoreAbout", { name })
                }
                slides={TOOL_GROUPS.map(({ key, icon, to }) => ({
                  key,
                  icon,
                  to,
                  preview: `/assets/mcp/${key}.webp`,
                  name: t(`mcp.tools.groups.${key}.name`),
                  description: t(`mcp.tools.groups.${key}.description`),
                }))}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Mcp;
