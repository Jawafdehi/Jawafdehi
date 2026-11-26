import { Fragment } from "react";

import { ExternalLink } from "@/components/icons";
import { linkifyText } from "@/lib/linkify";
import { ORIGINAL_DOCUMENT_REL } from "@/lib/original-document";

interface LinkifiedTextProps {
  text: string;
}

/**
 * Plain text with its http(s) URLs rendered as compact links, labelled with
 * the outlet's name or the host ("Source: Kantipur ↗"). The full URL stays in
 * the tooltip. Links point at original publications, so they carry the same
 * rel as every other original-source link.
 */
export function LinkifiedText({ text }: Readonly<LinkifiedTextProps>) {
  return (
    <>
      {linkifyText(text).map((segment, index) =>
        segment.kind === "text" ? (
          <Fragment key={index}>{segment.text}</Fragment>
        ) : (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel={ORIGINAL_DOCUMENT_REL}
            title={segment.title}
            className="inline-flex items-center gap-1 text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary"
          >
            {segment.label}
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </a>
        ),
      )}
    </>
  );
}
