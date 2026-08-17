import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Eye, FileText, ArrowRight } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { useTranslation } from "react-i18next";

// Type-only, so the viewer (react-markdown, the PDF renderer) stays out of the
// article bundle; the component itself is pulled in on first preview below.
import type { PreviewDocument } from "@/components/DocumentPreviewDialog";
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

// Most articles carry no document at all, and the viewer is heavy (markdown
// renderer + PDF engine), so it is fetched on the first preview rather than
// shipped with every article body.
const DocumentPreviewDialog = lazy(() =>
  import("@/components/DocumentPreviewDialog").then((module) => ({
    default: module.DocumentPreviewDialog,
  })),
);

const DOCUMENT_CARD_CLASS =
  "not-prose my-4 flex w-full items-start gap-3 rounded-lg border border-border/70 bg-background p-3 text-left no-underline transition-colors hover:border-primary/20 hover:bg-primary-surface/[0.03]";

// Only PDFs and markdown/text have a viewer — the shared <DocumentPreviewDialog>
// renders exactly those two. Anything else (docx, xlsx, images…) has nothing to
// preview, so it keeps the direct download rather than opening a dialog that
// can only apologise. Mirrors `previewTypeOf` on MaterialProfile.
const previewTypeOf = (
  value: StreamDocumentValue,
): PreviewDocument["type"] | undefined => {
  const source = (value.filename || value.url || "").split("?")[0].toLowerCase();
  const extension = source.includes(".") ? source.split(".").pop() : "";
  if (extension === "pdf") return "pdf";
  if (extension === "md" || extension === "markdown") return "markdown";
  return undefined;
};

const DocumentCardBody = ({
  action,
  icon: Icon,
  title,
}: {
  action: string;
  icon: typeof Download;
  title: string;
}) => (
  <>
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
      <FileText className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold leading-5 text-foreground">
        {title}
      </span>
      <span className="mt-1 inline-flex items-center text-xs font-semibold text-primary">
        <Icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        {action}
      </span>
    </span>
  </>
);

const DocumentBlock = ({ value }: { value: StreamDocumentValue }) => {
  const { t } = useTranslation();
  const [previewing, setPreviewing] = useState(false);

  if (!value) {
    return null;
  }

  const title = value.title || value.filename;
  const previewType = previewTypeOf(value);

  // Nothing to preview: keep the original straight-to-download link.
  if (!previewType) {
    return (
      <a
        href={value.url}
        target="_blank"
        rel="noopener noreferrer"
        className={DOCUMENT_CARD_CLASS}
      >
        <DocumentCardBody
          action={t("documentPreview.download", "Download")}
          icon={Download}
          title={title}
        />
      </a>
    );
  }

  // Previewable: open the shared viewer, which offers download as a secondary
  // action inside the dialog.
  return (
    <>
      <button type="button" onClick={() => setPreviewing(true)} className={DOCUMENT_CARD_CLASS}>
        <DocumentCardBody
          action={t("documentPreview.preview", "Preview")}
          icon={Eye}
          title={title}
        />
      </button>
      {previewing ? (
        <Suspense fallback={null}>
          <DocumentPreviewDialog
            document={{ title, type: previewType, url: value.url }}
            open
            onOpenChange={setPreviewing}
          />
        </Suspense>
      ) : null}
    </>
  );
};

const CaseBlock = ({ value }: { value: StreamCaseValue }) => {
  if (!value?.case) {
    return null;
  }
  return (
    <Link
      to={`/case/${value.case.slug}`}
      className="not-prose my-4 flex items-center justify-between gap-3 rounded-lg border border-primary/15 bg-primary-surface/[0.03] p-4 no-underline transition-colors hover:border-primary/30"
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
