import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

type FaqPageQuestion = {
  id: string;
  question: string;
  answer: string;
};

type FaqPageSection = {
  id: string;
  title: string;
  questions: FaqPageQuestion[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFaqPageQuestion = (value: unknown): value is FaqPageQuestion =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.question === "string" &&
  typeof value.answer === "string";

const isFaqPageSection = (value: unknown): value is FaqPageSection =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.title === "string" &&
  Array.isArray(value.questions) &&
  value.questions.every(isFaqPageQuestion);

const markdownComponents: Components = {
  p: ({ className, node: _node, ...props }) => (
    <p className={cn("mb-3 last:mb-0", className)} {...props} />
  ),
  ul: ({ className, node: _node, ...props }) => (
    <ul className={cn("my-3 list-disc space-y-2 pl-5", className)} {...props} />
  ),
  ol: ({ className, node: _node, ...props }) => (
    <ol className={cn("my-3 list-decimal space-y-2 pl-5", className)} {...props} />
  ),
  li: ({ className, node: _node, ...props }) => (
    <li className={cn("pl-1", className)} {...props} />
  ),
  strong: ({ className, node: _node, ...props }) => (
    <strong className={cn("font-semibold text-foreground", className)} {...props} />
  ),
};

export default function FaqPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const rawSections = t("faqPage.sections", { returnObjects: true });
  const sections = Array.isArray(rawSections)
    ? rawSections.filter(isFaqPageSection)
    : [];

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
              <h1 className="text-4xl font-extrabold leading-tight tracking-normal text-primary md:text-5xl">
                {t("faqPage.hero.title")}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
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
                    {sections.map((section) => (
                      <Link
                        key={section.id}
                        to={`#${section.id}`}
                        className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-background hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {section.title}
                      </Link>
                    ))}
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
                        className="text-2xl font-bold tracking-normal text-primary md:text-3xl"
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
                          <AccordionContent className="pb-6 pr-0 text-sm leading-7 text-muted-foreground md:pr-16">
                            <Markdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
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
