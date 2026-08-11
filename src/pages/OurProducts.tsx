import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Bot, Code2, LayoutDashboard, Github, ExternalLink, SquareDashedBottomCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHero } from "@/components/ui/page-hero";
import { API_BASE_URL } from "@/services/http";
import { OG_LOCALE_ENGLISH, OG_LOCALE_NEPALI, SITE_NAME, SOCIAL_IMAGE_URL } from "@/utils/seo";

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
      <link rel="canonical" href="https://jawafdehi.org/products/" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://jawafdehi.org/products/" />
      <meta property="og:title" content="Our Products — Jawafdehi" />
      <meta property="og:description" content="Every product Jawafdehi builds is open source and free to use. Explore our public APIs, web platform, and civic data services." />
      <meta property="og:image" content={SOCIAL_IMAGE_URL} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content={OG_LOCALE_NEPALI} />
      <meta property="og:locale:alternate" content={OG_LOCALE_ENGLISH} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Our Products — Jawafdehi" />
      <meta name="twitter:description" content="Every product Jawafdehi builds is open source and free to use. Explore our public APIs, web platform, and civic data services." />
      <meta name="twitter:image" content={SOCIAL_IMAGE_URL} />
    </Helmet>

    <main id="main-content" className="flex-1">
      <PageHero
        id="products-hero"
        eyebrow={<Eyebrow className="mb-4">{t("products.hero.eyebrow")}</Eyebrow>}
        description={t("products.hero.description")}
        actions={
          <Button asChild className="font-semibold">
            <a href="https://github.com/Jawafdehi" target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4" aria-hidden="true" />
              {t("products.hero.github")}
            </a>
          </Button>
        }
        title={
          <>
            {t("products.hero.openSource")}{" "}
            <span className="text-accent sm:whitespace-nowrap">
              {t("products.hero.freeToUse")}
            </span>{" "}
            <span className="text-primary">
              {t("products.hero.builtForCivicGood")}
            </span>
          </>
        }
      />

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
