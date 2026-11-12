import { useEffect, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { FileText, Gavel, Home, Newspaper, Scale, Search } from "@/components/icons";
import { setPageDarkHero } from "@/lib/dark-hero";

const WAYS_ON = [
  { key: "home", to: "/", Icon: Home },
  { key: "cases", to: "/cases", Icon: Scale },
  { key: "materials", to: "/materials", Icon: FileText },
  { key: "courtcases", to: "/courtcases", Icon: Gavel },
  { key: "updates", to: "/updates", Icon: Newspaper },
] as const;

/**
 * The 404, on the home hero's stage: full-bleed navy with the archive's dither
 * field behind a solid navy panel. Here the field is a swirl, the dots
 * spiralling like a drain the missing page went down. In the panel: "404" in
 * the on-dark crimson, the title, one line, a white search pill into the
 * archive (the home hero's shape), and the places most links were heading,
 * each with its icon. The page tells the navbar it opens on navy, so the bar
 * reads light-on-dark above it as it does on /.
 */
const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    setPageDarkHero(true);
    return () => setPageDarkHero(false);
  }, []);

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <main id="main-content" className="flex-1">
      <Helmet>
        <title>Page Not Found | Jawafdehi</title>
      </Helmet>

      <section className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <ShaderBackdrop design="vortex" />
          {/* The field fades out under the transparent navbar, as on /. */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--primary-surface))_0px,hsl(var(--primary-surface))_60px,transparent_170px)]" />
        </div>

        <div className="layout-container grid min-h-[calc(100svh-76px)] place-items-center py-14">
          <div className="w-full max-w-3xl bg-primary-surface px-6 py-12 text-center sm:px-12 md:py-16">
            <p className="font-home-display text-6xl tabular-nums text-[hsl(var(--accent-on-dark))] md:text-7xl">
              {t("notFound.title")}
            </p>
            <h1 className="font-home-display mx-auto mt-5 max-w-2xl text-balance text-[clamp(2.1rem,4.4vw,3.5rem)] text-primary-foreground">
              {t("notFound.heading", "This page isn't in the archive.")}
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg leading-8 text-primary-foreground/75">
              {t(
                "notFound.line",
                "The link may be old or mistyped. The case, person or document you wanted is probably still here — search for it.",
              )}
            </p>

            <form
              onSubmit={search}
              role="search"
              className="mx-auto mt-9 flex w-full max-w-xl items-center gap-2 rounded-full bg-surface p-1.5 pl-5"
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform duration-150 ease-out active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Search className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </form>

            <nav aria-label={t("notFound.waysLabel", "Elsewhere on Jawafdehi")} className="mt-9">
              <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                {WAYS_ON.map(({ key, to, Icon }) => (
                  <li key={key}>
                    <Link
                      to={to}
                      className="group inline-flex items-center gap-1.5 rounded text-[15px] text-primary-foreground/80 transition-colors hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
                    >
                      <Icon
                        className="h-4 w-4 text-primary-foreground/55 transition-colors group-hover:text-primary-foreground"
                        aria-hidden="true"
                      />
                      {t(`notFound.ways.${key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
