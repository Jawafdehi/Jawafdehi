// "What's new": the latest additions to the archive, directly under the hero.
// For now one card, the MCP. A plain white card in the same family as the case
// cards below, so the light middle of the page reads as one surface.
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { NewBadge } from "@/components/home/new-badge";
import { Reveal } from "@/components/ui/reveal";

export function WhatsNew() {
  const { t } = useTranslation();

  return (
    <section id="whats-new" className="pb-4 pt-16 md:pt-24">
      <div className="layout-container">
        <Reveal>
          <h2 className="font-home-section-title text-primary">{t("home.whatsNew.heading")}</h2>
        </Reveal>

        <Reveal delayMs={80}>
          <Link
            to="/mcp"
            className="group mt-8 block rounded-3xl border border-border/60 bg-surface p-7 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(15,23,42,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 md:w-1/2 md:p-9"
          >
            <NewBadge />
            <h3 className="font-home-display mt-5 text-2xl text-primary md:text-3xl">{t("home.whatsNew.mcp.title")}</h3>
            <p className="mt-3 text-lg leading-8 text-foreground/70">{t("home.whatsNew.mcp.body")}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-base font-medium text-accent">
              {t("home.whatsNew.mcp.cta")}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
