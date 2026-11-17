import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Calendar } from "@/components/icons";
import { useTranslation } from "react-i18next";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { CaseTagBadge } from "@/components/CaseBadge";
import { Seo } from "@/components/Seo";
import { chipVariants } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsNewBento } from "@/components/whats-new/whats-new-bento";
import { asWhatsNewTag, entriesFor, tagsInUse, whatsNewListPath } from "@/data/whats-new";
import { getArticles } from "@/services/cms-api";
import type { ArticleCategory, ArticleListItem } from "@/types/cms";
import { formatPublicationDate } from "@/utils/date";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

// What's new (the platform changelog, src/data/whats-new.ts) is the third kind
// of post here, next to the CMS's News and Updates. The filter lives in the URL
// (?filter=whats-new) so the retired /whats-new can redirect onto it.
type Filter = "ALL" | ArticleCategory | "WHATS_NEW";
const FILTERS: Filter[] = ["ALL", "WHATS_NEW", "NEWS", "UPDATE"];
const FILTER_PARAM: Record<Filter, string> = { ALL: "", WHATS_NEW: "whats-new", NEWS: "news", UPDATE: "update" };
const FILTER_LABEL: Record<Filter, string> = { ALL: "All", WHATS_NEW: "What's new", NEWS: "News", UPDATE: "Updates" };

function readFilter(value: string | null): Filter {
  return (Object.keys(FILTER_PARAM) as Filter[]).find((key) => key !== "ALL" && FILTER_PARAM[key] === value) ?? "ALL";
}

/** In "All", the bento band shows this many entries: a feature and four tiles fill 4 x 2. */
const BENTO_PREVIEW = 5;

/** The feed's grid: three across on desktop, two on a tablet, one on a phone. */
const FEED_GRID = "grid grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3";

/**
 * One story, in the AngelList / Beside / Lightdash listing shape: no card
 * frame, just a rounded 16:9 picture, the category pill and the date under
 * it, the title, one line of excerpt, and "Read more" on the right. A story
 * with no picture gets a quiet patterned tile of the same size, so the grid
 * stays even. The whole story is the link; press scales it to 0.99.
 */
