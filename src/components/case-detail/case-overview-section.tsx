import { CaseSectionHeading } from "@/components/case-detail/case-section-heading";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeColspan, { padColspanTableHeaders } from "@/utils/rehype-colspan";
import { useTranslation } from "react-i18next";
import { CollapsibleCaseContent } from "@/components/case-detail/collapsible-case-content";

interface CaseOverviewSectionProps {
  description: string;
  title: string;
}

export function CaseOverviewSection({
  description,
  title,
}: Readonly<CaseOverviewSectionProps>) {
  const { t } = useTranslation();

  return (
    <section id="overview" className="mb-12 w-full max-w-4xl min-w-0 scroll-mt-28">
      <CaseSectionHeading>{title}</CaseSectionHeading>

      <CollapsibleCaseContent
        readMoreLabel={t("caseDetail.readMore")}
        showLessLabel={t("caseDetail.showLess")}
      >
        <div className="font-paragraph content-prose">
          <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeColspan]}>
            {padColspanTableHeaders(description)}
          </Markdown>
        </div>
      </CollapsibleCaseContent>
    </section>
  );
}
