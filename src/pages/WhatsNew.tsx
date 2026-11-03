// /whats-new: the platform changelog. One list for the archive and every tool
// around it, filterable by tag (?tag=mcp is linkable, so a product page can
// send readers to its own slice). Entries live in src/data/whats-new.ts.
//
// The hero pairs two shapes: a disc running the archive's diamond shader, and
// a half-disc in the products' grain, so the page shows what it covers before
// a word is read. Below, the entries in two columns, each with its tags and
// date above a large title.
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { GrainTexture } from "@/components/brand-shaders/grain-texture";
import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { Seo } from "@/components/Seo";
import { Reveal } from "@/components/ui/reveal";
import { WhatsNewEntry } from "@/components/whats-new/whats-new-entry";
import { WHATS_NEW_TAGS, WHATS_NEW_UPDATED, entriesFor, tagsInUse, type WhatsNewTag } from "@/data/whats-new";
import { cn } from "@/lib/utils";
import { formatDateForLanguage } from "@/utils/date";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

function isTag(value: string | null): value is WhatsNewTag {
  return value !== null && (WHATS_NEW_TAGS as readonly string[]).includes(value);
}

const WhatsNew = () => {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const requested = params.get("tag");
  const tag = isTag(requested) ? requested : undefined;
  const lang = i18n.language === "ne" ? "ne" : "en";
  const formatDate = (iso: string) => formatDateForLanguage(iso, "PP", null, lang).primary;

  const entries = entriesFor({ tag });

  const choose = (next?: WhatsNewTag) => {
    const nextParams = new URLSearchParams(params);
    if (next) nextParams.set("tag", next);
    else nextParams.delete("tag");
    setParams(nextParams, { replace: true });
  };

  const filterClass = (active: boolean) =>
    cn(
      "rounded-full border px-4 py-2 text-base font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      active
        ? "border-primary-surface bg-primary-surface text-primary-foreground"
        : "border-border text-foreground/75 hover:border-primary-surface/40 hover:text-foreground",
    );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`${t("whatsNew.meta.title")} | ${SITE_NAME}`}
        description={t("whatsNew.meta.description")}
        canonicalUrl={`${SITE_URL}/whats-new/`}
        language={i18n.language}
      />

      <main id="main-content" className="flex-1">
        <section className="layout-container grid items-center gap-12 py-14 md:grid-cols-2 md:py-20">
          <div aria-hidden="true" className="flex items-center">
            <div className="relative isolate aspect-square w-[58%] overflow-hidden rounded-full bg-primary-surface">
              <ShaderBackdrop design="diamond" />
            </div>
            {/* The half-disc: a full circle, clipped to its left half, with the
                texture mirrored so its ember light falls on the half that shows. */}
            <div className="relative aspect-square w-[42%] overflow-hidden [clip-path:inset(0_50%_0_0)] md:w-[38%]">
              <GrainTexture className="absolute inset-0 -scale-x-100 rounded-full" />
            </div>
          </div>

          <div>
            <p className="text-sm uppercase tracking-wider text-muted-foreground [:root[lang=ne]_&]:normal-case [:root[lang=ne]_&]:tracking-normal">
              {t("whatsNew.lastUpdated", { date: formatDate(WHATS_NEW_UPDATED) })}
            </p>
            <h1 className="font-home-display mt-4 text-5xl text-primary md:text-6xl">{t("whatsNew.title")}</h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-foreground/70">{t("whatsNew.description")}</p>
          </div>
        </section>

        <section className="pb-20 md:pb-28">
          <div className="layout-container">
            <div role="group" aria-label={t("whatsNew.filterLabel")} className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={!tag} onClick={() => choose()} className={filterClass(!tag)}>
                {t("whatsNew.all")}
              </button>
              {tagsInUse().map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={tag === option}
                  onClick={() => choose(option)}
                  className={filterClass(tag === option)}
                >
                  {t(`whatsNew.tags.${option}`)}
                </button>
              ))}
            </div>

            <ul className="mt-14 grid gap-x-14 gap-y-16 md:grid-cols-2">
              {entries.map((entry, index) => (
                <li key={entry.id}>
                  <Reveal delayMs={(index % 2) * 80}>
                    <WhatsNewEntry entry={entry} size="large" />
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default WhatsNew;
