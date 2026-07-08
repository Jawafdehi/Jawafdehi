import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type FaqProps = {
  className?: string;
};

type FaqItem = {
  id: string;
  questionKey: string;
  answerKeys: string[];
};

const faqItems: FaqItem[] = [
  {
    id: "how-to-report",
    questionKey: "information.faq.howToReport.question",
    answerKeys: [
      "information.faq.howToReport.answer1",
      "information.faq.howToReport.answer2",
    ],
  },
  {
    id: "after-submit",
    questionKey: "information.faq.afterSubmit.question",
    answerKeys: ["information.faq.afterSubmit.answer"],
  },
  {
    id: "anonymous",
    questionKey: "information.faq.anonymous.question",
    answerKeys: ["information.faq.anonymous.answer"],
  },
  {
    id: "accused-response",
    questionKey: "information.faq.entityResponse.question",
    answerKeys: ["information.faq.entityResponse.answer"],
  },
  {
    id: "inaccurate",
    questionKey: "information.faq.inaccurate.question",
    answerKeys: ["information.faq.inaccurate.answer"],
  },
  {
    id: "funding",
    questionKey: "information.faq.funding.question",
    answerKeys: ["information.faq.funding.answer"],
  },
  {
    id: "use-info",
    questionKey: "information.faq.useInfo.question",
    answerKeys: ["information.faq.useInfo.answer"],
  },
];

const faqCardClassName =
  "group overflow-hidden rounded-lg bg-card text-card-foreground outline-none transition-colors duration-200 ease-out hover:bg-card hover:text-card-foreground focus-within:bg-card focus-within:text-card-foreground";

const splitFaqItems = (items: FaqItem[]) => {
  const midpoint = Math.ceil(items.length / 2);

  return [items.slice(0, midpoint), items.slice(midpoint)];
};

export function Faq({ className }: Readonly<FaqProps>) {
  const { t } = useTranslation();

  return (
    <section
      id="faq"
      className={cn("bg-background py-16 md:py-24", className)}
      aria-labelledby="faq-title"
    >
      <div className="container mx-auto px-4">
        <div>
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              FAQs
            </p>
            <h2
              id="faq-title"
              className="text-4xl font-bold leading-tight tracking-normal text-primary md:text-5xl"
            >
              {t("information.faq.title")}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-foreground/60 md:text-lg">
              {t("information.faq.description")}
            </p>
          </div>

          <Accordion
            type="single"
            collapsible
            defaultValue={faqItems[0]?.id}
            className="mt-12 grid items-start gap-4 md:mt-16 md:grid-cols-2 md:gap-x-5 md:gap-y-0"
          >
            {splitFaqItems(faqItems).map((columnItems, columnIndex) => (
              <div
                key={`faq-column-${columnIndex}`}
                className="flex flex-col gap-4"
              >
                {columnItems.map((item) => (
                  <AccordionItem
                    key={item.id}
                    value={item.id}
                    className={faqCardClassName}
                  >
                    <AccordionTrigger className="min-h-[4.25rem] gap-5 px-5 py-5 text-left text-base font-semibold leading-6 text-foreground no-underline transition-colors hover:text-primary hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-6 [&>svg]:hidden">
                      <span>{t(item.questionKey)}</span>
                      <span
                        className="relative flex h-6 w-6 shrink-0 items-center justify-center text-foreground/55 transition-colors duration-200 group-hover:text-accent group-focus-within:text-accent"
                        aria-hidden="true"
                      >
                        <Plus className="absolute h-4 w-4 transition-all duration-200 ease-out group-data-[state=open]:rotate-90 group-data-[state=open]:scale-75 group-data-[state=open]:opacity-0" />
                        <Minus className="absolute h-4 w-4 -rotate-90 scale-75 opacity-0 transition-all duration-200 ease-out group-data-[state=open]:rotate-0 group-data-[state=open]:scale-100 group-data-[state=open]:opacity-100" />
                      </span>
                    </AccordionTrigger>
                    <AccordionContent
                      className="space-y-3 px-5 pb-6 pr-12 text-sm leading-7 text-muted-foreground md:px-6 md:text-base"
                    >
                      {item.answerKeys.map((answerKey) => (
                        <p key={answerKey}>{t(answerKey)}</p>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </div>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
