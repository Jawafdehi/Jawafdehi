import type { PreviewDocument } from "@/components/DocumentPreviewDialog";
import type { Material } from "@/services/datalake-api";

interface MediaLink {
  contentUrl?: string;
  url?: string;
  encodingFormat?: string;
  "jawafdehi:linkRole"?: string;
  "jawafdehi:role"?: string;
  role?: string;
  name?: string;
}

const ROLE_LABELS: Record<string, string> = {
  RAW: "Download document",
  ALTERNATE: "Alternate format",
  SOURCE_PAGE: "Original source page",
  MARKDOWN: "Text transcript",
  PERMALINK: "Permalink",
};

function previewTypeOf(
  media: MediaLink,
  href: string,
  role: string,
): PreviewDocument["type"] | undefined {
  const format = (media.encodingFormat || "").toLowerCase();
  const extension = (href.split("?")[0].split(".").pop() || "").toLowerCase();
  if (format.includes("pdf") || extension === "pdf") return "pdf";
  if (
    role === "MARKDOWN" ||
    format.includes("markdown") ||
    extension === "md" ||
    extension === "markdown"
  ) {
    return "markdown";
  }
  return undefined;
}

export interface MaterialSourceLink {
  href: string;
  label: string;
  extension: string | null;
  previewType?: PreviewDocument["type"];
}

export function getMaterialSourceLinks(data: Material | undefined): MaterialSourceLink[] {
  if (!data) return [];
  const media = data.associatedMedia;
  const entries: MediaLink[] = Array.isArray(media)
    ? media
    : media
      ? [media as MediaLink]
      : [];

  return entries.flatMap((entry) => {
    const href = entry.contentUrl || entry.url;
    if (!href) return [];
    const role = (
      entry["jawafdehi:linkRole"] ||
      entry["jawafdehi:role"] ||
      entry.role ||
      ""
    ).toUpperCase();
    const previewType = previewTypeOf(entry, href, role);
    const extension = (href.split("?")[0].split(".").pop() || "").toLowerCase();
    const label =
      previewType === "pdf"
        ? "PDF"
        : previewType === "markdown"
          ? "Text"
          : extension && extension.length <= 6
            ? `.${extension.toUpperCase()}`
            : ROLE_LABELS[role] || entry.name || ROLE_LABELS.RAW;
    return [{ href, label, extension: extension || null, previewType }];
  });
}