function StoryTile({ article }: Readonly<{ article: ArticleListItem }>) {
  const { t } = useTranslation();
  const image = article.thumbnail?.url;

  return (
    <Link
      to={`/updates/${article.meta.slug}`}
      data-shape={image ? "picture" : "text"}
      className="group flex h-full flex-col rounded-[22px] transition-transform duration-150 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 motion-reduce:active:scale-100"
    >
      <div className="relative aspect-video overflow-hidden rounded-[22px] bg-muted">
        {image ? (
          <img
            src={image}
            alt={article.thumbnail?.alt || ""}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          // No picture: the archive's dot field in pale blue, fading out, with
          // the wordmark — a placeholder that still reads as Jawafdehi.
          <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
            <div className="absolute inset-0 [background-image:radial-gradient(hsl(214_45%_70%)_1.2px,transparent_1.7px)] [background-size:9px_9px] [mask-image:radial-gradient(ellipse_at_70%_30%,#000_10%,transparent_70%)]" />
            <img src="/assets/logo.svg" alt="" className="relative h-7 w-auto opacity-40 dark:hidden" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-5">
        <div className="flex items-center justify-between gap-3">
          <CaseTagBadge className="px-3 py-1 text-sm">
            {t(`updates.category.${article.category}`, article.category === "NEWS" ? "News" : "Update")}
          </CaseTagBadge>
          <span className="inline-flex items-center gap-1.5 text-[15px] text-muted-foreground">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {formatPublicationDate(article.date)}
          </span>
        </div>
        <h2 className="mt-4 line-clamp-2 text-xl font-normal leading-snug text-primary underline-offset-4 decoration-primary/30 group-hover:underline">
          {article.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-[15px] leading-6 text-muted-foreground">{article.excerpt}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 self-end pt-4 text-[15px] font-medium text-primary">
          {t("updates.readMore")}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

/** The feed while it loads: the same grid, as quiet blocks. */
function FeedSkeleton() {
  const { t } = useTranslation();
  return (
    <output aria-label={t("updates.loading", "Loading updates")} className={FEED_GRID}>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} aria-hidden="true" data-skeleton="">
          <Skeleton className="aspect-video w-full rounded-[22px]" />
          <div className="space-y-3 pt-5">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </output>
  );
}

const Updates = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = readFilter(searchParams.get("filter"));
  const tag = filter === "WHATS_NEW" ? asWhatsNewTag(searchParams.get("tag")) : undefined;
  const choose = (next: Filter, nextTag?: string) => {
    const params = new URLSearchParams();
    if (FILTER_PARAM[next]) params.set("filter", FILTER_PARAM[next]);
    if (nextTag) params.set("tag", nextTag);
    setSearchParams(params, { replace: true });
  };

  const { data: articles, isLoading, isError } = useQuery({
    queryKey: ["cms-articles"],
    queryFn: () => getArticles(),
  });

  const shown = (articles ?? []).filter((article) => filter === "ALL" || article.category === filter);
  const showArticles = filter !== "WHATS_NEW";
  const changelog =
    filter === "WHATS_NEW"
      ? entriesFor({ tag })
      : filter === "ALL"
        ? entriesFor({ pinnedFirst: true, limit: BENTO_PREVIEW })
        : [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`Updates | ${SITE_NAME}`}
        description="Latest news, announcements, and updates from the Jawafdehi team on Nepal's corruption accountability platform."
        canonicalUrl={`${SITE_URL}/updates/`}
      />

      <main id="main-content" className="flex-1">
        {/* A light hero like /whats-new and /products: the archive's diamond
            field inverted onto the white page, the site's eyebrow, the title. */}
        <section aria-labelledby="updates-title" className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 -z-10 w-full md:w-2/3 [mask-image:linear-gradient(to_left,#000_35%,transparent)]"
          >
            <ShaderBackdrop design="diamondLight" />
          </div>
          <div className="layout-container py-16 md:py-24">
            <Eyebrow>{t("updates.eyebrow", "From the team")}</Eyebrow>
            <h1 id="updates-title" className="font-home-display mt-4 text-4xl text-primary sm:text-5xl md:text-6xl">
              {t("updates.title")}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-7 text-muted-foreground">{t("updates.description")}</p>
          </div>
        </section>

        <section aria-labelledby="updates-title" className="pb-20 md:pb-28">
          <div className="layout-container">
            <div role="group" aria-label={t("updates.filterLabel", "Show")} className="mb-8 flex flex-wrap gap-1">
              {FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={filter === option}
                  onClick={() => choose(option)}
                  className={chipVariants({ active: filter === option })}
                >
                  {option === "ALL"
                    ? t("updates.all", "All")
                    : t(`updates.filter.${option}`, FILTER_LABEL[option])}
                </button>
              ))}
            </div>

            {/* What's new, by product, while that filter is on. */}
            {filter === "WHATS_NEW" ? (
              <div role="group" aria-label={t("whatsNew.filterLabel")} className="-mt-4 mb-8 flex flex-wrap gap-1">
                <button type="button" aria-pressed={!tag} onClick={() => choose("WHATS_NEW")} className={chipVariants({ active: !tag })}>
                  {t("whatsNew.all", "All")}
                </button>
                {tagsInUse().map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={tag === option}
                    onClick={() => choose("WHATS_NEW", option)}
                    className={chipVariants({ active: tag === option })}
                  >
                    {t(`whatsNew.tags.${option}`)}
                  </button>
                ))}
              </div>
            ) : null}

            {changelog.length > 0 ? (
              <section aria-labelledby="whats-new-heading" className={showArticles ? "mb-16 md:mb-20" : undefined}>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                  <h2 id="whats-new-heading" className="font-home-display text-3xl text-primary md:text-4xl">
                    {t("whatsNew.homeHeading", "What's new")}
                  </h2>
                  {filter === "ALL" ? (
                    <Link
                      to={whatsNewListPath()}
                      className="group inline-flex items-center gap-1.5 rounded text-base font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {t("whatsNew.seeAll", "Everything that's new")}
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
                <WhatsNewBento entries={changelog} />
              </section>
            ) : null}

            {showArticles ? (
              <section aria-labelledby={filter === "ALL" ? "articles-heading" : undefined}>
                {filter === "ALL" ? (
                  <h2 id="articles-heading" className="font-home-display mb-8 text-3xl text-primary md:text-4xl">
                    {t("updates.articlesHeading", "News and updates")}
                  </h2>
                ) : null}
              {isError ? (
                <EmptyState
                  kind="couldNotLoad"
                  title={t("updates.errorTitle", "Updates didn't load")}
                  description={t("updates.error", "We couldn't load updates right now. Please try again later.")}
                />
              ) : isLoading ? (
                <FeedSkeleton />
              ) : shown.length === 0 ? (
                <EmptyState
                  kind="nothingYet"
                  title={t("updates.emptyTitle", "Nothing here yet")}
                  description={t("updates.empty", "No updates have been published yet.")}
                />
              ) : (
                <ul data-feed="articles" className={FEED_GRID}>
                  {shown.map((article) => (
                    <li key={article.id}>
                      <StoryTile article={article} />
                    </li>
                  ))}
                </ul>
              )}
              </section>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Updates;
