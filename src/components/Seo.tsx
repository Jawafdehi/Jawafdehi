import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";

import { buildHeadTags, type HeadTagInput } from "@/utils/seo";

interface SeoProps extends HeadTagInput {
  /**
   * Page-specific head tags the shared list does not cover — JSON-LD, oEmbed and
   * JSON API alternates. Rendered inside the same Helmet so a page still emits
   * one head.
   */
  children?: ReactNode;
}

/**
 * The share metadata for a page: title, description, canonical, Open Graph and
 * Twitter card. The tag list itself lives in utils/seo so worker.ts renders the
 * same one as HTML — see buildHeadTags.
 */
export function Seo({ children, ...input }: SeoProps) {
  return (
    <Helmet>
      {buildHeadTags(input).map((tag) => {
        if (tag.kind === "title") {
          return <title key="title">{tag.content}</title>;
        }
        if (tag.kind === "meta") {
          // article:tag repeats, so the key carries the value too.
          const key = `${tag.attr}:${tag.key}:${tag.content}`;
          return tag.attr === "property" ? (
            <meta key={key} property={tag.key} content={tag.content} />
          ) : (
            <meta key={key} name={tag.key} content={tag.content} />
          );
        }
        return (
          <link
            key={`link:${tag.rel}:${tag.href}`}
            rel={tag.rel}
            href={tag.href}
            {...(tag.type ? { type: tag.type } : {})}
            {...(tag.title ? { title: tag.title } : {})}
          />
        );
      })}
      {children}
    </Helmet>
  );
}

export default Seo;
