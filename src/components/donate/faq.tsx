import { useTranslation } from "react-i18next";

import { FaqSection, type FaqSectionItem } from "@/components/FaqSection";
import { currentSiteVariant, type SiteVariant } from "@/lib/site-host";

type DonateFaqItem = { q: string; a: string; site?: SiteVariant };

const isDonateFaqItem = (item: unknown): item is DonateFaqItem =>
  typeof item === "object" &&
  item !== null &&
  "q" in item &&
  "a" in item &&
  typeof item.q === "string" &&
  typeof item.a === "string" &&
  (!("site" in item) || item.site === "org" || item.site === "np");

/**
 * The donate page's FAQ. Uses the donor-specific Q&As from
 * `donate.faq.items` (monthly giving, where the money goes, tax
 * deductibility, receipts, volunteering) rather than the site-wide FAQ pool —
 * these are the questions someone holding their banking app actually has.
 *
 * An item with `site` belongs to one public site: the answers about Zeffy,
 * PayPal and US tax deductibility are jawafdehi.org only, because
 * jawafdehi.org.np does not ask for gifts to the US entity.
 */
export function DonationFaq() {
  const { t } = useTranslation();
  const variant = currentSiteVariant();
  const rawItems = t("donate.faq.items", { returnObjects: true });
  const items: FaqSectionItem[] = (
    Array.isArray(rawItems) ? rawItems.filter(isDonateFaqItem) : []
  )
    .map((item, index) => ({
      id: `donate-faq-${index}`,
      question: item.q,
      answers: [item.a],
      site: item.site,
    }))
    .filter((item) => variant === null || !item.site || item.site === variant);

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
