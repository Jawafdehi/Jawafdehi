import { useEffect, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ArrowRight } from "@/components/icons";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SearchBar } from "@/components/ui/search-bar";

const WAYS_ON = [
  { key: "search", to: "/search" },
  { key: "cases", to: "/cases" },
  { key: "materials", to: "/materials" },
  { key: "courtcases", to: "/courtcases" },
] as const;

/**
 * The 404: a light page that owns the miss and points back into the archive.
 * The "404" itself is drawn in the archive's dot dither (a dot grid clipped to
 * the numerals), large and quiet behind the words. Below the line, a search
 * straight into the archive and the four places most links were heading.
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
    <main id="main-content" className="relative isolate flex-1 overflow-hidden bg-background">
      <Helmet>
        <title>Page Not Found | Jawafdehi</title>
      </Helmet>

      {/* The numerals, in dots: crimson fading to the archive's blue. */}
      <p
        aria-hidden="true"
        className="font-home-display pointer-events-none absolute -right-6 top-8 -z-10 select-none text-[clamp(10rem,32vw,26rem)] leading-none tracking-tight text-transparent [-webkit-background-clip:text] [background-clip:text] [background-image:radial-gradient(hsl(var(--accent))_1.6px,transparent_2.1px),linear-gradient(transparent,transparent)] [background-size:8px_8px] [mask-image:linear-gradient(to_bottom_left,#000_30%,transparent_85%)] md:right-4 md:top-12"
      >
        {t("notFound.title")}
      </p>

      <div className="layout-container flex min-h-[calc(100svh-76px)] flex-col justify-center py-16 md:py-24">
        <Eyebrow>{t("notFound.eyebrow", "Page not found")}</Eyebrow>
        <h1 className="font-home-display mt-4 max-w-3xl text-4xl text-primary sm:text-5xl md:text-6xl">
          {t("notFound.heading", "This page isn't in the archive.")}
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
          {t(
            "notFound.line",
            "The link may be old or mistyped. The case, person or document you wanted is probably still here — search for it.",
          )}
        </p>

        <form onSubmit={search} className="mt-8 w-full max-w-xl" role="search">
          <label htmlFor="not-found-search" className="sr-only">
            {t("notFound.searchLabel", "Search the archive")}
          </label>
          <SearchBar
            id="not-found-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("notFound.searchPlaceholder", "Search cases, people and documents")}
            submitLabel={t("notFound.searchLabel", "Search the archive")}
            className="[&_input]:h-12"
          />
        </form>

        <ul className="mt-10 flex max-w-2xl flex-wrap gap-2">
          {WAYS_ON.map(({ key, to }) => (
            <li key={key}>
              <Link
                to={to}
                className="group inline-flex h-10 items-center gap-1.5 rounded-full bg-muted px-4 text-[15px] text-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100"
              >
                {t(`notFound.ways.${key}`)}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>

        <Link
          to="/"
          className="mt-8 w-fit rounded text-base text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("notFound.returnHome")}
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
