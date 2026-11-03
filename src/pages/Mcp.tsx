// The Jawafdehi MCP product page. The home page sells the archive; this page
// sells one way into it — the MCP server — so it carries its own design: the
// grain shader, warmer and louder than the home page's diamond field.
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  CalendarRange,
  FileSearch,
  Files,
  FolderSearch,
  Gavel,
  History,
  UserSearch,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { ConnectPanel } from "@/components/mcp/connect-panel";
import { Seo } from "@/components/Seo";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

// One card per public MCP tool, in plain words, with the tool's real name
// underneath. Keep in step with the server's anonymous tool catalogue.
const TOOLS: ReadonlyArray<{ key: string; tool: string; Icon: LucideIcon }> = [
  { key: "findCases", tool: "search_jawafdehi_cases", Icon: FolderSearch },
  { key: "readCase", tool: "get_jawafdehi_case", Icon: FileSearch },
  { key: "people", tool: "search_nes_entities", Icon: UserSearch },
  { key: "history", tool: "get_nes_entity_versions", Icon: History },
  { key: "courts", tool: "browse_court_data", Icon: Gavel },
  { key: "documents", tool: "browse_materials", Icon: Files },
  { key: "dates", tool: "convert_date", Icon: CalendarRange },
];

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
        <McpHero />

        <section id="clients" className="scroll-mt-24 py-16 md:py-24">
          <div className="layout-container">
            <Reveal>
              <h2 className="font-home-section-title text-primary">{t("mcp.connect.title")}</h2>
            </Reveal>

            <ConnectPanel />
          </div>
        </section>

        {/* Questions the archive can answer today: each one resolves against the
            live MCP (cases giribandhu-tea-estate-land-swap and
            us-court-widebody-bribery, checked 2026-10-30). */}
        <section id="try-asking" className="pb-16 md:pb-24">
          <div className="layout-container">
            <Reveal>
              <h2 className="font-home-section-title text-primary">{t("mcp.ask.title")}</h2>
            </Reveal>
            <ul className="mt-8 grid gap-x-10 gap-y-6 md:grid-cols-2">
              {(t("mcp.ask.prompts", { returnObjects: true }) as string[]).map((prompt, index) => (
                <li key={prompt}>
                  <Reveal delayMs={(index % 2) * 80}>
                    <p className="font-home-display border-l-2 border-accent pl-5 text-xl leading-snug text-foreground md:text-2xl">
                      “{prompt}”
                    </p>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="tools" className="pb-20 pt-4 md:pb-28">
          <div className="layout-container">
            <Reveal>
              <Eyebrow className="mb-4">{t("mcp.tools.eyebrow")}</Eyebrow>
              <h2 className="font-home-section-title max-w-3xl text-primary">{t("mcp.tools.title")}</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-foreground/70 md:text-lg">{t("mcp.tools.body")}</p>
            </Reveal>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TOOLS.map(({ key, tool, Icon }, index) => (
                <li key={key}>
                  <Reveal className="h-full" delayMs={(index % 4) * 70}>
                    <div className="flex h-full flex-col rounded-lg border border-border bg-surface p-5">
                      <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
                      <p className="mt-3 text-base font-semibold leading-6 text-foreground">
                        {t(`mcp.tools.items.${key}`)}
                      </p>
                      <code className="mt-auto pt-4 font-mono text-xs text-muted-foreground">{tool}</code>
                    </div>
                  </Reveal>
                </li>
              ))}

              {/* The eighth cell states the one rule that holds for all of them. */}
              <li>
                <Reveal className="h-full" delayMs={210}>
                  <div className="flex h-full flex-col justify-center rounded-lg border border-dashed border-primary/30 p-5">
                    <p className="text-sm font-semibold leading-6 text-primary">{t("mcp.tools.readOnly")}</p>
                  </div>
                </Reveal>
              </li>
            </ul>
          </div>
        </section>

      </main>
    </div>
  );
};

function McpHero() {
  const { t } = useTranslation();

  return (
    <section id="mcp-hero" className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <ShaderBackdrop design="grain" />
        {/* Navy pooled behind the copy column, so it reads over any frame. */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--primary-surface)/0.85)_0%,hsl(var(--primary-surface)/0.4)_45%,transparent_70%)]" />
      </div>

      <div className="layout-container flex min-h-[calc(100svh-76px)] flex-col justify-center pb-20 pt-10">
        <Link
          to="/"
          className="group inline-flex w-fit items-center gap-2.5 rounded text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60 focus-visible:ring-offset-4 focus-visible:ring-offset-primary-surface"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
          {t("mcp.hero.back")}
        </Link>

        <h1 className="font-home-display mt-10 max-w-[19ch] text-[clamp(2.6rem,6vw,5.25rem)] text-primary-foreground">
          {t("mcp.hero.title")}
        </h1>
        <p className="mt-6 max-w-2xl text-xl leading-8 text-primary-foreground/80 md:text-2xl md:leading-9">{t("mcp.hero.description")}</p>
      </div>
    </section>
  );
}

export default Mcp;
