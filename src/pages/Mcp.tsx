import {
  CalendarDays,
  FileText,
  Landmark,
  Scale,
  Search,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Seo } from "@/components/Seo";
import { PromptMarquee } from "@/components/mcp/prompt-marquee";
import { ToolCarousel } from "@/components/mcp/tool-carousel";
import {
  TerminalCommand,
  TerminalCopyButton,
  TerminalWindow,
} from "@/components/mcp/terminal-block";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeroBackdrop } from "@/components/ui/page-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

// The canonical MCP endpoint, pinned rather than derived from API_BASE_URL.
// API_BASE_URL resolves to "" during pre-render and to window.location.origin in
// the browser when no build-time override is set, so deriving it would publish a
// relative path in the pre-rendered HTML and then hydrate to the SPA's own
// origin — neither of which is where the server lives. This string is the one
// thing a reader copies off the page, so it is written out in full.
const MCP_URL = "https://api.jawafdehi.org/mcp";

// Split for display only — the path is set in the accent colour so the part
// people get wrong stands out. MCP_URL above stays the single whole string that
// is copied, so the two can't drift.
const MCP_URL_ORIGIN = "https://api.jawafdehi.org";
const MCP_URL_PATH = "/mcp";

// One tab per client: where to paste the URL in the app, and the one-line
// equivalent for its CLI. `command` is absent for clients with no CLI of their
// own, and `terminalLabel` names the shell window that command belongs to.
const CLIENTS = [
  {
    key: "claude",
    terminalLabel: "claude-code",
    command: `claude mcp add --transport http jawafdehi ${MCP_URL}`,
  },
  {
    key: "openai",
    terminalLabel: "codex",
    command: `codex mcp add jawafdehi --url ${MCP_URL}`,
  },
  { key: "cursor", terminalLabel: undefined, command: undefined },
  {
    key: "vscode",
    terminalLabel: "vscode",
    command: `code --add-mcp '{"name":"jawafdehi","type":"http","url":"${MCP_URL}"}'`,
  },
  { key: "other", terminalLabel: undefined, command: undefined },
] as const;

// The six questions this page is really selling. Prompts are the clearest way to
// show what a tool catalogue is for — a reader recognises their own question
// here long before they recognise it in a list of tool names.
const PROMPT_KEYS = ["cases", "person", "office", "court", "documents", "date"] as const;

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
const TOOL_GROUPS = [
  { key: "cases", icon: Scale, to: "/cases" },
  { key: "entities", icon: Users, to: "/entities" },
  { key: "courts", icon: Landmark, to: "/courtcases" },
  { key: "materials", icon: FileText, to: "/materials" },
  { key: "search", icon: Search, to: "/search" },
  { key: "dates", icon: CalendarDays, to: undefined },
] as const;


const SECTION_EYEBROW = "text-base md:text-lg [&>span]:h-3 [&>span]:w-3";

