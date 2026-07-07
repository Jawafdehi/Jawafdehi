import { useTranslation } from "react-i18next";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type FaqItem = { q: string; a: string };

const isFaqItem = (item: unknown): item is FaqItem =>
  typeof item === "object" &&
  item !== null &&
  "q" in item &&
  "a" in item &&
  typeof item.q === "string" &&
  typeof item.a === "string";

export function DonationFaq() {
  const { t } = useTranslation();
  const rawFaqItems = t("donate.faq.items", {
    returnObjects: true,
  });
  const faqItems = Array.isArray(rawFaqItems)
    ? rawFaqItems.filter(isFaqItem)
    : [];
  const hasOddFaqItems = faqItems.length % 2 === 1;

  return (
    <section
      id="donate-faq"
      className="bg-background py-16 md:py-20"
      aria-labelledby="donate-faq-title"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {t("donate.faq.eyebrow")}
            </p>
            <h2
              id="donate-faq-title"
              className="text-4xl font-bold leading-tight tracking-normal text-primary md:text-5xl"
            >
              {t("donate.faq.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-foreground/65 md:text-lg">
              {t("donate.faq.description")}
            </p>
          </div>

          <Accordion
            type="single"
            collapsible
            defaultValue={faqItems.length > 0 ? "donate-faq-0" : undefined}
            className="mt-12 grid items-start gap-4 md:mt-14 md:grid-cols-2 md:gap-5"
          >
            {faqItems.map((item, index) => (
              <AccordionItem
                key={`donate-faq-${index}`}
                value={`donate-faq-${index}`}
                className={cn(
                  "overflow-hidden rounded-2xl border-0 bg-muted/45 transition-colors duration-200 hover:bg-muted/65",
                  hasOddFaqItems && index === faqItems.length - 1 ? "md:col-span-2" : undefined,
                )}
              >
                <AccordionTrigger className="min-h-16 gap-5 px-6 py-5 text-left text-base font-semibold leading-6 text-foreground no-underline transition-colors hover:text-primary hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-foreground/55">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pr-12 text-sm leading-7 text-muted-foreground md:text-base">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
