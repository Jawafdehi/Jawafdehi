import { useTranslation } from "react-i18next";

import { FaqSection, type FaqSectionItem } from "@/components/FaqSection";

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
  const items: FaqSectionItem[] = faqItems.map((item, index) => ({
    id: `donate-faq-${index}`,
    question: item.q,
    answers: [item.a],
  }));

  return (
    <FaqSection
      className="md:py-20"
      contentClassName="mx-auto max-w-6xl"
      description={t("donate.faq.description")}
      eyebrow={t("donate.faq.eyebrow")}
      id="donate-faq"
      items={items}
      title={t("donate.faq.title")}
    />
  );
}
