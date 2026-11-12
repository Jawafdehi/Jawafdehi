import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowUpRight, Github } from "lucide-react";
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
  /** Where the product lives: a page here, or an external site (new tab). */
  to?: string;
  href?: string;
  /** Its source, when it has a public repository of its own. */
  repo?: string;
  preview: () => ReactNode;
};

// ---------------------------------------------------------------------------
// Previews: each product shown in use, in a small white window on a grey
// well (the Speakeasy / GitBook product-card pattern). Every value in them is
// real — the MCP exchange is the home page's, the API response is a trimmed
// live record — or deliberately abstract (the chat answer is drawn as bars).
// ---------------------------------------------------------------------------

function Window({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div aria-hidden="true" className="w-full max-w-[26rem] overflow-hidden md:w-[86%] rounded-2xl bg-surface shadow-[0_18px_40px_-24px_rgba(14,31,59,0.35)]">
      <div className="flex items-center gap-1.5 border-b border-border/70 px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function McpPreview() {
  const { t } = useTranslation();
  return (
    <Window title="Claude · Jawafdehi">
      <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary-surface px-3.5 py-2.5 text-[13px] leading-5 text-primary-foreground">
        {t("home.bento.ask.question")}
      </div>
      <div className="mt-2.5 w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-[13px] leading-5 text-primary">
        {t("home.bento.ask.answer")}
      </div>
    </Window>
  );
}

function LikhitPreview() {
  return (
    <Window title="terminal">
      <p className="font-mono text-[12px] leading-5 text-primary">
        <span className="text-muted-foreground">$ </span>likhit-save notice.pdf --out notice.md
      </p>
      <div className="mt-3 rounded-xl bg-muted px-3.5 py-3 font-mono text-[12px] leading-6 text-primary/80">
        <p># अख्तियार दुरुपयोग अनुसन्धान आयोग</p>
        <p>## प्रेस विज्ञप्ति</p>
        <p className="mt-1 h-2 w-[85%] rounded-full bg-border" />
        <p className="mt-2 h-2 w-[70%] rounded-full bg-border" />
      </div>
    </Window>
  );
}

function ApiPreview() {
  return (
    <Window title="GET /api/cases/">
      <pre className="overflow-hidden font-mono text-[12px] leading-5 text-primary/80">
        {"{\n"}
        {"  "}<span className="text-primary">"slug"</span>: <span className="text-[hsl(var(--accent))]">"dilli-bahadur-wali-…"</span>,{"\n"}
        {"  "}<span className="text-primary">"offence_type"</span>: <span className="text-[hsl(var(--accent))]">"CORRUPTION"</span>,{"\n"}
        {"  "}<span className="text-primary">"status"</span>: <span className="text-[hsl(var(--accent))]">"ongoing"</span>,{"\n"}
        {"  "}<span className="text-primary">"bigo"</span>: 1000000,{"\n"}
        {"  "}<span className="text-primary">"court_cases"</span>: [<span className="text-[hsl(var(--accent))]">"…/special/083-cr-0055"</span>]{"\n"}
        {"}"}
      </pre>
    </Window>
  );
}

function ChatPreview() {
  const { t } = useTranslation();
  return (
    <Window title="chat.jawafdehi.org">
      <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary-surface px-3.5 py-2.5 text-[13px] leading-5 text-primary-foreground">
        {t("products.preview.chatQuestion")}
      </div>
      <div className="mt-3 space-y-2">
        <p className="h-2 w-[92%] rounded-full bg-border" />
        <p className="h-2 w-[80%] rounded-full bg-border" />
        <p className="h-2 w-[64%] rounded-full bg-border" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-primary/75">{t("products.preview.sourceCharge")}</span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-primary/75">{t("products.preview.sourceCourt")}</span>
      </div>
    </Window>
  );
}

const PRODUCTS: Product[] = [
  // Both /mcp and /likhit are internal: someone here wants to use the thing,
  // and the page with the setup on it is a better first answer than a README.
  { key: "mcp", name: "Jawafdehi MCP", to: "/mcp", repo: "https://github.com/Jawafdehi/jawafdehi-mcp", preview: McpPreview },
  { key: "likhit", name: "likhit", to: "/likhit", repo: "https://github.com/Jawafdehi/likhit", preview: LikhitPreview },
  { key: "api", name: "Jawafdehi API", href: `${API_BASE_URL}/api/swagger/`, repo: "https://github.com/Jawafdehi/JawafdehiAPI", preview: ApiPreview },
  { key: "chat", name: "AI Research Chat", href: CHAT_URL, preview: ChatPreview },
];

const LINK =
  "group inline-flex items-center gap-1.5 rounded text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ProductCard({ product }: Readonly<{ product: Product }>) {
  const { t } = useTranslation();
  const { key, name, to, href, repo, preview: Preview } = product;
  const cta = t(`products.items.${key}.cta`);
  return (
    <article className="flex h-full flex-col rounded-[28px] border border-border/70 bg-surface p-2">
      <div className="flex min-h-[15rem] items-center justify-center rounded-[22px] bg-muted px-4 py-8 md:aspect-[16/10] md:py-0">
        <Preview />
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-6 md:px-5">
        <p className="text-sm text-muted-foreground">{t(`products.items.${key}.kind`)}</p>
        <h2 className="mt-1 text-[26px] font-normal leading-tight tracking-[-0.01em] text-primary">{name}</h2>
        <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 pt-5">
          {to ? (
            <Link to={to} className={`${LINK} font-medium text-primary`}>
              {cta}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ) : (
            <a href={href} target="_blank" rel="noopener noreferrer" className={`${LINK} font-medium text-primary`}>
              {cta}
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          )}
          {repo ? (
            <a href={repo} target="_blank" rel="noopener noreferrer" className={`${LINK} text-muted-foreground hover:text-primary`}>
              <Github className="h-4 w-4" aria-hidden="true" />
              {t("products.source")}
            </a>
          ) : null}
        </div>
      </div>
    </article>
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
