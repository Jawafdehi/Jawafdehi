import { Archive, ExternalLink, FileText, Files, Globe, Landmark, Lock, Scale, User } from "@/components/icons";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { PreviewDocument } from "@/components/DocumentPreviewDialog";
import { LinkifiedText } from "@/components/LinkifiedText";
import {
  formatBsDate,
  type EvidenceAction,
  type EvidenceOrigin,
  type EvidenceRow,
} from "@/lib/evidence-sources";
import { ORIGINAL_DOCUMENT_REL } from "@/lib/original-document";
import { cn } from "@/lib/utils";
import { materialTail } from "@/services/datalake-api";
import { canPreviewDocument } from "@/utils/document-preview-url";

interface DocumentSourceCardProps {
  row: EvidenceRow;
  /** Show the group as a tag: the by-date view mixes groups in one list. */
  showGroup?: boolean;
  onPreview: (document: PreviewDocument) => void;
}

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const PILL = cn(
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 text-[13px] text-primary transition-colors hover:bg-primary/[0.08] active:scale-[0.97]",
  FOCUS,
);
const GHOST_PILL = cn(
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-primary",
  FOCUS,
);
const PENDING_PILL =
  "inline-flex h-8 shrink-0 cursor-help items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 text-[12.5px] text-muted-foreground";

const ACTION_ICON: Record<EvidenceAction["kind"], ComponentType<{ className?: string }>> = {
  pdf: FileText,
  text: Files,
  source: ExternalLink,
  file: Files,
  archive: Archive,
};

const previewTypeOf = (action: EvidenceAction): PreviewDocument["type"] | undefined => {
  // The viewer can only load files from our own buckets.
  if (!canPreviewDocument(action.href)) return undefined;
  if (action.kind === "pdf") return "pdf";
  if (action.kind === "text") return "markdown";
  return undefined;
};

function OriginChip({ origin }: Readonly<{ origin: EvidenceOrigin }>) {
  const { t, i18n } = useTranslation();
  const ne = (i18n.language ?? "ne").startsWith("ne");
  const label = ne && origin.labelNe ? origin.labelNe : origin.label;
  const Glyph = origin.kind === "court" ? Scale : origin.kind === "police" ? User : origin.kind === "web" ? Globe : Landmark;
  const className =
    "inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted py-0.5 pl-1 pr-2.5 text-[12.5px] leading-5 text-primary";

  const body = (
    <>
      {origin.logo ? (
        <img
          src={origin.logo}
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 shrink-0 rounded-full bg-white object-contain"
        />
      ) : (
        <span
          className={cn(
            "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
            // Police: a filled officer on the site's blue, close to Nepal Police blue.
            origin.kind === "police" ? "bg-tone-blue text-white" : "bg-white",
          )}
        >
          <Glyph className={cn("h-3 w-3", origin.kind === "police" && "fill-current")} aria-hidden="true" />
        </span>
      )}
      <span className="truncate">{label}</span>
      {origin.account ? <span className="truncate text-muted-foreground">· {origin.account}</span> : null}
    </>
  );

  if (origin.href && /^https?:\/\//i.test(origin.href)) {
    return (
      <a
        href={origin.href}
        target="_blank"
        rel={ORIGINAL_DOCUMENT_REL}
        title={origin.href}
        aria-label={`${t("caseSources.originalAt", { name: label })} ${t("documentSource.opensInNewTab")}`}
        className={cn(className, "transition-colors hover:bg-primary/[0.08]", FOCUS)}
      >
        {body}
      </a>
    );
  }
  return <span className={className}>{body}</span>;
}

/**
 * One source on a case page: date, title, where it came from, and its readable
 * copies, or a plain statement that a copy is still to be published.
 */
export function DocumentSourceCard({ row, showGroup = false, onPreview }: Readonly<DocumentSourceCardProps>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language ?? "ne";
  const title = row.title || t("documentSource.fallbackTitle", { id: row.materialIri });
  const details = row.details.join(" · ");

  return (
    <li className="border-b border-border/70 last:border-b-0">
      <article className="hidden print:block">
        <h3 className="print-source-title">{title}</h3>
        {details ? <p>{details}</p> : null}
        {row.actions.length ? (
          <ul>
            {row.actions.map((a) => (
              <li key={a.href}>
                <a href={a.href} rel={ORIGINAL_DOCUMENT_REL}>{a.href}</a>
              </li>
            ))}
          </ul>
        ) : null}
      </article>

      <article className="grid grid-cols-1 gap-x-4 gap-y-1 py-3 print:hidden md:grid-cols-[6.5rem_minmax(0,1fr)_auto] md:items-start md:py-3.5">
        <div
          className={cn(
            "text-[13px] leading-6 tabular-nums md:pt-px",
            row.date ? "text-muted-foreground" : "text-muted-foreground/60",
          )}
        >
          {row.date ? formatBsDate(row.date, language) : t("caseSources.undated")}
        </div>

        <div className="min-w-0">
          <h3 className="text-[15.5px] leading-6 text-primary">
            {row.materialIri ? (
              <Link
                to={`/material/${materialTail(row.materialIri)}`}
                title={title}
                className={cn("line-clamp-2 break-words rounded-sm underline-offset-4 hover:underline", FOCUS)}
              >
                {title}
              </Link>
            ) : (
              <span className="line-clamp-2 break-words">{title}</span>
            )}
          </h3>

          {showGroup || row.origin || details ? (
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-5 text-muted-foreground">
              {showGroup ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11.5px] text-primary">
                  {t(`caseSources.group.${row.group}`)}
                </span>
              ) : null}
              {row.origin ? <OriginChip origin={row.origin} /> : null}
              {details ? (
                <span className="line-clamp-2 min-w-0 break-words md:line-clamp-1" title={details}>
                  <LinkifiedText text={details} />
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 md:mt-0 md:flex-nowrap md:justify-end">
          {row.actions.map((action) => {
            const Icon = ACTION_ICON[action.kind];
            const previewType = previewTypeOf(action);
            const className = action.kind === "archive" || action.kind === "file" ? GHOST_PILL : PILL;
            const label = t(`caseSources.action.${action.kind}`);
            const hint = action.redacted ? t("caseSources.redactedCopy") : undefined;

            if (previewType) {
              return (
                <button
                  key={action.href}
                  type="button"
                  className={className}
                  title={hint}
                  aria-label={t("documentPreview.previewAria", { title: `${label}: ${title}` })}
                  onClick={() => onPreview({ title, type: previewType, url: action.href })}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              );
            }
            return (
              <a
                key={action.href}
                href={action.href}
                target="_blank"
                rel={ORIGINAL_DOCUMENT_REL}
                className={className}
                title={hint}
                aria-label={`${label}: ${title} ${t("documentSource.opensInNewTab")}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </a>
            );
          })}

          {row.withheld !== "none" ? (
            <span className={PENDING_PILL} title={t("caseSources.pendingExplain")}>
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              {row.withheld === "all" ? t("caseSources.pending") : t("caseSources.pdfPending")}
            </span>
          ) : null}
        </div>
      </article>
    </li>
  );
}
