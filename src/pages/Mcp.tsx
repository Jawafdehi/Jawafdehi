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
  Terminal,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Seo } from "@/components/Seo";
import { CopyButton, CopyField } from "@/components/mcp/copy-field";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHero } from "@/components/ui/page-hero";
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

// One card per vendor: where to paste the URL in the chat app, and the one-line
// equivalent for their coding CLI. Vendors without a CLI of their own (the
// editors) omit `command` and get the paste instructions alone.
const CLIENTS = [
  { key: "claude", command: `claude mcp add --transport http jawafdehi ${MCP_URL}` },
  { key: "openai", command: `codex mcp add jawafdehi --url ${MCP_URL}` },
  { key: "cursor", command: undefined },
  { key: "vscode", command: `code --add-mcp '{"name":"jawafdehi","type":"http","url":"${MCP_URL}"}'` },
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
        <PageHero
          id="mcp-hero"
          eyebrow={<Eyebrow className="mb-4">{t("mcp.hero.eyebrow")}</Eyebrow>}
          description={t("mcp.hero.description")}
          descriptionClassName="max-w-3xl"
          title={
            <>
              {t("mcp.hero.title")} <span className="text-accent">{t("mcp.hero.titleAccent")}</span>
            </>
          }
          actions={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="font-semibold">
                <a href="#clients">{t("mcp.hero.primaryCta")}</a>
              </Button>
              <Button asChild variant="outline" className="font-semibold">
                <a href="#tools">{t("mcp.hero.secondaryCta")}</a>
              </Button>
            </div>
          }
        />

        <section id="endpoint" className="bg-muted/10 py-12 md:py-16">
          <div className="layout-container">
            <div className="flex items-center justify-center gap-3">
              <code className="break-all text-center font-mono text-xl font-bold leading-tight text-foreground sm:text-2xl md:text-4xl lg:text-5xl">
                {MCP_URL_ORIGIN}
                <span className="text-accent">{MCP_URL_PATH}</span>
              </code>

              <CopyButton
                value={MCP_URL}
                label={t("mcp.endpoint.copyLabel")}
                iconClassName="h-5 w-5 md:h-6 md:w-6"
              />
            </div>

            <p className="mt-5 text-center font-paragraph font-paragraph-foreground text-sm">
              {t("mcp.endpoint.caption")}
            </p>
          </div>
        </section>

        <section id="clients" className="py-12 md:py-16">
          <div className="layout-container">
            <h2 className="mb-8 text-center text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
              {t("mcp.clients.title")}
            </h2>

            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
              {CLIENTS.map(({ key, command }) => (
                <div key={key} className="rounded-lg border border-border bg-background p-6">
                  <p className="text-lg font-bold text-primary">{t(`mcp.clients.${key}.name`)}</p>

                  <p className="mt-4 text-sm font-bold text-foreground">
                    {t(`mcp.clients.${key}.appLabel`)}
                  </p>
                  <p className="mt-1 font-paragraph font-paragraph-foreground text-sm">
                    {t(`mcp.clients.${key}.appSteps`)}
                  </p>

                  {command ? (
                    <>
                      <p className="mt-5 flex items-center gap-2 text-sm font-bold text-foreground">
                        <Terminal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        {t(`mcp.clients.${key}.cliLabel`)}
                      </p>
                      <div className="mt-2">
                        <CopyField value={command} label={t("mcp.clients.copyCommand")} />
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>

            <p className="mx-auto mt-8 max-w-3xl text-center font-paragraph font-paragraph-foreground text-sm">
              {t("mcp.clients.otherClients")}
            </p>
          </div>
        </section>

        <section id="prompts" className="bg-muted/10 py-12 md:py-16">
          <div className="layout-container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-3 text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
                {t("mcp.prompts.title")}
              </h2>
              <p className="font-paragraph font-paragraph-foreground">{t("mcp.prompts.body")}</p>
            </div>

            <ul className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PROMPT_KEYS.map((key) => (
                <li
                  key={key}
                  className="rounded-lg border border-border bg-background p-5 font-paragraph font-paragraph-foreground"
                >
                  {/* Typographic quotes, not a blockquote: these are things to
                      type, not passages being cited. */}
                  &ldquo;{t(`mcp.prompts.items.${key}`)}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="tools" className="py-12 md:py-16">
          <div className="layout-container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-3 text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
                {t("mcp.tools.title")}
              </h2>
              <p className="font-paragraph font-paragraph-foreground">{t("mcp.tools.body")}</p>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
              {TOOL_GROUPS.map(({ key, icon: Icon, tools }) => (
                <div key={key} className="rounded-lg border border-border bg-background p-6">
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
                        className="rounded border border-border bg-muted/30 px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                      >
                        {tool}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="scope" className="bg-muted/10 py-12 md:py-16">
          <div className="layout-container">
            <div className="mx-auto max-w-3xl text-center">
              <ShieldCheck className="mx-auto h-6 w-6 text-accent" aria-hidden="true" />
              <h2 className="mb-3 mt-3 text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
                {t("mcp.scope.title")}
              </h2>
            </div>

            <dl className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
              {SCOPE_KEYS.map((key) => (
                <div key={key} className="rounded-lg border border-border bg-background p-6">
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
        </section>

        <section id="learn-more" className="py-12 md:py-16">
          <div className="layout-container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-3 text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
                {t("mcp.learnMore.title")}
              </h2>
              <p className="font-paragraph font-paragraph-foreground">
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
