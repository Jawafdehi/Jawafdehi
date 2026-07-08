import { Minus, Plus } from "lucide-react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type FaqSectionItem = {
  id: string;
  question: string;
  answers: string[];
};

type FaqSectionProps = {
  className?: string;
  contentClassName?: string;
  description: string;
  eyebrow?: string;
  id: string;
  items: FaqSectionItem[];
  title: string;
};

const faqCardClassName =
  "group overflow-hidden rounded-lg bg-card text-card-foreground outline-none transition-colors duration-200 ease-out hover:bg-card hover:text-card-foreground focus-within:bg-card focus-within:text-card-foreground";

const markdownComponents: Components = {
  p: ({ className, node: _node, ...props }) => (
    <p className={cn("mb-3 last:mb-0", className)} {...props} />
  ),
  ul: ({ className, node: _node, ...props }) => (
    <ul className={cn("my-3 list-disc space-y-2 pl-5", className)} {...props} />
  ),
  ol: ({ className, node: _node, ...props }) => (
    <ol
      className={cn("my-3 list-decimal space-y-2 pl-5", className)}
      {...props}
    />
  ),
  li: ({ className, node: _node, ...props }) => (
    <li className={cn("pl-1", className)} {...props} />
  ),
  strong: ({ className, node: _node, ...props }) => (
    <strong
      className={cn("font-medium text-foreground", className)}
      {...props}
    />
  ),
  a: ({ className, node: _node, ...props }) => (
    <a
      className={cn("font-medium text-primary underline-offset-4 hover:underline", className)}
      {...props}
    />
  ),
};

const splitFaqItems = (items: FaqSectionItem[]) => {
  const midpoint = Math.ceil(items.length / 2);

  return [items.slice(0, midpoint), items.slice(midpoint)];
};

export function FaqSection({
  className,
  contentClassName,
  description,
  eyebrow = "FAQs",
  id,
  items,
  title,
}: Readonly<FaqSectionProps>) {
  const titleId = `${id}-title`;

  return (
    <section
      id={id}
      className={cn("bg-background py-16 md:py-24", className)}
      aria-labelledby={titleId}
    >
      <div className="container mx-auto px-4">
        <div className={contentClassName}>
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                {eyebrow}
              </p>
            ) : null}
            <h2
              id={titleId}
              className="text-4xl font-bold leading-tight tracking-normal text-primary md:text-5xl"
            >
              {title}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-foreground/60 md:text-lg">
              {description}
            </p>
          </div>

          <Accordion
            type="single"
            collapsible
            defaultValue={items[0]?.id}
            className="mt-12 grid items-start gap-4 md:mt-16 md:grid-cols-2 md:gap-x-5 md:gap-y-0"
          >
            {splitFaqItems(items).map((columnItems, columnIndex) => (
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
                      <span>{item.question}</span>
                      <span
                        className="relative flex h-6 w-6 shrink-0 items-center justify-center text-foreground/55 transition-colors duration-200 group-hover:text-accent group-focus-within:text-accent"
                        aria-hidden="true"
                      >
                        <Plus className="absolute h-4 w-4 transition-all duration-200 ease-out group-data-[state=open]:rotate-90 group-data-[state=open]:scale-75 group-data-[state=open]:opacity-0" />
                        <Minus className="absolute h-4 w-4 -rotate-90 scale-75 opacity-0 transition-all duration-200 ease-out group-data-[state=open]:rotate-0 group-data-[state=open]:scale-100 group-data-[state=open]:opacity-100" />
                      </span>
                    </AccordionTrigger>
                    <AccordionContent
                      className="space-y-3 px-5 pb-6 pr-12 text-sm font-normal leading-7 text-muted-foreground md:px-6 md:text-base"
                    >
                      {item.answers.map((answer, index) => (
                        <Markdown
                          key={`${item.id}-answer-${index}`}
                          components={markdownComponents}
                          remarkPlugins={[remarkGfm]}
                        >
                          {answer}
                        </Markdown>
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
