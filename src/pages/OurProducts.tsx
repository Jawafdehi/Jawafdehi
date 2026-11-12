import { useTranslation } from "react-i18next";
import { Bot, Code2, FileType, SquareDashedBottomCode } from "lucide-react";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { Seo } from "@/components/Seo";
import { ArrowLink } from "@/components/ui/arrow-link";
import { Panel } from "@/components/ui/panel";
import { SplitHeading } from "@/components/ui/split-heading";
import { CHAT_URL } from "@/lib/external-links";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/services/http";
import { SITE_URL } from "@/utils/seo";

type Product = {
  key: "api" | "likhit" | "mcp" | "chat";
  icon: typeof Code2;
  name: string;
  description: string;
  tags: string[];
  /** The navy panel: the newest way into the archive. One per page. */
  featured?: boolean;
} & ({ to: string; href?: never } | { href: string; to?: never });

const PRODUCTS: Product[] = [
  {
    key: "mcp",
    icon: SquareDashedBottomCode,
    name: "Jawafdehi MCP",
    // The connect page, not the repository: someone reading this page wants to
    // use the server, and the README is a worse answer than the page with the
    // URL on it.
    to: "/mcp",
    featured: true,
    description:
      "An MCP server that lets Claude, ChatGPT and other AI tools query the case archive, the people and offices we track, and court records.",
    tags: ["MCP Server", "AI Tooling", "Open Source"],
  },
  {
    key: "likhit",
    icon: FileType,
    name: "likhit",
    // Internal for the same reason as /mcp: the page with the install command
    // is a better first answer than the benchmark, which is linked from there.
    to: "/likhit",
    description:
      "A universal Markdown converter for Nepali documents, turning the PDFs and Word files public records arrive as into clean, structured text.",
    tags: ["Markdown", "Open Source", "Nepali Documents"],
  },
  {
    key: "api",
    icon: Code2,
    name: "Jawafdehi API",
    href: `${API_BASE_URL}/api/swagger/`,
    description:
      "The backend service that manages corruption cases, handles moderation workflows, and integrates entity data.",
    tags: ["REST API", "Open Source", "Swagger Docs"],
  },
  {
    key: "chat",
    icon: Bot,
    name: "AI Research Chat",
    href: CHAT_URL,
    description:
      "A conversational research interface for asking questions about corruption cases, public entities, and accountability patterns in plain language.",
    tags: ["AI Research", "Case Search", "Public Access"],
  },
];

const CTA_FALLBACK: Record<Product["key"], string> = {
  mcp: "Connect your AI",
  likhit: "Install likhit",
  api: "Read the API docs",
  chat: "Start a chat",
};

/**
 * One product as a bento panel (the home page's kit): an icon in a round well,
 * the name, one line of what it does, its tags as quiet chips, and the
 * round-arrow pill that takes you to it.
 */
function ProductPanel({ product }: Readonly<{ product: Product }>) {
  const { t } = useTranslation();
  const { icon: Icon, name, description, tags, featured, key } = product;
  const dark = Boolean(featured);
  const cta = t(`products.cta.${key}`, CTA_FALLBACK[key]);
  return (
    <Panel tone={dark ? "dark" : "light"} className="h-full min-h-[22rem] justify-between gap-10">
      <span
        aria-hidden="true"
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full",
          dark ? "bg-primary-foreground/10 text-primary-foreground" : "bg-surface text-primary",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div>
        <h2 className={cn("text-[28px] font-normal leading-tight tracking-[-0.01em]", dark ? "text-primary-foreground" : "text-primary")}>
          {name}
        </h2>
        <p className={cn("mt-3 max-w-md text-[15px] leading-6", dark ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {description}
        </p>
        <ul className="mt-5 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li
              key={tag}
              className={cn(
                "rounded-full px-3 py-1 text-[13px]",
                dark ? "bg-primary-foreground/10 text-primary-foreground/80" : "bg-surface text-primary/75",
              )}
            >
              {tag}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          {product.to ? (
            <ArrowLink to={product.to} tone={dark ? "light" : "dark"}>
              {cta}
            </ArrowLink>
          ) : (
            <ArrowLink href={product.href} tone={dark ? "light" : "dark"}>
              {cta}
            </ArrowLink>
          )}
        </div>
      </div>
    </Panel>
  );
}

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
        {/* Hero: the navy stage and diamond field the home page opens on, left-
            aligned like /mcp and /materials. The navbar is light-on-dark over
            it (Navbar.tsx, DARK_HERO_PATHS). */}
        <section
          id="products-hero"
          aria-labelledby="products-title"
          className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]"
        >
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <ShaderBackdrop design="diamond" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--primary-surface))_0%,hsl(var(--primary-surface)/0.9)_40%,transparent_75%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--primary-surface))_0px,hsl(var(--primary-surface))_60px,transparent_170px)]" />
          </div>

          <div className="layout-container flex min-h-[min(640px,calc(100svh-76px))] flex-col justify-center pb-16 pt-12 md:pb-20">
            <p className="font-eyebrow text-sm tracking-[0.06em] text-[hsl(var(--accent-on-dark))] md:text-base">
              {t("products.hero.eyebrow")}
            </p>
            <h1
              id="products-title"
              className="font-home-display mt-5 max-w-[18ch] text-[clamp(2.6rem,6vw,5.25rem)] text-primary-foreground [:root[lang=ne]_&]:max-w-[22ch]"
            >
              {t("products.hero.openSource")}{" "}
              <span className="text-[hsl(var(--accent-on-dark))]">{t("products.hero.freeToUse")}</span>{" "}
              {t("products.hero.builtForCivicGood")}
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-primary-foreground/80 md:text-2xl md:leading-9">
              {t("products.hero.description")}
            </p>
            <div className="mt-10">
              <ArrowLink href="https://github.com/Jawafdehi" tone="light">
                {t("products.hero.github")}
              </ArrowLink>
            </div>
          </div>
        </section>

        {/* The products as a bento: MCP on the navy panel, the rest grey. */}
        <section id="stack" aria-labelledby="stack-heading" className="py-16 md:py-24">
          <div className="layout-container">
            <SplitHeading
              id="stack-heading"
              lead={t("products.stack.lead", "Four tools.")}
              rest={t("products.stack.rest", "One open archive behind them.")}
            />
            <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
              {PRODUCTS.map((product) => (
                <li key={product.key}>
                  <ProductPanel product={product} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default OurProducts;
