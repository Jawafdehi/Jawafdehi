import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  "group overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm shadow-foreground/5 outline-none backdrop-blur-[12px] transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-card hover:text-card-foreground hover:shadow-md hover:shadow-foreground/10 focus-visible:-translate-y-0.5 focus-visible:border-foreground/15 focus-visible:bg-card focus-visible:text-card-foreground focus-visible:shadow-md focus-visible:shadow-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-within:-translate-y-0.5 focus-within:border-foreground/15 focus-within:bg-card focus-within:text-card-foreground focus-within:shadow-md focus-within:shadow-foreground/10 motion-reduce:transform-none motion-reduce:transition-none";

const faqAnswerClassName =
  "max-h-0 -translate-y-1 overflow-hidden opacity-0 transition-[max-height,opacity,transform] duration-300 ease-out group-hover:max-h-96 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:max-h-96 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-focus-within:max-h-96 group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transform-none motion-reduce:transition-none";

export function Faq({ className }: Readonly<FaqProps>) {
  const { t } = useTranslation();

  return (
    <section
      id="faq"
      className={cn("bg-background py-12 md:py-16", className)}
      aria-labelledby="faq-title"
    >
      <div className="container mx-auto grid gap-8 px-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.45fr)] md:items-start md:gap-12 lg:gap-16">
        <div className="max-w-md">
          <h2
            id="faq-title"
            className="max-w-sm text-3xl font-bold leading-tight tracking-normal text-primary md:text-4xl"
          >
            {t("information.faq.title")}
          </h2>
          <p className="mt-5 text-sm leading-7 text-foreground/60 md:text-base">
            {t("information.faq.description")}
          </p>
        </div>

        <ul className="flex flex-col gap-2.5">
          {faqItems.map((item) => {
            const questionId = `faq-${item.id}-question`;
            const answerId = `faq-${item.id}-answer`;

            return (
              <li
                key={item.id}
                className={faqCardClassName}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  aria-expanded={false}
                  aria-controls={answerId}
                  onClick={(e) => {
                    const btn = e.currentTarget;
                    const isExpanded = btn.getAttribute("aria-expanded") === "true";
                    btn.setAttribute("aria-expanded", String(!isExpanded));
                    const answer = document.getElementById(answerId);
                    if (answer) {
                      if (isExpanded) {
                        answer.classList.add("max-h-0", "-translate-y-1", "overflow-hidden", "opacity-0");
                        answer.classList.remove("max-h-96", "translate-y-0", "opacity-100");
                      } else {
                        answer.classList.remove("max-h-0", "-translate-y-1", "overflow-hidden", "opacity-0");
                        answer.classList.add("max-h-96", "translate-y-0", "opacity-100");
                      }
                    }
                  }}
                >
                  <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-3.5">
                    <h3
                      id={questionId}
                      className="text-left text-sm font-semibold leading-6 text-foreground transition-colors duration-200 group-hover:text-primary group-focus-visible:text-primary group-focus-within:text-primary md:text-base"
                    >
                      {t(item.questionKey)}
                    </h3>
                    <span
                      className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-foreground/50 shadow-sm shadow-foreground/5 transition-[background-color,border-color,color] duration-200 group-hover:border-accent/20 group-hover:bg-accent/10 group-hover:text-accent group-focus-visible:border-accent/20 group-focus-visible:bg-accent/10 group-focus-within:border-accent/20 group-focus-within:bg-accent/10 group-focus-within:text-accent motion-reduce:transition-none"
                      aria-hidden="true"
                    >
                      <Plus className="absolute h-3.5 w-3.5 transition-all duration-300 ease-out group-hover:rotate-90 group-hover:scale-[0.82] group-hover:opacity-0 group-focus-visible:rotate-90 group-focus-visible:scale-[0.82] group-focus-visible:opacity-0 group-focus-within:rotate-90 group-focus-within:scale-[0.82] group-focus-within:opacity-0 motion-reduce:transition-none" />
                      <Minus className="absolute h-3.5 w-3.5 -rotate-90 scale-[0.82] opacity-0 transition-all duration-300 ease-out group-hover:rotate-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:rotate-0 group-focus-visible:scale-100 group-focus-visible:opacity-100 group-focus-within:rotate-0 group-focus-within:scale-100 group-focus-within:opacity-100 motion-reduce:transition-none" />
                    </span>
                  </div>
                </button>

                <div id={answerId} className={faqAnswerClassName}>
                  <div className="space-y-3 px-4 pb-4 pr-12 text-sm leading-6 text-muted-foreground md:text-base">
                    {item.answerKeys.map((answerKey) => (
                      <p key={answerKey}>{t(answerKey)}</p>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
