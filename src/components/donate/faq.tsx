import { useTranslation } from "react-i18next";

import { FaqSection, type FaqSectionItem } from "@/components/FaqSection";

type DonateFaqItem = { q: string; a: string };

const isDonateFaqItem = (item: unknown): item is DonateFaqItem =>
  typeof item === "object" &&
  item !== null &&
  "q" in item &&
  "a" in item &&
  typeof item.q === "string" &&
  typeof item.a === "string";

/**
 * The donate page's FAQ. Uses the donor-specific Q&As from
 * `donate.faq.items` (monthly giving, where the money goes, tax
 * deductibility, receipts, volunteering) rather than the site-wide FAQ pool —
 * these are the questions someone holding their banking app actually has.
 */
export function DonationFaq() {
  const { t } = useTranslation();
  const rawItems = t("donate.faq.items", { returnObjects: true });
  const items: FaqSectionItem[] = (
    Array.isArray(rawItems) ? rawItems.filter(isDonateFaqItem) : []
  ).map((item, index) => ({
    id: `donate-faq-${index}`,
    question: item.q,
    answers: [item.a],
  }));

  return (
    <FaqSection
      className="md:py-20"
      contentClassName="mx-auto max-w-6xl"
      description={t("donate.faq.description")}
      eyebrow={t("nav.faq")}
      id="donate-faq"
      items={items}
      title={t("donate.faq.title")}
    />
  );
}
