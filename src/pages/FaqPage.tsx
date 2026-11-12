import { useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { ChevronDown } from "@/components/icons";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ReadingHeader, ReadingLayout } from "@/components/reading-layout";
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

  const jumpSections = sections.map((section) => ({ id: section.id, label: section.title }));

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
        <section className="pb-20 md:pb-28">
          <ReadingLayout
            sections={jumpSections}
            header={
              <ReadingHeader
                id="faq-title"
                eyebrow={t("faqPage.hero.eyebrow")}
                title={t("faqPage.hero.title")}
                description={t("faqPage.hero.description")}
              />
            }
          >
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

                    <Accordion type="single" collapsible>
                      {section.questions.map((item) => (
                        <AccordionItem key={item.id} value={item.id} className="border-0">
                          <AccordionTrigger className="group gap-6 py-5 text-left text-[17px] font-normal leading-7 text-primary no-underline hover:no-underline md:text-lg [&>svg]:hidden">
                            <span>{item.question}</span>
                            <span
                              className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:text-primary group-data-[state=open]:text-accent"
                              aria-hidden="true"
                            >
                              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="pb-6 pr-0 text-lg font-normal leading-8 text-muted-foreground md:pr-16">
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
          </ReadingLayout>
        </section>
      </main>
    </div>
  );
}
