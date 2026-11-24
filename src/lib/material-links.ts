import type { PreviewDocument } from "@/components/DocumentPreviewDialog";
import type { Material } from "@/services/datalake-api";
import { canPreviewDocument } from "@/utils/document-preview-url";

interface MediaLink {
  "jawafdehi:withheld"?: string;
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
 * A link into the private originals bucket is always dropped.
 */
const OUR_STORAGE_HOSTS = new Set(["s3.jawafdehi.org"]);
// The staff-only bucket's link identifier. Never a routed host: a link to it is
// dead for everyone, so it is never rendered. Staff reach those files through
// the signed "Staff only" buttons instead.
const PRIVATE_ORIGINALS_HOSTS = new Set(["private-originals.jawafdehi.org"]);
const ORIGINAL_FILE_ROLES = new Set(["RAW", "ALTERNATE", "PERMALINK"]);

function isPrivateCopy(href: string): boolean {
  try {
    return PRIVATE_ORIGINALS_HOSTS.has(new URL(href).hostname.toLowerCase());
  } catch {
    return false;
  }
}

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
    if (href && isPrivateCopy(href)) return false;
    if (!href || !isOurCopy(href)) return true;
    const role = (roleOf(item) || "RAW").toUpperCase();
    if (role === "MARKDOWN") return !roles.has("REDACTED_MARKDOWN");
    if (ORIGINAL_FILE_ROLES.has(role)) return !roles.has("REDACTED_PDF");
    return true;
  });
}

/**
 * Set by the API on an original of ours that could not be redacted (JAW-167):
 * it is withheld with NOTHING published in its place, and the page says so.
 */
const WITHHELD_PENDING_REDACTION = "PENDING_REDACTION";

/**
 * Whether this document's file is withheld until it is redacted. The API's
 * summary says so (`jawafdehi:artifacts.pdf.withheld_pending_redaction`); a
 * flagged link left in a stale payload counts too.
 */
export function isWithheldPendingRedaction(data: Material | undefined): boolean {
  if (!data) return false;
  const summary = data["jawafdehi:artifacts"] as
    | { pdf?: { withheld_pending_redaction?: unknown; redacted?: unknown } }
    | undefined;
  if (summary?.pdf?.withheld_pending_redaction === true) return true;
  if (summary?.pdf?.redacted === true) return false;
  return mediaEntries(data).some(
    (e) => e["jawafdehi:withheld"] === WITHHELD_PENDING_REDACTION,
  );
}

function mediaEntries(data: Material): MediaLink[] {
  const media = data.associatedMedia;
  return Array.isArray(media) ? media : media ? [media as MediaLink] : [];
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
  // A link flagged as withheld pending redaction is never rendered, whatever
  // else the payload holds: the API already omits it, this is the site's guard.
  const entries = mediaEntries(data).filter(
    (e) => e["jawafdehi:withheld"] !== WITHHELD_PENDING_REDACTION,
  );

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
    const fileType = previewTypeOf(entry, href, role);
    // A file on the publisher's own server can't be loaded by the in-site
    // viewer (the proxy only fetches from our buckets), so it is linked to
    // directly rather than opening a viewer that can only show an error.
    const previewType = fileType && canPreviewDocument(href) ? fileType : undefined;
    const extension = extensionOf(href);
    const isExternal =
      role === "SOURCE_PAGE" ||
      role === "PERMALINK" ||
      (entry.encodingFormat || "").toLowerCase().includes("html");
    const label =
      fileType === "pdf"
        ? "PDF"
        : fileType === "markdown"
          ? "Text"
          : extension && extension.length <= 6
            ? `.${extension.toUpperCase()}`
            : ROLE_LABELS[role] || entry.name || ROLE_LABELS.RAW;
    return [{ href, label, extension: extension || null, isExternal, previewType }];
  });
}
