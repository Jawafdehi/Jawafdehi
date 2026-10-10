import {
  BookOpen,
  CalendarDays,
  ExternalLink,
  FileText,
  Github,
  Landmark,
  Scale,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Seo } from "@/components/Seo";
import { BlueprintBackdrop } from "@/components/mcp/blueprint";
import {
  TerminalCommand,
  TerminalCopyButton,
  TerminalWindow,
} from "@/components/mcp/terminal-block";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_BASE_URL } from "@/services/http";
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

// The anonymous tool catalogue, grouped by what a reader is looking for rather
// than by which Django app serves it. Names are the wire names the server
// advertises, so they can be matched against a client's tool list verbatim.
// Source of truth: ANONYMOUS_TOOL_NAMES in jawafdehi_mcp/identity.py.
const TOOL_GROUPS = [
  { key: "cases", icon: Scale, tools: ["search_jawafdehi_cases", "get_jawafdehi_case"] },
  {
    key: "entities",
    icon: Users,
    tools: [
      "search_nes_entities",
      "get_nes_entities",
      "get_nes_tags",
      "get_nes_entity_prefixes",
      "get_nes_entity_versions",
    ],
  },
  { key: "courts", icon: Landmark, tools: ["ngm_query_judicial", "browse_court_data"] },
  { key: "materials", icon: FileText, tools: ["browse_materials"] },
  { key: "search", icon: Search, tools: ["search_control_plane"] },
  { key: "dates", icon: CalendarDays, tools: ["convert_date", "get_current_user"] },
] as const;

const SCOPE_KEYS = ["readOnly", "noAccount", "sameData", "signIn"] as const;

const SECTION_HEADING = "text-3xl font-extrabold tracking-normal text-accent md:text-4xl";
const CARD = "rounded-lg border border-border bg-background p-6";

