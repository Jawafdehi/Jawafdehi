import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Eyebrow } from "@/components/ui/eyebrow";
import { faqMarkdownComponents } from "@/components/faq-markdown";
import { isFaqPageSection } from "@/lib/faq-page-content";

export default function FaqPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const rawSections = t("faqPage.sections", { returnObjects: true });
  const sections = Array.isArray(rawSections)
    ? rawSections.filter(isFaqPageSection)
    : [];

  // Track the active section from the URL hash. Native anchor clicks fire
  // `hashchange` (not react-router navigation), so we listen for it directly to
  // keep the sidebar's aria-current in sync on every click.
  const [activeSection, setActiveSection] = useState("");
  useEffect(() => {
    const syncHash = () =>
      setActiveSection(decodeURIComponent(window.location.hash.slice(1)));
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  // Smooth-scroll deep links (e.g. arriving at /faq#reporting). In-page anchor
  // clicks are handled natively by the browser.
  useEffect(() => {
    if (sections.length === 0 || !location.hash) return;

    const sectionId = decodeURIComponent(location.hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, sections.length]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t("faqPage.meta.title")}</title>
        <meta
          name="description"
          content={t("faqPage.meta.description")}
        />
        <link rel="canonical" href="https://jawafdehi.org/faq" />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/faq" />
        <meta property="og:title" content={t("faqPage.meta.title")} />
        <meta
          property="og:description"
          content={t("faqPage.meta.socialDescription")}
        />
        <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
        <meta
          property="og:locale"
          content={i18n.language?.startsWith("ne") ? "ne_NP" : "en_US"}
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t("faqPage.meta.title")} />
        <meta
          name="twitter:description"
          content={t("faqPage.meta.socialDescription")}
        />
        <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
      </Helmet>

      <main id="main-content">
        <section className="relative overflow-hidden py-10 md:py-14 lg:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <Eyebrow className="mb-4">{t("faqPage.hero.eyebrow")}</Eyebrow>
              <h1 className="font-page-title">
                {t("faqPage.hero.title")}
              </h1>
              <p className="font-page-lede mt-4 max-w-2xl">
                {t("faqPage.hero.description")}
              </p>
            </div>
          </div>
        </section>

        <section className="pb-12 md:pb-16">
          <div className="container mx-auto px-4">
            <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14">
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="rounded-lg bg-card p-3">
                  <Eyebrow tone="primary" className="mb-3 px-3 py-2">
                    {t("faqPage.browseLabel")}
                  </Eyebrow>
                  <nav aria-label="FAQ categories" className="space-y-1">
                    {sections.map((section) => {
                      const isActive = activeSection === section.id;
                      return (
                        // Native anchor (not React Router <Link>) so browsers scroll
                        // to the section on every click — including re-clicking the
                        // current section, where the hash doesn't change and the
                        // effect below wouldn't re-fire. The href carries the full
                        // path (not a bare "#id") because the app's <base href="/">
                        // would otherwise resolve a fragment-only link to "/#id".
                        <a
                          key={section.id}
                          href={`${location.pathname}${location.search}#${section.id}`}
                          aria-current={isActive ? "location" : undefined}
                          className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-background hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=location]:bg-background aria-[current=location]:font-semibold aria-[current=location]:text-primary"
                        >
                          {section.title}
                        </a>
                      );
                    })}
                  </nav>
                </div>
              </aside>

              <div className="space-y-12">
                {sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-24"
                    aria-labelledby={`${section.id}-title`}
                  >
                    <div className="mb-3">
                      <h2
                        id={`${section.id}-title`}
                        className="font-section-title"
                      >
                        {section.title}
                      </h2>
                    </div>

                    <Accordion type="single" collapsible className="divide-y divide-border/65">
                      {section.questions.map((item) => (
                        <AccordionItem key={item.id} value={item.id} className="border-0">
                          <AccordionTrigger className="group gap-6 py-5 text-left text-base font-medium leading-7 text-foreground no-underline hover:text-primary hover:no-underline md:text-lg [&>svg]:hidden">
                            <span>{item.question}</span>
                            <span
                              className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground transition-colors group-hover:text-primary group-data-[state=open]:text-primary"
                              aria-hidden="true"
                            >
                              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="pb-6 pr-0 text-sm font-normal leading-7 text-muted-foreground md:pr-16 md:text-base">
                            <Markdown components={faqMarkdownComponents} remarkPlugins={[remarkGfm]}>
                              {item.answer}
                            </Markdown>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </section>
                ))}

              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
