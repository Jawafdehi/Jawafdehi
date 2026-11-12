import { useEffect, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { SearchBar } from "@/components/ui/search-bar";

const WAYS_ON = [
  { key: "home", to: "/" },
  { key: "cases", to: "/cases" },
  { key: "materials", to: "/materials" },
  { key: "courtcases", to: "/courtcases" },
  { key: "updates", to: "/updates" },
] as const;

/**
 * The 404, after Orchid's and Apple's: one quiet centred column. A small
 * "404" over the title, one line, a search straight into the archive, and
 * plain links to where most visitors were heading. Nothing decorative: the
 * reader came for something else, and the page's job is to hand it back.
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
    <main id="main-content" className="flex flex-1 bg-background">
      <Helmet>
        <title>Page Not Found | Jawafdehi</title>
      </Helmet>

      <div className="layout-container flex min-h-[calc(100svh-76px)] flex-col items-center justify-center py-16 text-center">
        <p className="text-sm tracking-[0.2em] text-muted-foreground tabular-nums">{t("notFound.title")}</p>
        <h1 className="font-home-display mt-5 max-w-2xl text-balance text-4xl text-primary sm:text-5xl md:text-6xl">
          {t("notFound.heading", "This page isn't in the archive.")}
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
          {t(
            "notFound.line",
            "The link may be old or mistyped. The case, person or document you wanted is probably still here — search for it.",
          )}
        </p>

        <form onSubmit={search} className="mt-9 w-full max-w-lg" role="search">
          <label htmlFor="not-found-search" className="sr-only">
            {t("notFound.searchLabel", "Search the archive")}
          </label>
          <SearchBar
            id="not-found-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("notFound.searchPlaceholder", "Search cases, people and documents")}
            submitLabel={t("notFound.searchLabel", "Search the archive")}
            inputClassName="h-12 text-left"
          />
        </form>

        <nav aria-label={t("notFound.waysLabel", "Elsewhere on Jawafdehi")} className="mt-8">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {WAYS_ON.map(({ key, to }) => (
              <li key={key}>
                <Link
                  to={to}
                  className="rounded text-[15px] text-primary underline decoration-primary/25 underline-offset-[6px] transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t(`notFound.ways.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
};

export default NotFound;
