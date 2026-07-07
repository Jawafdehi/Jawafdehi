import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeColspan, { padColspanTableHeaders } from "@/utils/rehype-colspan";

interface CaseOverviewSectionProps {
  description: string;
  title: string;
}

export function CaseOverviewSection({
  description,
  title,
}: Readonly<CaseOverviewSectionProps>) {
  return (
    <section id="overview" className="mb-12 scroll-mt-28 w-full max-w-4xl min-w-0">
      <h2 className="mb-6 flex items-center text-xl md:text-2xl font-semibold tracking-tight text-primary">

        {title}
      </h2>

      <div className="overflow-hidden w-full min-w-0">
        <div className="prose-content w-full max-w-4xl text-base md:text-lg font-normal leading-[1.7] text-primary/75 [&_p]:mb-4 [&_p]:leading-[1.7] [&_p:last-child]:mb-0 [&_ul]:my-4 [&_ul]:space-y-2 [&_li]:ml-6 [&_li]:pl-2 [&_li]:leading-[1.7] [&_li]:mb-1 [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-primary md:[&_h1]:text-3xl [&_h1]:mt-6 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-primary md:[&_h2]:text-2xl [&_h2]:mt-5 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-primary md:[&_h3]:text-xl [&_h3]:mt-4 [&_table]:my-4 [&_table]:block [&_table]:overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:text-primary [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2.5 [&_td]:text-base md:[&_td]:text-lg [&_td]:font-normal [&_td]:leading-[1.7] [&_td]:text-primary/75 [&_tr:nth-child(even)]:bg-muted/30 [&_caption]:mb-3 [&_caption]:text-sm [&_caption]:font-semibold [&_caption]:text-primary">
          <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeColspan]}>
            {padColspanTableHeaders(description)}
          </Markdown>
        </div>
      </div>
    </section>
  );
}
