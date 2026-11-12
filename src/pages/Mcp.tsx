// The Jawafdehi MCP product page. The home page sells the archive; this page
// sells one way into it — the MCP server — so it carries its own design: the
// grain shader, warmer than the home page's diamond field. The content follows
// the pilot flyer (November 2026); the sections are in mcp-sections.tsx and
// connect-panel.tsx.
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { ConnectPanel } from "@/components/mcp/connect-panel";
import { McpDemo, McpInside, McpOverview, McpPilot, McpQuestions, McpSkill } from "@/components/mcp/mcp-sections";
import { WhatsNewSection } from "@/components/whats-new/whats-new-section";
import { Seo } from "@/components/Seo";
import { Reveal } from "@/components/ui/reveal";
import { SITE_NAME, SITE_URL } from "@/utils/seo";


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
        <McpOverview />
        <McpInside />
        <McpDemo />
        <McpQuestions />

        <section id="clients" className="scroll-mt-24 pt-16 md:pt-24">
          <div className="layout-container">
            <Reveal>
              <h2 className="font-home-section-title text-primary">{t("mcp.connect.title")}</h2>
            </Reveal>
            <ConnectPanel />
          </div>
        </section>

        <McpSkill />
        <McpPilot />
        <WhatsNewSection id="mcp-whats-new" heading={t("whatsNew.mcpHeading")} tag="mcp" />
        <div className="pb-16 md:pb-24" />
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
