import { useTranslation } from "react-i18next";

import { FaqSection, type FaqSectionItem } from "@/components/FaqSection";

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

export function Faq({ className }: Readonly<FaqProps>) {
  const { t } = useTranslation();
  const items: FaqSectionItem[] = faqItems.map((item) => ({
    id: item.id,
    question: t(item.questionKey),
    answers: item.answerKeys.map((answerKey) => t(answerKey)),
  }));

  return (
    <FaqSection
      className={className}
      description={t("information.faq.description")}
      eyebrow="FAQs"
      id="faq"
      items={items}
      title={t("information.faq.title")}
    />
  );
}
