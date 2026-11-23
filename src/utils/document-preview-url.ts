type DocumentPreviewUrlInput = {
  title: string;
  type: "markdown" | "pdf";
  url: string;
};

/**
 * Hosts the Worker's `/document-preview` proxy will fetch from: our own
 * buckets. The Worker imports this set, so the site and the proxy can never
 * disagree about which files the in-site viewer can open.
 *
 * A file anywhere else (a publisher's own server such as giwmscdnone.gov.np,
 * courtlistener, sec.gov) gets a 403 from the proxy, and the browser can't
 * fetch it directly either (no CORS, and the CSP's connect-src). Such files
 * are linked to directly instead of opening a viewer that can only fail.
 */
export const DOCUMENT_PREVIEW_ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  "ngm-store.jawafdehi.org",
  "s3.jawafdehi.org",
]);

function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** Whether the in-site viewer can load `url` (through the proxy, or same-origin). */
export function canPreviewDocument(url: string): boolean {
  if (!isAbsoluteHttpUrl(url)) return true;

  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      DOCUMENT_PREVIEW_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

export function getDocumentProxyUrl(url: string, download = false): string {
  // Relative URLs are same-origin already. A host the proxy refuses would only
  // turn into a 403, so the viewer's open/download links go to the original.
  if (!isAbsoluteHttpUrl(url) || !canPreviewDocument(url)) return url;

  const params = new URLSearchParams({ url });
  if (download) params.set("download", "1");

  return `/document-preview?${params.toString()}`;
}

export function getDocumentViewerUrl(document: DocumentPreviewUrlInput): string {
  const params = new URLSearchParams({
    title: document.title,
    type: document.type,
    url: document.url,
  });

  return `/document-viewer?${params.toString()}`;
}
