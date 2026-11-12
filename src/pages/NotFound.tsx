import { useEffect, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { FileText, Gavel, Home, Newspaper, Scale, Search } from "@/components/icons";
import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";

const WAYS_ON = [
  { key: "home", to: "/", Icon: Home },
  { key: "cases", to: "/cases", Icon: Scale },
  { key: "materials", to: "/materials", Icon: FileText },
  { key: "courtcases", to: "/courtcases", Icon: Gavel },
  { key: "updates", to: "/updates", Icon: Newspaper },
] as const;

// The numerals as a mask: an SVG "404" that the shader shows through. A data
// URI image cannot reach the page's web fonts, so the mask names a heavy
// system face; the digits only need to be broad enough to read the field in.
const DIGITS_MASK = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400"><text x="500" y="350" text-anchor="middle" font-family="Arial Black, Helvetica Neue, Arial, sans-serif" font-weight="900" font-size="420" letter-spacing="-18">404</text></svg>',
)}")`;

/**
 * The 404: a light page whose "404" is cut out of the archive's moving navy
 * dither field (the diamond shader seen through the numerals), with the
 * message, a search into the archive and the likeliest destinations below.
 * The digits are decorative; the h1 says what happened.
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

      <div className="layout-container flex min-h-[calc(100svh-76px)] flex-col items-center justify-center py-14 text-center">
        <div
          aria-hidden="true"
          className="relative aspect-[5/2] w-full max-w-3xl bg-primary-surface"
          style={{
            maskImage: DIGITS_MASK,
            WebkitMaskImage: DIGITS_MASK,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        >
          <ShaderBackdrop design="diamond" />
        </div>

        <h1 className="font-home-display mt-6 max-w-2xl text-balance text-4xl text-primary sm:text-5xl">
          {t("notFound.heading", "This page isn't in the archive.")}
        </h1>
        <p className="mt-4 max-w-lg text-lg leading-8 text-muted-foreground">
          {t(
            "notFound.line",
            "The link may be old or mistyped. The case, person or document you wanted is probably still here — search for it.",
          )}
        </p>

        <form
          onSubmit={search}
          role="search"
          className="mt-8 flex w-full max-w-lg items-center gap-2 rounded-full border border-border bg-surface p-1.5 pl-5 text-left transition-[border-color,box-shadow] focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/[0.07]"
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

        <nav aria-label={t("notFound.waysLabel", "Elsewhere on Jawafdehi")} className="mt-7">
          <ul className="flex flex-wrap items-center justify-center gap-2">
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
    </main>
  );
};

export default NotFound;