const Mcp = () => {
  const { t, i18n } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`${t("mcp.meta.title")} | ${SITE_NAME}`}
        description={t("mcp.meta.description")}
        canonicalUrl={`${SITE_URL}/mcp/`}
        language={i18n.language}
      />

      <main id="main-content" className="flex-1">
        {/* Hero — Linear's shape: one large statement, a short lede, one CTA
            pair, then the product itself drifting past underneath. The headline
            is the claim; the endpoint moved down into its own band so the first
            thing read is what this does, not where it lives. */}
        <section
          id="mcp-hero"
          className="relative isolate -mt-[76px] flex min-h-svh flex-col overflow-hidden bg-background pt-[76px]"
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
                  <Button asChild className="font-semibold">
                    <a href="#install">{t("mcp.hero.primaryCta")}</a>
                  </Button>
                  <Button asChild variant="outline" className="font-semibold">
                    <a href="#tools">{t("mcp.hero.secondaryCta")}</a>
                  </Button>
                </div>
              </div>
            </div>

            {/* Full-bleed, so the row runs off both edges of the viewport the
                way Linear's does — hence it sits outside layout-container. */}
            <div className="mt-14 animate-hero-rise [animation-delay:420ms] motion-reduce:animate-none md:mt-16">
              <div className="layout-container">
                <p className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  {t("mcp.prompts.title")}
                </p>
              </div>

              <PromptMarquee items={PROMPT_KEYS.map((key) => t(`mcp.prompts.items.${key}`))} />
            </div>
          </div>
        </section>

        {/* The endpoint, on its own. It is the one string anybody copies, so it
            gets a band rather than a corner of the hero. */}
        <section id="endpoint" className="bg-muted/10 py-12 md:py-14">
          <div className="layout-container">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
              <TerminalWindow
                label={t("mcp.endpoint.label")}
                action={<TerminalCopyButton value={MCP_URL} label={t("mcp.endpoint.copyLabel")} />}
                bodyClassName="px-4 py-4"
                className="w-full text-left"
              >
                <code className="block overflow-x-auto whitespace-nowrap font-mono text-base font-bold text-code-surface-foreground sm:text-lg md:text-xl">
                  {MCP_URL_ORIGIN}
                  <span className="text-code-surface-accent">{MCP_URL_PATH}</span>
                </code>
              </TerminalWindow>

              <p className="font-paragraph font-paragraph-foreground text-sm">
                {t("mcp.endpoint.caption")}
              </p>
            </div>
          </div>
        </section>

        {/* Installation — Sentry's tabbed client picker. One tab per client
            shows the commands one at a time instead of as a wall of four. */}
        <section id="install" className="py-12 md:py-14">
          <div className="layout-container">
            <div>
              <Eyebrow as="h2" className={SECTION_EYEBROW}>
                {t("mcp.install.title")}
              </Eyebrow>
              <p className="mt-3 max-w-2xl font-paragraph font-paragraph-foreground">
                {t("mcp.install.body")}
              </p>

              <Tabs defaultValue="claude" className="mt-8">
                {/* A capsule rail: the track is a pill, and the selected tab
                    is a solid pill inside it. The shape carries the state, so
                    the inactive tabs need no chrome of their own. */}
                <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-full border border-border bg-background p-1.5">
                  {CLIENTS.map(({ key }) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="rounded-full px-5 py-2.5 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none sm:text-base"
                    >
                      {t(`mcp.clients.${key}.name`)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {CLIENTS.map(({ key, command, terminalLabel }) => (
                  <TabsContent
                    key={key}
                    value={key}
                    className="mt-4 rounded-lg border border-border bg-background p-6 md:p-8"
                  >
                    <ol className="space-y-6">
                      <li className="flex gap-4">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-sm font-bold text-accent">
                          1
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground">
                            {t(`mcp.clients.${key}.appLabel`)}
                          </p>
                          <p className="mt-1 font-paragraph font-paragraph-foreground text-sm">
                            {t(`mcp.clients.${key}.appSteps`)}
                          </p>
                        </div>
                      </li>

                      {command && terminalLabel ? (
                        <li className="flex gap-4">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-sm font-bold text-accent">
                            2
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground">
                              {t(`mcp.clients.${key}.cliLabel`)}
                            </p>
                            <div className="mt-2">
                              <TerminalCommand
                                command={command}
                                label={terminalLabel}
                                copyLabel={t("mcp.clients.copyCommand")}
                              />
                            </div>
                          </div>
                        </li>
                      ) : null}
                    </ol>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </section>

        {/* The example prompts used to repeat here as a static terminal. The
            hero marquee carries them now — printing the same six questions
            twice on one page read as padding. */}
        <section id="tools" className="bg-muted/10 py-12 md:py-14">
          <div className="layout-container">
            <div>
              {/* The eyebrow IS this section's heading, so it renders as h2
                  rather than the default p — the cards below still need
                  something above them in the document outline. */}
              <Eyebrow as="h2" className={SECTION_EYEBROW}>
                {t("mcp.tools.title")}
              </Eyebrow>

              <ToolCarousel
                label={t("mcp.tools.title")}
                learnMore={t("mcp.tools.learnMore")}
                learnMoreAbout={(name) => t("mcp.tools.learnMoreAbout", { name })}
                prevLabel={t("mcp.tools.prev")}
                nextLabel={t("mcp.tools.next")}
                slides={TOOL_GROUPS.map(({ key, icon, to }) => ({
                  key,
                  icon,
                  to,
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
