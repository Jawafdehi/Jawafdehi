// /whats-new: the platform changelog. One list for the archive and every tool
// around it, filterable by tag (?tag=mcp is linkable, so a product page can
// send readers to its own slice). Entries live in src/data/whats-new.ts.
//
// The hero is the title on the white page, over the archive's diamond field
// inverted to light blue and faded out toward the words. Below, the entries in two columns, each with its tags and
// date above a large title.
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { Seo } from "@/components/Seo";
import { chipVariants } from "@/components/ui/chip";
import { Reveal } from "@/components/ui/reveal";
import { WhatsNewEntry } from "@/components/whats-new/whats-new-entry";
import { WHATS_NEW_TAGS, WHATS_NEW_UPDATED, entriesFor, tagsInUse, type WhatsNewTag } from "@/data/whats-new";
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

  const filterClass = (active: boolean) => chipVariants({ active });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`${t("whatsNew.meta.title")} | ${SITE_NAME}`}
        description={t("whatsNew.meta.description")}
        canonicalUrl={`${SITE_URL}/whats-new/`}
        language={i18n.language}
      />

      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden">
          {/* The archive's diamond field, inverted onto the white page and
              faded out toward the title, so it frames rather than boxes. */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 -z-10 w-full md:w-2/3 [mask-image:linear-gradient(to_left,#000_35%,transparent)]"
          >
            <ShaderBackdrop design="diamondLight" />
          </div>
          <div className="layout-container py-16 md:py-24">
            <p className="text-sm uppercase tracking-wider text-muted-foreground [:root[lang=ne]_&]:normal-case [:root[lang=ne]_&]:tracking-normal">
              {t("whatsNew.lastUpdated", { date: formatDate(WHATS_NEW_UPDATED) })}
            </p>
            <h1 className="font-home-display mt-4 text-4xl text-primary sm:text-5xl md:whitespace-nowrap md:text-6xl">
              {t("whatsNew.title")}
            </h1>
          </div>
        </section>

        <section className="pb-20 md:pb-28">
          <div className="layout-container">
            <div role="group" aria-label={t("whatsNew.filterLabel")} className="flex flex-wrap gap-1">
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
