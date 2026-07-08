import { useTranslation } from "react-i18next";

import { FaqSection, type FaqSectionItem } from "@/components/FaqSection";
import { getFaqSnippetItems } from "@/lib/faq-page-content";

const donationFaqQuestionIds = [
  "financial-support",
  "funding",
  "help-without-donating",
] as const;

export function DonationFaq() {
  const { t } = useTranslation();
  const rawFaqSections = t("faqPage.sections", { returnObjects: true });
  const items: FaqSectionItem[] = getFaqSnippetItems(
    rawFaqSections,
    donationFaqQuestionIds,
  );

  return (
    <FaqSection
      className="md:py-20"
      contentClassName="mx-auto max-w-6xl"
      description={t("donate.faq.description")}
      eyebrow="FAQs"
      id="donate-faq"
      items={items}
      title={t("donate.faq.title")}
    />
  );
}
