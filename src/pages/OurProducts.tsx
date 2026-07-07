import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Bot, Code2, LayoutDashboard, Github, ExternalLink, SquareDashedBottomCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/services/http";

const PRODUCTS = [
  {
    icon: Code2,
    name: "Jawafdehi API",
    href: `${API_BASE_URL}/api/swagger/`,
    description:
      "The backend service that manages corruption cases, handles moderation workflows, and integrates entity data.",
    tags: ["REST API", "Open Source", "Swagger Docs"],
  },
  {
    icon: LayoutDashboard,
    name: "Jawafdehi Web App",
    href: "https://jawafdehi.org",
    description:
      "This platform — the public-facing interface for browsing cases, exploring entities, and understanding the archive.",
    tags: ["React", "Open Source", "Bilingual"],
  },
  {
    icon: SquareDashedBottomCode,
    name: "jawafdehi-mcp",
    href: "https://github.com/Jawafdehi/jawafdehi-mcp",
    description:
      "An MCP server that helps AI tools query Jawafdehi's civic data, case archive, and public accountability records through structured tool access.",
    tags: ["MCP Server", "AI Tooling", "Open Source"],
  },
  {
    icon: Bot,
    name: "AI Research Chat",
    href: "https://chat.jawafdehi.org",
    description:
      "A conversational research interface for asking questions about corruption cases, public entities, and accountability patterns in plain language.",
    tags: ["AI Research", "Case Search", "Public Access"],
  },
];

const OurProducts = () => {
  const { t } = useTranslation();
  return (
  <div className="min-h-screen flex flex-col bg-background">
    <Helmet>
      <title>Our Products — Jawafdehi</title>
      <meta name="description" content="Every product Jawafdehi builds is open source and free to use. Explore our public APIs, web platform, and civic data services." />
      <link rel="canonical" href="https://jawafdehi.org/products" />
      <meta property="og:site_name" content="Jawafdehi Nepal" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://jawafdehi.org/products" />
      <meta property="og:title" content="Our Products — Jawafdehi" />
      <meta property="og:description" content="Every product Jawafdehi builds is open source and free to use. Explore our public APIs, web platform, and civic data services." />
      <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Our Products — Jawafdehi" />
      <meta name="twitter:description" content="Every product Jawafdehi builds is open source and free to use. Explore our public APIs, web platform, and civic data services." />
      <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
    </Helmet>

    <main id="main-content" className="flex-1">
      {/* Hero */}
      <section id="products-hero" className="relative isolate -mt-[76px] overflow-hidden bg-background pt-[76px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-[64%] z-0 h-[320px] w-[560px] max-w-none -translate-x-1/2 opacity-[0.34] blur-[124px] dark:hidden sm:-top-24 sm:left-[65%] sm:h-[400px] sm:w-[680px] sm:opacity-[0.38] sm:blur-[136px] lg:-top-28 lg:left-[66%] lg:h-[500px] lg:w-[820px] lg:opacity-[0.42] lg:blur-[152px]"
        >
          <div className="absolute right-[4%] top-10 h-[66%] w-[54%] rounded-full bg-accent opacity-85" />
          <div className="absolute left-[32%] top-24 h-[52%] w-[42%] rounded-full bg-accent opacity-55" />
          <div className="absolute -left-[14%] top-[46%] h-[34%] w-[26%] rounded-full bg-primary opacity-35" />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[1] opacity-[0.22] [background-image:radial-gradient(hsl(var(--foreground)/0.14)_0.75px,transparent_0.75px)] [background-size:18px_18px]"
        />

        <div className="container relative z-10 mx-auto flex min-h-[52svh] w-full items-center justify-center py-14 text-center md:py-[4.5rem] lg:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {t("products.hero.eyebrow")}
            </p>
            <h1 className="text-[2.65rem] font-extrabold leading-[0.98] tracking-normal text-primary sm:text-5xl md:text-[3.35rem]">
              {t("products.hero.openSource")}{" "}
              <span className="text-accent sm:whitespace-nowrap">
                {t("products.hero.freeToUse")}
              </span>
              <span className="block text-primary">{t("products.hero.builtForCivicGood")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
              {t("products.hero.description")}
            </p>
            <Button asChild className="mt-8 font-semibold">
              <a href="https://github.com/Jawafdehi" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" aria-hidden="true" />
                {t("products.hero.github")}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="stack" className="bg-muted/10 pt-12 pb-10 md:pt-14 md:pb-12 lg:pt-16">
        <div className="container mx-auto px-4">
         

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
            {PRODUCTS.map(({ icon: Icon, name, href, description, tags }) => (
              <div key={name} className="rounded-lg border border-primary/10 bg-background/70 p-6 shadow-sm shadow-primary/5">
                <div className="mb-5 flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.07] text-primary">
                    <Icon aria-hidden="true" className="h-7 w-7" strokeWidth={1.55} />
                  </div>
                  <div className="min-w-0">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-lg font-bold leading-tight text-foreground transition-colors hover:text-primary"
                    >
                      {name}
                      <ExternalLink className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    </a>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-primary/10 bg-primary/[0.05] px-2.5 py-1 text-xs font-medium text-foreground/70">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-6 text-foreground/70">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>

  </div>
);

};

export default OurProducts;
