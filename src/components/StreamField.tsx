import { Link } from "react-router-dom";
import { Download, FileText, ArrowRight } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

import type {
  StreamBlock,
  StreamCaseValue,
  StreamDocumentValue,
  StreamEmbedValue,
  StreamImageValue,
} from "@/types/cms";

// CMS rich-text/oEmbed HTML is authored by staff, but we sanitize as
// defense-in-depth before injecting it. isomorphic-dompurify works under SSR.
const sanitize = (html: string) => DOMPurify.sanitize(html);

const headingId = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const DocumentBlock = ({ value }: { value: StreamDocumentValue }) => {
  if (!value) {
    return null;
  }
  return (
    <a
      href={value.url}
      target="_blank"
      rel="noopener noreferrer"
      className="not-prose my-4 flex items-start gap-3 rounded-lg border border-border/70 bg-background p-3 no-underline transition-colors hover:border-primary/20 hover:bg-primary/[0.03]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <FileText className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-5 text-foreground">
          {value.title || value.filename}
        </span>
        <span className="mt-1 inline-flex items-center text-xs font-semibold text-primary">
          <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Download
        </span>
      </span>
    </a>
  );
};

const CaseBlock = ({ value }: { value: StreamCaseValue }) => {
  if (!value?.case) {
    return null;
  }
  return (
    <Link
      to={`/case/${value.case.slug}`}
      className="not-prose my-4 flex items-center justify-between gap-3 rounded-lg border border-primary/15 bg-primary/[0.03] p-4 no-underline transition-colors hover:border-primary/30"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
          Related case
        </span>
        <span className="mt-1 block font-semibold text-foreground">
          {value.case.title}
        </span>
        {value.note ? (
          <span className="mt-1 block text-sm text-muted-foreground">
            {value.note}
          </span>
        ) : null}
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
    </Link>
  );
};

const ImageBlock = ({ value }: { value: StreamImageValue }) => {
  if (!value?.image?.url) {
    return null;
  }
  return (
    <figure>
      <img
        src={value.image.url}
        alt={value.image.alt || value.caption || ""}
        loading="lazy"
        className="rounded-lg"
      />
      {value.caption ? <figcaption>{value.caption}</figcaption> : null}
    </figure>
  );
};

const EmbedBlock = ({ value }: { value: string | StreamEmbedValue }) => {
  const html = value && typeof value === "object" ? value.html : undefined;
  const url = typeof value === "string" ? value : value?.url;
  if (html) {
    return <div dangerouslySetInnerHTML={{ __html: sanitize(html) }} />;
  }
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>
    );
  }
  return null;
};

/**
 * Renders a Wagtail StreamField body. Rich-text ("paragraph") and oEmbed HTML
 * are sanitized before injection (defense-in-depth — see `sanitize`).
 */
export const StreamField = ({ blocks }: { blocks: StreamBlock[] }) => {
  if (!blocks?.length) {
    return null;
  }
  return (
    <>
      {blocks.map((block) => {
        switch (block.type) {
          case "heading": {
            const text = String(block.value);
            return (
              <h2 key={block.id} id={headingId(text)}>
                {text}
              </h2>
            );
          }
          case "paragraph":
            return (
              <div
                key={block.id}
                dangerouslySetInnerHTML={{ __html: sanitize(String(block.value)) }}
              />
            );
          case "quote":
            return <blockquote key={block.id}>{String(block.value)}</blockquote>;
          case "image":
            return <ImageBlock key={block.id} value={block.value as StreamImageValue} />;
          case "document":
            return (
              <DocumentBlock key={block.id} value={block.value as StreamDocumentValue} />
            );
          case "case":
            return <CaseBlock key={block.id} value={block.value as StreamCaseValue} />;
          case "embed":
            return (
              <EmbedBlock key={block.id} value={block.value as string | StreamEmbedValue} />
            );
          default:
            return null;
        }
      })}
    </>
  );
};

export default StreamField;
