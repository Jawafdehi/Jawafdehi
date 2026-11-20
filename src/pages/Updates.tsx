import type { ReactNode } from "react";
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
import { articlePath } from "@/lib/article-path";
import { DotField, ProductTile } from "@/components/updates/feed-tiles";
import { entriesFor } from "@/data/whats-new";
import { getArticles } from "@/services/cms-api";
import type { ArticleCategory, ArticleListItem } from "@/types/cms";
import { formatPublicationDate } from "@/utils/date";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

// Product updates (the platform changelog, src/data/whats-new.ts) are the third
// kind of post here, next to the CMS's News and Updates, all in one feed by
// date. The filter lives in the URL (?filter=product) so the retired /whats-new
// can redirect onto it.
// Blog posts have their own page (/blog), so Updates & News never filters to them.
type Filter = "ALL" | Exclude<ArticleCategory, "BLOG"> | "PRODUCT";
const FILTERS: Filter[] = ["ALL", "NEWS", "UPDATE", "PRODUCT"];
const FILTER_PARAM: Record<Filter, string> = { ALL: "", NEWS: "news", UPDATE: "update", PRODUCT: "product" };
const FILTER_LABEL: Record<Filter, string> = { ALL: "All", NEWS: "News", UPDATE: "Updates", PRODUCT: "Product updates" };

function readFilter(value: string | null): Filter {
  return (Object.keys(FILTER_PARAM) as Filter[]).find((key) => key !== "ALL" && FILTER_PARAM[key] === value) ?? "ALL";
}

/** The feed's grid: three across on desktop, two on a tablet, one on a phone. */
export const FEED_GRID = "grid grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3";

/**
 * One story, in the AngelList / Beside / Lightdash listing shape: no card
 * frame, just a rounded 16:9 picture, the category pill and the date under
 * it, the title, one line of excerpt, and "Read more" on the right. A story
 * with no picture gets a quiet patterned tile of the same size, so the grid
 * stays even. The whole story is the link; press scales it to 0.99.
 */
export function StoryTile({ article }: Readonly<{ article: ArticleListItem }>) {
  const { t } = useTranslation();
  const image = article.thumbnail?.url;

  return (
    <Link
      to={articlePath(article)}
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
          <DotField>
            <img src="/assets/logo.svg" alt="" className="relative h-7 w-auto opacity-40 dark:hidden" />
          </DotField>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-5">
        <div className="flex items-center justify-between gap-3">
          <CaseTagBadge className="px-3 py-1 text-sm">
            {t(`updates.category.${article.category}`, article.category === "NEWS" ? "News" : article.category === "BLOG" ? "Blog" : "Update")}
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
export function FeedSkeleton() {
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
  const choose = (next: Filter) => {
    const params = new URLSearchParams();
    if (FILTER_PARAM[next]) params.set("filter", FILTER_PARAM[next]);
    setSearchParams(params, { replace: true });
  };

  const { data: articles, isLoading, isError } = useQuery({
    queryKey: ["cms-articles"],
    queryFn: () => getArticles(),
  });

  // One feed, newest first: the CMS's stories and the product updates side by
  // side. Product updates are static, so "Product updates" never waits on the CMS.
  type FeedItem = { key: string; date: string; node: ReactNode };
  const stories: FeedItem[] =
    filter === "PRODUCT"
      ? []
      : (articles ?? [])
          // Blog posts live on /blog, never in this feed.
          .filter((article) => article.category !== "BLOG" && (filter === "ALL" || article.category === filter))
          .map((article) => ({ key: `a-${article.id}`, date: article.date, node: <StoryTile article={article} /> }));
  const products: FeedItem[] =
    filter === "ALL" || filter === "PRODUCT"
      ? entriesFor({}).map((entry) => ({ key: `p-${entry.id}`, date: entry.date, node: <ProductTile entry={entry} /> }))
      : [];
  const feed = [...stories, ...products].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const waiting = filter !== "PRODUCT";

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

            {waiting && isError ? (
              <EmptyState
                kind="couldNotLoad"
                title={t("updates.errorTitle", "Updates didn't load")}
                description={t("updates.error", "We couldn't load updates right now. Please try again later.")}
              />
            ) : waiting && isLoading ? (
              <FeedSkeleton />
            ) : feed.length === 0 ? (
              <EmptyState
                kind="nothingYet"
                title={t("updates.emptyTitle", "Nothing here yet")}
                description={t("updates.empty", "No updates have been published yet.")}
              />
            ) : (
              <ul data-feed="updates" className={FEED_GRID}>
                {feed.map((item) => (
                  // Every cell the same height: a product card stretches to the
                  // picture stories beside it, its Read more at the foot.
                  <li key={item.key}>{item.node}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Updates;