const Mcp = () => {
  const { t, i18n } = useTranslation();

  return (
    // --blueprint-column is the width of the ruled content column the backdrop
    // draws, matched to the max-width the sections below lay out to.
    <div className="min-h-screen flex flex-col bg-background [--blueprint-column:64rem]">
      <Seo
        title={`${t("mcp.meta.title")} | ${SITE_NAME}`}
        description={t("mcp.meta.description")}
        canonicalUrl={`${SITE_URL}/mcp/`}
        language={i18n.language}
      />

      <main id="main-content" className="flex-1">
        {/* Hero — Sentry's split: the pitch on the left, the thing you came for
            (the URL, in a terminal) on the right. */}
        <section
          id="mcp-hero"
          className="relative isolate -mt-[76px] overflow-hidden border-b border-border bg-background pt-[76px]"
        >
          <BlueprintBackdrop />

          <div className="layout-container relative z-10 py-14 md:py-20">
            <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <Eyebrow className="mb-4">{t("mcp.hero.eyebrow")}</Eyebrow>

                <h1 className="font-hero-title">
                  {t("mcp.hero.title")}{" "}
                  <span className="text-accent">{t("mcp.hero.titleAccent")}</span>
                </h1>

                <p className="font-hero-lede mt-6">{t("mcp.hero.description")}</p>
              </div>

              <div>
                <TerminalWindow
                  label={t("mcp.endpoint.label")}
                  action={<TerminalCopyButton value={MCP_URL} label={t("mcp.endpoint.copyLabel")} />}
                  bodyClassName="px-4 py-4"
                >
                  <code className="block overflow-x-auto whitespace-nowrap font-mono text-base font-bold text-code-surface-foreground sm:text-lg">
                    {MCP_URL_ORIGIN}
                    <span className="text-code-surface-accent">{MCP_URL_PATH}</span>
                  </code>
                </TerminalWindow>

                <p className="mt-4 font-paragraph font-paragraph-foreground text-sm">
                  {t("mcp.endpoint.caption")}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild className="font-semibold">
                    <a href="#install">{t("mcp.hero.primaryCta")}</a>
                  </Button>
                  <Button asChild variant="outline" className="font-semibold">
                    <a href="#tools">{t("mcp.hero.secondaryCta")}</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Installation — Sentry's tabbed client picker. One tab per client
            shows the commands one at a time instead of as a wall of four. */}
        <section id="install" className="relative isolate overflow-hidden py-14 md:py-20">
          <BlueprintBackdrop />

          <div className="layout-container relative z-10">
            <div className="mx-auto max-w-5xl">
              <h2 className={SECTION_HEADING}>{t("mcp.install.title")}</h2>
              <p className="mt-3 max-w-2xl font-paragraph font-paragraph-foreground">
                {t("mcp.install.body")}
              </p>

              <Tabs defaultValue="claude" className="mt-8">
                <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/60 p-1">
                  {CLIENTS.map(({ key }) => (
                    <TabsTrigger key={key} value={key} className="font-semibold">
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

        {/* Prompts, as one terminal session rather than a card grid — the
            closest thing this page has to Sentry's animated demo panel. */}
        <section
          id="prompts"
          className="relative isolate overflow-hidden border-y border-border bg-muted/10 py-14 md:py-20"
        >
          <BlueprintBackdrop />

          <div className="layout-container relative z-10">
            <div className="mx-auto max-w-5xl">
              <h2 className={SECTION_HEADING}>{t("mcp.prompts.title")}</h2>
              <p className="mt-3 max-w-2xl font-paragraph font-paragraph-foreground">
                {t("mcp.prompts.body")}
              </p>

              <TerminalWindow
                label={t("mcp.prompts.terminalLabel")}
                className="mt-8"
                bodyClassName="px-4 py-4 sm:px-6 sm:py-5"
              >
                <ul className="space-y-3.5">
                  {PROMPT_KEYS.map((key) => (
                    <li key={key} className="flex gap-3">
                      <span
                        className="shrink-0 select-none font-mono text-sm text-code-surface-accent"
                        aria-hidden="true"
                      >
                        &gt;
                      </span>
                      {/* Not font-mono: these are questions, not commands, and
                          monospace Devanagari sets badly — the fallback face
                          loses the conjuncts and spaces matras oddly. The caret
                          above carries the terminal reading on its own. */}
                      <span className="text-sm leading-relaxed text-code-surface-foreground">
                        {t(`mcp.prompts.items.${key}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </TerminalWindow>
            </div>
          </div>
        </section>

        <section id="tools" className="relative isolate overflow-hidden py-14 md:py-20">
          <BlueprintBackdrop />

          <div className="layout-container relative z-10">
            <div className="mx-auto max-w-5xl">
              <h2 className={SECTION_HEADING}>{t("mcp.tools.title")}</h2>
              <p className="mt-3 max-w-2xl font-paragraph font-paragraph-foreground">
                {t("mcp.tools.body")}
              </p>

              <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {TOOL_GROUPS.map(({ key, icon: Icon, tools }) => (
                  <div key={key} className={CARD}>
                    <Icon className="h-5 w-5 text-accent" aria-hidden="true" />

                    <p className="mt-3 text-lg font-bold text-primary">
                      {t(`mcp.tools.groups.${key}.name`)}
                    </p>
                    <p className="mt-2 font-paragraph font-paragraph-foreground text-sm">
                      {t(`mcp.tools.groups.${key}.description`)}
                    </p>

                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {tools.map((tool) => (
                        <li
                          key={tool}
                          className="rounded border border-white/10 bg-code-surface px-1.5 py-0.5 font-mono text-xs text-code-surface-foreground/80"
                        >
                          {tool}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="scope"
          className="relative isolate overflow-hidden border-y border-border bg-muted/10 py-14 md:py-20"
        >
          <BlueprintBackdrop />

          <div className="layout-container relative z-10">
            <div className="mx-auto max-w-5xl">
              <ShieldCheck className="h-6 w-6 text-accent" aria-hidden="true" />
              <h2 className={`mt-3 ${SECTION_HEADING}`}>{t("mcp.scope.title")}</h2>

              <dl className="mt-10 grid gap-6 md:grid-cols-2">
                {SCOPE_KEYS.map((key) => (
                  <div key={key} className={CARD}>
                    <dt className="text-lg font-bold text-primary">
                      {t(`mcp.scope.items.${key}.name`)}
                    </dt>
                    <dd className="mt-2 font-paragraph font-paragraph-foreground text-sm">
                      {t(`mcp.scope.items.${key}.description`)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section id="learn-more" className="relative isolate overflow-hidden py-14 md:py-20">
          <BlueprintBackdrop />

          <div className="layout-container relative z-10">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className={SECTION_HEADING}>{t("mcp.learnMore.title")}</h2>
              <p className="mt-3 font-paragraph font-paragraph-foreground">
                {t("mcp.learnMore.body")}
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button asChild variant="outline" className="font-semibold">
                  <a href={`${API_BASE_URL}/api/swagger/`} target="_blank" rel="noopener noreferrer">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    {t("mcp.learnMore.apiDocs")}
                  </a>
                </Button>

                <Button asChild variant="outline" className="font-semibold">
                  <a
                    href="https://github.com/Jawafdehi/JawafdehiAPI"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4" aria-hidden="true" />
                    {t("mcp.learnMore.source")}
                  </a>
                </Button>

                <Button asChild variant="outline" className="font-semibold">
                  <a
                    href="https://modelcontextprotocol.io"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    {t("mcp.learnMore.protocol")}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Mcp;
