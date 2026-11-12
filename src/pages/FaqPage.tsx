import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
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
import { CaseSectionJumpNav } from "@/components/case-detail/case-section-jump-nav";
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

  // The active section follows the reading position, the way the case and
  // court-case pages' contents do: the last section whose top has passed the
  // middle of the viewport, or the last one once the page bottoms out.
  const [activeSection, setActiveSection] = useState("");
  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (elements.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const readingLine = window.innerHeight * 0.5;
      let next = elements[0].id;
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= readingLine) next = element.id;
        else break;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
        next = elements[elements.length - 1].id;
      }
      setActiveSection((current) => (current === next ? current : next));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
    // `sections` is rebuilt every render from t(); its ids are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.map((section) => section.id).join("|")]);

  const jumpSections = sections.map((section) => ({ id: section.id, label: section.title }));
  const handleJump = (sectionId: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Keep the URL shareable without a router navigation (and its scroll reset).
    window.history.replaceState(null, "", `${location.pathname}${location.search}#${sectionId}`);
  };

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
            <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
              {/* The reading pages' contents list: a line marker that
                  lengthens beside the section in view, sticky on desktop and a
                  sideways-scrolling row on a phone. */}
              <aside className="min-w-0 lg:self-start">
                <div className="lg:sticky lg:top-28">
                  <h2 className="mb-4 text-sm text-muted-foreground">{t("faqPage.browseLabel")}</h2>
                  <CaseSectionJumpNav activeSection={activeSection} onJump={handleJump} sections={jumpSections} />
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
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
