import { useEffect, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { FileText, Gavel, Home, Newspaper, Scale, Search } from "@/components/icons";
import { Eyebrow } from "@/components/ui/eyebrow";

const WAYS_ON = [
  { key: "home", to: "/", Icon: Home },
  { key: "cases", to: "/cases", Icon: Scale },
  { key: "materials", to: "/materials", Icon: FileText },
  { key: "courtcases", to: "/courtcases", Icon: Gavel },
  { key: "updates", to: "/updates", Icon: Newspaper },
] as const;

/** The redacted lines on the missing record: widths of each blacked-out bar. */
const REDACTED = ["92%", "78%", "86%", "54%", "88%", "70%", "40%"];

/**
 * The 404 as the archive would put it: a record that is not on file. On the
 * left, the message, a search into the archive and the places most links were
 * heading. On the right, the missing record itself: an archive card tilted on
 * the page, record no. 404, its lines redacted, a crimson "फेला परेन · NOT
 * FOUND" stamp across it, and a faint scan line passing down it as though the
 * archive were still looking (still under reduced motion).
 */
const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <main id="main-content" className="flex-1 bg-background">
      <Helmet>
        <title>Page Not Found | Jawafdehi</title>
      </Helmet>

      <div className="layout-container grid min-h-[calc(100svh-76px)] grid-cols-1 items-center gap-14 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-20">
        <div>
          <Eyebrow>{t("notFound.eyebrow", "Error 404")}</Eyebrow>
          <h1 className="font-home-display mt-4 max-w-xl text-balance text-4xl text-primary sm:text-5xl md:text-6xl">
            {t("notFound.heading", "This page isn't in the archive.")}
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
            {t(
              "notFound.line",
              "The link may be old or mistyped. The case, person or document you wanted is probably still here — search for it.",
            )}
          </p>

          <form
            onSubmit={search}
            role="search"
            className="mt-9 flex w-full max-w-lg items-center gap-2 rounded-full border border-border bg-surface p-1.5 pl-5 transition-[border-color,box-shadow] focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/[0.07]"
          >
            <label htmlFor="not-found-search" className="sr-only">
              {t("notFound.searchLabel", "Search the archive")}
            </label>
            <input
              id="not-found-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("notFound.searchPlaceholder", "Search cases, people and documents")}
              className="min-w-0 flex-1 bg-transparent text-base text-primary placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              aria-label={t("notFound.searchLabel", "Search the archive")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-surface text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </form>

          <nav aria-label={t("notFound.waysLabel", "Elsewhere on Jawafdehi")} className="mt-8">
            <ul className="flex flex-wrap items-center gap-2">
              {WAYS_ON.map(({ key, to, Icon }) => (
                <li key={key}>
                  <Link
                    to={to}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-muted px-4 text-[15px] text-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {t(`notFound.ways.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* The missing record. Decorative: everything it says is said above. */}
        <div aria-hidden="true" className="relative mx-auto w-full max-w-sm lg:max-w-none">
          <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-2 rounded-[22px] bg-muted" />
          <div className="relative -rotate-2 overflow-hidden rounded-[22px] border border-border/70 bg-surface p-6 shadow-[0_24px_48px_-28px_rgba(14,31,59,0.35)] md:p-7">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
              <img src="/assets/logo.svg" alt="" className="h-6 w-auto" />
              <span className="text-xs text-muted-foreground">{t("notFound.card.archive", "Archive record")}</span>
            </div>
            <dl className="mt-5 grid grid-cols-[6.5rem_1fr] gap-y-2.5 text-sm">
              <dt className="text-muted-foreground">{t("notFound.card.number", "Record no.")}</dt>
              <dd className="font-home-display text-lg tabular-nums leading-tight text-primary">404</dd>
              <dt className="text-muted-foreground">{t("notFound.card.status", "Status")}</dt>
              <dd>
                <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-accent">
                  {t("notFound.card.missing", "Not on file")}
                </span>
              </dd>
              <dt className="text-muted-foreground">{t("notFound.card.path", "Requested")}</dt>
              <dd className="truncate text-primary">{location.pathname}</dd>
            </dl>
            <div className="mt-6 space-y-3">
              {REDACTED.map((width, index) => (
                <span key={index} className="block h-3 rounded-sm bg-primary-surface/85" style={{ width }} />
              ))}
            </div>
            {/* The stamp. */}
            <div className="pointer-events-none absolute right-5 top-[52%] -rotate-[14deg] rounded-xl border-[3px] border-accent/80 bg-surface/85 px-4 py-2 text-center text-accent">
              <p className="font-home-display text-2xl leading-none">फेला परेन</p>
              <p className="mt-1 text-xs tracking-[0.25em]">NOT FOUND</p>
            </div>
            {/* The archive, still looking. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-[hsl(214_65%_52%/0.10)] to-transparent motion-safe:animate-[record-scan_3.2s_ease-in-out_infinite] motion-reduce:hidden" />
          </div>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
