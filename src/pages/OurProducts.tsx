import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowUpRight, Bot, Code2, FileType, SquareDashedBottomCode } from "lucide-react";
import { Link } from "react-router-dom";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { Seo } from "@/components/Seo";
import { CHAT_URL } from "@/lib/external-links";
import { API_BASE_URL } from "@/services/http";
import { SITE_URL } from "@/utils/seo";

type ProductKey = "mcp" | "likhit" | "api" | "chat";

type Product = {
  key: ProductKey;
  name: string;
  icon: typeof Code2;
  /** Where the product lives: a page here, or an external site (new tab). */
  to?: string;
  href?: string;
};

const PRODUCTS: Product[] = [
  // /mcp and /likhit are internal: the page with the setup on it is a better
  // first answer than a README, and it links the source.
  { key: "mcp", name: "Jawafdehi MCP", icon: SquareDashedBottomCode, to: "/mcp" },
  { key: "likhit", name: "likhit", icon: FileType, to: "/likhit" },
  { key: "api", name: "Jawafdehi API", icon: Code2, href: `${API_BASE_URL}/api/swagger/` },
  { key: "chat", name: "AI Research Chat", icon: Bot, href: CHAT_URL },
];

/**
 * One product, and the whole card is the link: an icon on a grey tile, the
 * name and what kind of thing it is, and a round arrow. Nothing else — each
 * product's own page carries the detail.
 */
function ProductCard({ product }: Readonly<{ product: Product }>) {
  const { t } = useTranslation();
  const { key, name, icon: Icon, to, href } = product;
  const Arrow = href ? ArrowUpRight : ArrowRight;
  const body = (
    <>
      <div className="flex h-40 items-center justify-center rounded-[22px] bg-muted">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-primary">
          <Icon className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <h2 className="text-[22px] font-normal leading-tight text-primary">{name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t(`products.items.${key}.kind`)}</p>
        </div>
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-surface text-primary-foreground transition-transform duration-200 group-hover:translate-x-0.5"
        >
          <Arrow className="h-4 w-4" />
        </span>
      </div>
    </>
  );
  const shell =
    "group block h-full rounded-[28px] border border-border/70 bg-surface p-2 transition-colors duration-200 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  return to ? (
    <Link to={to} className={shell}>
      {body}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={shell}>
      {body}
    </a>
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
        {/* A light hero like /whats-new: the archive's diamond field inverted
            onto the white page and faded toward the title, one short label and
            one line. The products below say the rest. */}
        <section aria-labelledby="products-title" className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 -z-10 w-full md:w-2/3 [mask-image:linear-gradient(to_left,#000_35%,transparent)]"
          >
            <ShaderBackdrop design="diamondLight" />
          </div>
          <div className="layout-container py-16 md:py-24">
            <p className="text-sm uppercase tracking-wider text-muted-foreground [:root[lang=ne]_&]:normal-case [:root[lang=ne]_&]:tracking-normal">
              {t("products.hero.eyebrow")}
            </p>
            <h1 id="products-title" className="font-home-display mt-4 text-4xl text-primary sm:text-5xl md:text-6xl">
              {t("products.hero.openSource")}{" "}
              <span className="text-accent">{t("products.hero.freeToUse")}</span>
            </h1>
          </div>
        </section>

        <section id="stack" aria-label={t("products.hero.eyebrow")} className="pb-20 md:pb-28">
          <ul className="layout-container grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.map((product) => (
              <li key={product.key}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
};

export default OurProducts;
