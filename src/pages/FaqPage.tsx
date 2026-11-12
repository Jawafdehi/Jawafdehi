import { useEffect, useState } from "react";
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
import { LightHero } from "@/components/ui/light-hero";
import { faqMarkdownComponents } from "@/components/faq-markdown";
import { isFaqPageSection } from "@/lib/faq-page-content";
import { Seo } from "@/components/Seo";
import { SITE_URL } from "@/utils/seo";

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
      <Seo
        title={t("faqPage.meta.title")}
        description={t("faqPage.meta.description")}
        socialDescription={t("faqPage.meta.socialDescription")}
        canonicalUrl={`${SITE_URL}/faq/`}
        language={i18n.language}
      />

      <main id="main-content">
        <LightHero
          id="faq-title"
          eyebrow={t("faqPage.hero.eyebrow")}
          title={t("faqPage.hero.title")}
          description={t("faqPage.hero.description")}
        />

        <section className="pb-20 md:pb-28">
          <div className="layout-container">
            <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14">
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="rounded-[28px] bg-muted p-2">
                  <p className="px-4 pb-2 pt-3 text-sm text-muted-foreground">{t("faqPage.browseLabel")}</p>
                  <nav aria-label="FAQ categories" className="space-y-0.5">
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
                          className="block rounded-full px-4 py-2.5 text-[15px] text-primary/70 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=location]:bg-surface aria-[current=location]:text-primary aria-[current=location]:shadow-[0_1px_2px_rgba(14,31,59,0.08)]"
                        >
                          {section.title}
                        </a>
                      );
                    })}
                  </nav>
                </div>
              </aside>

              <div className="space-y-12 md:space-y-16">
                {sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-24"
                    aria-labelledby={`${section.id}-title`}
                  >
                    <div className="mb-5">
                      <h2
                        id={`${section.id}-title`}
                        className="font-home-display text-3xl text-primary md:text-4xl"
                      >
                        {section.title}
                      </h2>
                    </div>

                    <Accordion type="single" collapsible className="space-y-2">
                      {section.questions.map((item) => (
                        <AccordionItem key={item.id} value={item.id} className="rounded-[22px] border-0 bg-muted/60 px-5 transition-colors data-[state=open]:bg-muted md:px-6">
                          <AccordionTrigger className="group gap-6 py-5 text-left text-[17px] font-normal leading-7 text-primary no-underline hover:no-underline md:text-lg [&>svg]:hidden">
                            <span>{item.question}</span>
                            <span
                              className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted-foreground transition-colors group-hover:text-primary group-data-[state=open]:text-accent"
                              aria-hidden="true"
                            >
                              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="pb-6 pr-0 text-base font-normal leading-7 text-muted-foreground md:pr-16">
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
