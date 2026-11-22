// One product update (a changelog entry) as a post on Updates & News
// (/updates/product/<id>),
// set like a CMS article (ArticleView): breadcrumb, the product and the date,
// the title in the display face, the text, and the entry's link as the way on.
// Underneath, the next few product updates as feed tiles, so a reader keeps going.
// Entries are static (src/data/whats-new.ts), so every post is pre-rendered.
import { ArrowRight, ArrowUpRight, Calendar } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { Seo } from "@/components/Seo";
import { pageCard } from "@/utils/page-cards";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { ProductTile } from "@/components/updates/feed-tiles";
import { WHATS_NEW, entryById, whatsNewListPath, whatsNewPostPath } from "@/data/whats-new";
import NotFound from "@/pages/NotFound";
import { formatDateForLanguage } from "@/utils/date";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

export default function WhatsNewPost() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "ne" ? "ne" : "en";
  const entry = entryById(id);
  if (!entry) return <NotFound />;

  const external = entry.href ? /^https?:\/\//.test(entry.href) : false;
  const more = WHATS_NEW.filter((other) => other.id !== entry.id).slice(0, 3);
  const cta =
    "group inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-base text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`${entry.title[lang]} | ${SITE_NAME}`}
        description={entry.body[lang]}
        canonicalUrl={`${SITE_URL}${whatsNewPostPath(entry.id)}`}
        {...pageCard("updates")}
        type="article"
        publishedTime={entry.date}
        language={i18n.language}
      />
      <main id="main-content" className="flex-1 pb-20 pt-8 md:pt-12">
        <div className="layout-container">
          <PageBreadcrumb
            items={[
              { label: t("nav.home"), to: "/" },
              { label: t("updates.title"), to: "/updates" },
              { label: t("whatsNew.homeHeading"), to: whatsNewListPath() },
            ]}
          />
          <article className="mt-8 md:mt-10">
            <header className="mb-8 max-w-4xl">
              <span className="inline-flex h-8 items-center rounded-full bg-muted px-3.5 text-sm text-primary">
                {entry.tags.map((tag) => t(`whatsNew.tags.${tag}`)).join(" · ")}
              </span>
              <h1 className="font-home-display mt-5 text-balance text-4xl text-primary sm:text-5xl [:root[lang=en]_&]:leading-[1.08]">
                {entry.title[lang]}
              </h1>
              <p className="mt-5 flex items-center gap-2 text-[15px] text-muted-foreground">
                <Calendar className="h-[18px] w-[18px]" aria-hidden="true" />
                <time dateTime={entry.date}>{formatDateForLanguage(entry.date, "PP", null, lang).primary}</time>
              </p>
            </header>
            <p className="max-w-3xl text-lg leading-8 text-primary/85">{entry.body[lang]}</p>
            {entry.href && external ? (
              <a href={entry.href} target="_blank" rel="noreferrer" className={`${cta} mt-8`}>
                {t("whatsNew.more")}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
            {entry.href && !external ? (
              <Link to={entry.href} className={`${cta} mt-8`}>
                {t("whatsNew.more")}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ) : null}
          </article>

          {more.length > 0 ? (
            <section aria-labelledby="more-product-updates" className="mt-20 border-t border-border/70 pt-12">
              <h2 id="more-product-updates" className="font-home-display mb-8 text-3xl text-primary md:text-4xl">
                {t("whatsNew.moreHeading", "More product updates")}
              </h2>
              <ul className="grid list-none grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
                {more.map((other) => (
                  <li key={other.id}>
                    <ProductTile entry={other} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
