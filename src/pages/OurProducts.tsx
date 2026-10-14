import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bot, Code2, FileType, Github, ExternalLink, SquareDashedBottomCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHero } from "@/components/ui/page-hero";
import { Seo } from "@/components/Seo";
import { API_BASE_URL } from "@/services/http";
import { SITE_URL } from "@/utils/seo";

type Product = {
  icon: typeof Code2;
  name: string;
  description: string;
  tags: string[];
  /** External destination, opened in a new tab. Exactly one of href/to is set. */
  href?: string;
  /** Internal route, handled by the router rather than a page load. */
  to?: string;
};

const PRODUCTS: Product[] = [
  {
    icon: Code2,
    name: "Jawafdehi API",
    href: `${API_BASE_URL}/api/swagger/`,
    description:
      "The backend service that manages corruption cases, handles moderation workflows, and integrates entity data.",
    tags: ["REST API", "Open Source", "Swagger Docs"],
  },
  {
    icon: FileType,
    name: "likhit",
    href: "https://jawafdehi.github.io/likhit",
    description:
      "A universal Markdown converter for Nepali documents, turning the PDFs and Word files public records arrive as into clean, structured text.",
    tags: ["Markdown", "Open Source", "Nepali Documents"],
  },
  {
    icon: SquareDashedBottomCode,
    name: "Jawafdehi MCP",
    // The only internal destination in this list: the connect page, not the
    // repository. Someone reading this page wants to use the server, and the
    // README is a worse answer to that than the page with the URL on it.
    to: "/mcp",
    description:
      "An MCP server that lets Claude, ChatGPT and other AI tools query the case archive, the people and offices we track, and court records.",
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
    <Seo
      title="Our Products — Jawafdehi"
      description="Every product Jawafdehi builds is open source and free to use. Explore our public APIs, web platform, and civic data services."
      canonicalUrl={`${SITE_URL}/products/`}
    />

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
        <div className="layout-container">
         

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
            {PRODUCTS.map(({ icon: Icon, name, href, to, description, tags }) => (
              <div key={name} className="rounded-lg border border-primary/10 bg-background/70 p-6 shadow-sm shadow-primary-surface/5">
                <div className="mb-5 flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary-surface/[0.07] text-primary">
                    <Icon aria-hidden="true" className="h-7 w-7" strokeWidth={1.55} />
                  </div>
                  <div className="min-w-0">
                    {/* An internal destination routes through the SPA and gets no
                        external-link marker — that icon promises a new tab. */}
                    {to ? (
                      <Link
                        to={to}
                        className="inline-flex items-center gap-1.5 text-lg font-bold leading-tight text-foreground transition-colors hover:text-primary"
                      >
                        {name}
                      </Link>
                    ) : (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-lg font-bold leading-tight text-foreground transition-colors hover:text-primary"
                      >
                        {name}
                        <ExternalLink className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      </a>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-primary/10 bg-primary-surface/[0.05] px-2.5 py-1 text-xs font-medium text-foreground/70">
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
