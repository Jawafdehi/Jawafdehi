import { useTranslation } from "react-i18next";

import { FaqSection, type FaqSectionItem } from "@/components/FaqSection";
import { getFaqSnippetItems } from "@/lib/faq-page-content";

type FaqProps = {
  className?: string;
};

const homeFaqQuestionIds = [
  "report-a-case",
  "after-submit",
  "anonymous-reporting",
  "right-to-respond",
  "inaccurate-information",
  "funding",
  "reuse-information",
] as const;

export function Faq({ className }: Readonly<FaqProps>) {
  const { t } = useTranslation();
  const rawFaqSections = t("faqPage.sections", { returnObjects: true });
  const items: FaqSectionItem[] = getFaqSnippetItems(
    rawFaqSections,
    homeFaqQuestionIds,
  );

  return (
    <FaqSection
      className={className}
      description={t("information.faq.description")}
      eyebrow={t("nav.faq")}
      id="faq"
      items={items}
      title={t("information.faq.title")}
    />
  );
}
