import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Seo } from "@/components/Seo";
import { getArticles } from "@/services/cms-api";
import { UpdateCardSkeleton } from "@/components/UpdateCardSkeleton";
import type { ArticleListItem } from "@/types/cms";
import { cn } from "@/lib/utils";
import { formatPublicationDate } from "@/utils/date";
import {
    CalendarIcon,
    ChevronRight,
    FileText,
    LayoutGrid,
    List,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

type ViewMode = "cards" | "list";

// Shared by the loaded grid and its skeleton so the two can't drift out of step —
// the placeholder has to occupy the same layout the articles land in.
//
// `auto-rows-fr` is what keeps card heights consistent: a plain grid only
// equalises cells *within* a row, so a row of short excerpts renders visibly
// shorter cards than the row above it. Sizing every implicit row to the same
// fraction makes the whole grid uniform, and <UpdateCard>'s `min-h-full` +
// `justify-between` then fill the cell and pin "Read More" to the bottom edge.
//
// Breakpoints follow /cases (`md` → 2 columns, `lg` → 3), which is the canonical
// content-card grid on the site. List view stays single-column, so it must NOT
// get `auto-rows-fr` — the excerpt is unclamped there and equalising rows would
// pad every short entry out to the tallest one.
const gridClass = (isCardView: boolean) =>
    isCardView ? "grid auto-rows-fr gap-6 md:grid-cols-2 lg:grid-cols-3" : "grid gap-5";

// Enough placeholders to fill the fold without over-promising how much is coming:
// two rows of the desktop card grid, or three of the much taller list rows.
const SKELETON_COUNT = { cards: 6, list: 3 } as const;

type UpdateCardProps = {
    article: ArticleListItem;
    viewMode: ViewMode;
};

const UpdateCard = ({ article, viewMode }: UpdateCardProps) => {
    const { t } = useTranslation();
    const isList = viewMode === "list";

    return (
        <Link
            to={`/updates/${article.meta.slug}`}
            className="group flex min-h-full flex-col overflow-hidden rounded-3xl bg-card shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(15,23,42,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:data-[view=list]:flex-row"
            data-view={viewMode}
        >
            {article.thumbnail?.url ? (
                <div className="h-52 overflow-hidden border-b border-border/70 bg-muted md:data-[view=list]:h-auto md:data-[view=list]:min-h-52 md:data-[view=list]:w-80 md:data-[view=list]:shrink-0 md:data-[view=list]:border-b-0 md:data-[view=list]:border-r" data-view={viewMode}>
                    <img
                        src={article.thumbnail.url}
                        alt={article.thumbnail.alt || ""}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />
                </div>
            ) : (
                <div className="flex h-52 items-center justify-center border-b border-border/70 bg-gradient-to-br from-secondary via-muted to-background text-primary md:data-[view=list]:h-auto md:data-[view=list]:min-h-52 md:data-[view=list]:w-80 md:data-[view=list]:shrink-0 md:data-[view=list]:border-b-0 md:data-[view=list]:border-r" data-view={viewMode}>
                    <div className="grid h-16 w-16 place-items-center rounded-2xl border border-primary/15 bg-background shadow-sm">
                        <FileText className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                </div>
            )}

            <div className="flex flex-1 flex-col justify-between gap-5 p-4 sm:p-5">
                <div>
                    <div className="mb-3 flex items-center gap-2 text-sm leading-5 text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                        <span>{formatPublicationDate(article.date)}</span>
                    </div>
                    <h2 className="line-clamp-2 text-lg font-semibold leading-8 tracking-normal text-foreground transition-colors group-hover:text-primary">
                        {article.title}
                    </h2>
                    <p className={isList ? "mt-4 max-w-3xl text-sm leading-7 text-muted-foreground" : "mt-4 line-clamp-3 text-sm leading-7 text-muted-foreground"}>
                        {article.excerpt}
                    </p>
                </div>

                <span className="inline-flex items-center text-sm font-semibold text-primary">
                    {t("updates.readMore")}
                    <ChevronRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </span>
            </div>
        </Link>
    );
};

const Updates = () => {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<ViewMode>("cards");
    const isCardView = viewMode === "cards";

    const { data: articles, isLoading, isError } = useQuery({
        queryKey: ["cms-articles"],
        queryFn: () => getArticles(),
    });

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Seo
                title={`Updates | ${SITE_NAME}`}
                description="Latest news, announcements, and updates from the Jawafdehi team on Nepal's corruption accountability platform."
                canonicalUrl={`${SITE_URL}/updates/`}
            />

            <main id="main-content" className="flex-1">
                <section className="relative isolate bg-background py-8 md:py-12 lg:py-16">
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 opacity-[0.24] [background-image:radial-gradient(hsl(var(--foreground)/0.14)_0.75px,transparent_0.75px)] [background-size:18px_18px]"
                    />

                    <div className="layout-container space-y-8 animate-fade-in">
                        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                            <div className="max-w-3xl">
                                <h1 className="text-4xl font-extrabold leading-tight tracking-normal text-primary md:text-5xl">
                                    {t("updates.title")}
                                </h1>
                                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
                                    {t("updates.description")}
                                </p>
                            </div>

                            <fieldset
                                aria-label="Choose updates layout"
                                className="relative inline-flex h-10 w-[92px] shrink-0 items-center overflow-hidden rounded-full border border-border/70 bg-background/70 px-1 text-sm font-semibold leading-none text-foreground shadow-sm shadow-foreground/5 transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-background hover:shadow-md"
                            >
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        "absolute top-1/2 h-8 w-10 -translate-y-1/2 rounded-full bg-foreground shadow-sm transition-transform duration-200 motion-reduce:transition-none",
                                        isCardView ? "translate-x-0" : "translate-x-[42px]",
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => setViewMode("cards")}
                                    aria-pressed={isCardView}
                                    aria-label="Card view"
                                    title="Card view"
                                    className={cn(
                                        "relative z-10 grid h-full flex-1 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                        isCardView ? "text-background" : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("list")}
                                    aria-pressed={!isCardView}
                                    aria-label="List view"
                                    title="List view"
                                    className={cn(
                                        "relative z-10 grid h-full flex-1 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                        isCardView ? "text-muted-foreground hover:text-foreground" : "text-background",
                                    )}
                                >
                                    <List className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </fieldset>
                        </div>

                        {isError ? (
                            <p className="text-muted-foreground">
                                We couldn't load updates right now. Please try again later.
                            </p>
                        ) : isLoading ? (
                            <output
                                aria-label={t("updates.loading", "Loading updates")}
                                className={gridClass(isCardView)}
                            >
                                {Array.from({ length: SKELETON_COUNT[viewMode] }, (_, index) => (
                                    <UpdateCardSkeleton key={index} viewMode={viewMode} />
                                ))}
                            </output>
                        ) : !articles || articles.length === 0 ? (
                            <p className="text-muted-foreground">No updates have been published yet.</p>
                        ) : (
                            <div className={gridClass(isCardView)}>
                                {articles.map((article) => (
                                    <UpdateCard key={article.id} article={article} viewMode={viewMode} />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Updates;
