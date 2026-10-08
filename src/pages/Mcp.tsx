import { Github, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Seo } from "@/components/Seo";
import { CopyField } from "@/components/mcp/copy-field";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHero } from "@/components/ui/page-hero";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

// The canonical MCP endpoint, pinned rather than derived from API_BASE_URL.
// API_BASE_URL resolves to "" during pre-render and to window.location.origin in
// the browser when no build-time override is set, so deriving it would publish a
// relative path in the pre-rendered HTML and then hydrate to the SPA's own
// origin — neither of which is where the server lives. This string is the one
// thing a reader copies off the page, so it is written out in full.
const MCP_URL = "https://api.jawafdehi.org/mcp";

const REPO_URL = "https://github.com/Jawafdehi/jawafdehi-mcp";

// One card per vendor: where to paste the URL in the chat app, and the one-line
// equivalent for their coding CLI.
const CLIENTS = [
  { key: "claude", command: `claude mcp add --transport http jawafdehi ${MCP_URL}` },
  { key: "openai", command: `codex mcp add jawafdehi --url ${MCP_URL}` },
] as const;

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
        />

        <section id="endpoint" className="bg-muted/10 py-12 md:py-16">
          <div className="layout-container">
            <div className="mx-auto max-w-2xl">
              <h2 className="mb-3 text-center text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
                {t("mcp.endpoint.title")}
              </h2>
              <p className="mb-6 text-center font-paragraph font-paragraph-foreground">
                {t("mcp.endpoint.intro")}
              </p>

              <CopyField value={MCP_URL} label={t("mcp.endpoint.copyLabel")} />

              <p className="mt-4 text-center text-sm text-muted-foreground">
                {t("mcp.endpoint.note")}
              </p>
            </div>
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

                  <p className="mt-5 flex items-center gap-2 text-sm font-bold text-foreground">
                    <Terminal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {t(`mcp.clients.${key}.cliLabel`)}
                  </p>
                  <div className="mt-2">
                    <CopyField value={command} label={t("mcp.clients.copyCommand")} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="tools" className="bg-muted/10 py-12 md:py-16">
          <div className="layout-container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-3 text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
                {t("mcp.tools.title")}
              </h2>
              <p className="font-paragraph font-paragraph-foreground">{t("mcp.tools.body")}</p>

              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-accent"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                {t("mcp.tools.repo")}
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Mcp;
