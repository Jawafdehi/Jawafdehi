type DocumentPreviewUrlInput = {
  title: string;
  type: "markdown" | "pdf";
  url: string;
};

export function getDocumentProxyUrl(url: string, download = false): string {
  if (!/^https?:\/\//i.test(url)) return url;

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
