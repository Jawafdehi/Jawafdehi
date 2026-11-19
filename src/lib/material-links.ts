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
  const extension = extensionOf(href);
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

function extensionOf(href: string): string {
  let filename = href.split("?")[0].split("/").pop() || "";
  try {
    filename = new URL(href).pathname.split("/").filter(Boolean).pop() || "";
  } catch {
    // Relative and malformed URLs still use the path fallback above.
  }
  if (!filename.includes(".")) return "";
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  return /^[a-z0-9]{1,6}$/.test(extension) ? extension : "";
}

/**
 * Our unredacted copies are staff-only. The API already withholds them from
 * public payloads; this is the site's own guard, so a stale API, a cached page
 * or a new endpoint can never put a link to one in front of a reader.
 *
 * Same rule as the API (`materials/artifacts.py::is_withheld`): an ORIGINAL
 * (our MARKDOWN transcript, or our RAW/ALTERNATE/PERMALINK file) hosted on OUR
 * storage is dropped whenever its redacted counterpart is in the same list.
 * Publisher-hosted links and documents with no redacted copy are untouched.
 */
const OUR_STORAGE_HOSTS = new Set(["s3.jawafdehi.org"]);
const ORIGINAL_FILE_ROLES = new Set(["RAW", "ALTERNATE", "PERMALINK"]);

function isOurCopy(href: string): boolean {
  try {
    return OUR_STORAGE_HOSTS.has(new URL(href).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function withholdUnredacted<T>(
  items: T[],
  hrefOf: (item: T) => string | undefined,
  roleOf: (item: T) => string | undefined,
): T[] {
  const roles = new Set(items.map((i) => (roleOf(i) || "RAW").toUpperCase()));
  return items.filter((item) => {
    const href = hrefOf(item);
    if (!href || !isOurCopy(href)) return true;
    const role = (roleOf(item) || "RAW").toUpperCase();
    if (role === "MARKDOWN") return !roles.has("REDACTED_MARKDOWN");
    if (ORIGINAL_FILE_ROLES.has(role)) return !roles.has("REDACTED_PDF");
    return true;
  });
}

const mediaRoleOf = (entry: MediaLink) =>
  entry["jawafdehi:linkRole"] || entry["jawafdehi:role"] || entry.role || "";

export interface MaterialSourceLink {
  href: string;
  label: string;
  extension: string | null;
  isExternal: boolean;
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

  const visible = withholdUnredacted(entries, (e) => e.contentUrl || e.url, mediaRoleOf);

  return visible.flatMap((entry) => {
    const href = entry.contentUrl || entry.url;
    if (!href) return [];
    const role = (
      entry["jawafdehi:linkRole"] ||
      entry["jawafdehi:role"] ||
      entry.role ||
      ""
    ).toUpperCase();
    const previewType = previewTypeOf(entry, href, role);
    const extension = extensionOf(href);
    const isExternal =
      role === "SOURCE_PAGE" ||
      role === "PERMALINK" ||
      (entry.encodingFormat || "").toLowerCase().includes("html");
    const label =
      previewType === "pdf"
        ? "PDF"
        : previewType === "markdown"
          ? "Text"
          : extension && extension.length <= 6
            ? `.${extension.toUpperCase()}`
            : ROLE_LABELS[role] || entry.name || ROLE_LABELS.RAW;
    return [{ href, label, extension: extension || null, isExternal, previewType }];
  });
}
