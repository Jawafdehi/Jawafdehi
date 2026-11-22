import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import { Link } from "react-router-dom";

import { Seo } from "@/components/Seo";
import { pageCard } from "@/utils/page-cards";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHero } from "@/components/ui/page-hero";
import { CHAT_URL } from "@/lib/external-links";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/services/http";
import { SITE_URL } from "@/utils/seo";

type ProductKey = "mcp" | "likhit" | "api" | "chat";

type Product = {
  key: ProductKey;
  name: string;
  /** Where the product lives: a page here, or an external site (new tab). */
  to?: string;
  href?: string;
  preview: () => ReactNode;
};

// ---------------------------------------------------------------------------
// Previews: small, chrome-free glimpses of each product at work, in the card's
// well. Every value is real (the MCP exchange is the home page's, the API
// record a trimmed live response) or deliberately abstract (the chat answer is
// drawn as bars). On hover the glimpse rises 2px: the one moving part, so the
// card answers the pointer without lifting off the page.
// ---------------------------------------------------------------------------

const LIFT =
  "transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0";

function McpPreview() {
  const { t } = useTranslation();
  return (
    <div aria-hidden="true" className={cn("w-full max-w-md space-y-2.5", LIFT)}>
      <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-primary-surface px-3.5 py-2.5 text-[13px] leading-5 text-primary-foreground">
        {t("home.bento.ask.question")}
      </div>
      <div className="w-fit max-w-[88%] rounded-2xl rounded-bl-md bg-surface px-3.5 py-2.5 text-[13px] leading-5 text-primary">
        {t("home.bento.ask.answer")}
      </div>
    </div>
  );
}

function LikhitPreview() {
  return (
    <div aria-hidden="true" className={cn("w-full space-y-2 font-mono text-[12px] leading-5", LIFT)}>
      <p className="w-fit rounded-full bg-surface px-3 py-1 text-primary">
        <span className="text-muted-foreground">$ </span>pip install likhit
      </p>
      <div className="rounded-2xl bg-surface px-3.5 py-3 text-primary/80">
        <p># अख्तियार दुरुपयोग अनुसन्धान आयोग</p>
        <p>## प्रेस विज्ञप्ति</p>
        <p className="mt-2 h-1.5 w-[80%] rounded-full bg-border" />
      </div>
    </div>
  );
}

function ApiPreview() {
  return (
    <pre
      aria-hidden="true"
      className={cn(
        "w-full overflow-hidden rounded-2xl bg-surface px-3.5 py-3 font-mono text-[12px] leading-5 text-primary/80",
        LIFT,
      )}
    >
      <span className="text-muted-foreground">GET /api/cases/</span>
      {"\n{\n"}
      {"  "}
      <span className="text-primary">&quot;status&quot;</span>: <span className="text-accent">&quot;ongoing&quot;</span>,{"\n"}
      {"  "}
      <span className="text-primary">&quot;bigo&quot;</span>: 1000000,{"\n"}
      {"  "}
      <span className="text-primary">&quot;court_cases&quot;</span>: [<span className="text-accent">&quot;…/083-cr-0055&quot;</span>]{"\n"}
      {"}"}
    </pre>
  );
}

function ChatPreview() {
  const { t } = useTranslation();
  return (
    <div aria-hidden="true" className={cn("w-full max-w-md space-y-3", LIFT)}>
      <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-primary-surface px-3.5 py-2.5 text-[13px] leading-5 text-primary-foreground">
        {t("products.preview.chatQuestion")}
      </div>
      <div className="rounded-2xl rounded-bl-md bg-surface px-3.5 py-3">
        <p className="h-1.5 w-[92%] rounded-full bg-border" />
        <p className="mt-2 h-1.5 w-[74%] rounded-full bg-border" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-primary/75">
            {t("products.preview.sourceCharge")}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-primary/75">
            {t("products.preview.sourceCourt")}
          </span>
        </div>
      </div>
    </div>
  );
}

