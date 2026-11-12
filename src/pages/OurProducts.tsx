import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import { Link } from "react-router-dom";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { Seo } from "@/components/Seo";
import { Eyebrow } from "@/components/ui/eyebrow";
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

const PRODUCTS: Product[] = [
  // /mcp and /likhit are internal: the page with the setup on it is a better
  // first answer than a README, and it links the source.
  { key: "mcp", name: "Jawafdehi MCP", to: "/mcp", preview: McpPreview },
  { key: "likhit", name: "likhit", to: "/likhit", preview: LikhitPreview },
  { key: "api", name: "Jawafdehi API", href: `${API_BASE_URL}/api/swagger/`, preview: ApiPreview },
  { key: "chat", name: "AI Research Chat", href: CHAT_URL, preview: ChatPreview },
];

/**
 * One product; the whole card is the link. The kind (the site's eyebrow), the
 * name and one line, a glimpse of the product at work in a grey well, and a
 * round arrow that turns up-right when it leaves the site. Pressing scales the
 * card to 0.99 so the click is felt; hovering lifts only the glimpse.
 */
function ProductCard({ product }: Readonly<{ product: Product }>) {
  const { t } = useTranslation();
  const { key, name, to, href, preview: Preview } = product;
  const Arrow = href ? ArrowUpRight : ArrowRight;
  const kind = t(`products.items.${key}.kind`);

  const body = (
    <div className="flex h-full flex-col p-2">
      <div className="flex items-start justify-between gap-6 px-5 pb-6 pt-5">
        <div className="min-w-0">
          <Eyebrow tone="primary" className="text-xs">
            {kind}
          </Eyebrow>
          <h2 className="mt-4 text-[28px] font-normal leading-tight tracking-[-0.01em] text-primary">{name}</h2>
          <p className="mt-2 max-w-md text-[15px] leading-6 text-muted-foreground">{t(`products.items.${key}.line`)}</p>
        </div>
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-surface text-primary-foreground transition-transform duration-200 ease-out group-hover:translate-x-0.5"
        >
          <Arrow className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-auto flex min-h-[13rem] flex-1 items-center justify-center rounded-[22px] bg-muted px-6 py-8">
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
        title="Our Products — Jawafdehi"
        description="Every product Jawafdehi builds is open source and free to use. Explore our public APIs, web platform, and civic data services."
        canonicalUrl={`${SITE_URL}/products/`}
      />

      <main id="main-content" className="flex-1">
        {/* A light hero like /whats-new: the archive's diamond field inverted
            onto the white page and faded toward the title, the site's eyebrow
            and one line. The cards say the rest. */}
        <section aria-labelledby="products-title" className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 -z-10 w-full md:w-2/3 [mask-image:linear-gradient(to_left,#000_35%,transparent)]"
          >
            <ShaderBackdrop design="diamondLight" />
          </div>
          <div className="layout-container py-16 md:py-24">
            <Eyebrow>{t("products.hero.eyebrow")}</Eyebrow>
            <h1 id="products-title" className="font-home-display mt-4 text-4xl text-primary sm:text-5xl md:text-6xl">
              {t("products.hero.openSource")} <span className="text-accent">{t("products.hero.freeToUse")}</span>
            </h1>
          </div>
        </section>

        {/* Two by two, every product the same weight. */}
        <section aria-labelledby="products-title" className="pb-20 md:pb-28">
          <ul className="layout-container grid grid-cols-1 gap-4 md:grid-cols-2">
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