const MCP: Product = { key: "mcp", name: "Jawafdehi MCP", to: "/mcp/", preview: McpPreview };
const LIKHIT: Product = { key: "likhit", name: "likhit", to: "/likhit/", preview: LikhitPreview };
const API: Product = { key: "api", name: "Jawafdehi API", href: `${API_BASE_URL}/api/swagger/`, preview: ApiPreview };
const CHAT: Product = { key: "chat", name: "AI Research Chat", href: CHAT_URL, preview: ChatPreview };

// Grouped by who reaches for them, so a visitor finds their two and skips the
// rest: reporters and researchers ask questions; developers build on the data.
// /mcp and /likhit are internal: the page with the setup on it is a better
// first answer than a README, and it links the source.
const GROUPS: ReadonlyArray<{ key: "research" | "developers"; products: Product[] }> = [
  { key: "research", products: [CHAT, MCP] },
  { key: "developers", products: [API, LIKHIT] },
];

/**
 * One product; the whole card is the link. The kind (the site's eyebrow), the
 * name, one line and the action in words (its arrow turns up-right when it
 * leaves the site), then a glimpse of the product at work in a grey well. Pressing scales the
 * card to 0.99 so the click is felt; hovering lifts only the glimpse.
 */
function ProductCard({ product }: Readonly<{ product: Product }>) {
  const { t } = useTranslation();
  const { key, name, to, href, preview: Preview } = product;
  const Arrow = href ? ArrowUpRight : ArrowRight;
  const kind = t(`products.items.${key}.kind`);

  const body = (
    <div className="flex h-full flex-col p-2">
      <div className="px-5 pb-6 pt-5">
        <Eyebrow tone="primary" className="text-xs">
          {kind}
        </Eyebrow>
        <h3 className="mt-4 text-[28px] font-normal leading-tight tracking-[-0.01em] text-primary">{name}</h3>
        {/* Room for two lines, so the actions of a pair sit on one line. */}
        <p className="mt-2 max-w-md text-[15px] leading-6 text-muted-foreground md:min-h-12">{t(`products.items.${key}.line`)}</p>
        {/* The action in words, so the card says what a click does; up-right
            when it leaves the site. */}
        <span className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-primary">
          {t(`products.items.${key}.cta`)}
          <Arrow
            aria-hidden="true"
            className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </span>
      </div>
      <div className="mt-auto flex min-h-[11rem] flex-1 items-center justify-center rounded-[22px] bg-muted px-6 py-7">
        <Preview />
      </div>
    </div>
  );

  const shell =
    "group block h-full rounded-[28px] border border-border/70 bg-surface transition-[transform,border-color] duration-150 ease-out hover:border-border active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:active:scale-100";
  const label = `${name}: ${kind}`;

  return to ? (
    <Link to={to} className={shell} aria-label={label}>
      {body}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={shell} aria-label={label}>
      {body}
    </a>
  );
}

const OurProducts = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Our products — Jawafdehi"
        description="Jawafdehi's products: the AI Research Chat and the Jawafdehi MCP for research and reporting, and the Jawafdehi API and likhit for developers."
        canonicalUrl={`${SITE_URL}/products/`}
        {...pageCard("products")}
      />

      <main id="main-content" className="flex-1">
        {/* The site's standard light header (as on /updates and /about): label,
            title and one line saying what the products are for. */}
        <PageHero
          id="products"
          eyebrow={t("products.hero.eyebrow")}
          title={t("products.hero.title")}
          description={t("products.hero.description")}
        />

        <div className="layout-container space-y-14 pb-20 md:space-y-16 md:pb-28">
          {GROUPS.map(({ key, products }) => (
            <section key={key} aria-labelledby={`products-${key}`}>
              <h2 id={`products-${key}`} className="text-2xl font-normal tracking-[-0.01em] text-primary md:text-[1.75rem]">
                {t(`products.groups.${key}`)}
              </h2>
              <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {products.map((product) => (
                  <li key={product.key}>
                    <ProductCard product={product} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};

export default OurProducts;
