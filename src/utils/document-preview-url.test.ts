// SPDX-License-Identifier: Hippocratic-3.0
import { describe, expect, it } from "vitest";

import { canPreviewDocument, getDocumentProxyUrl } from "./document-preview-url";

// A real PPMO annual report: its only PDF lives on the publisher's CDN, which
// the /document-preview proxy refuses (403), so the in-site viewer could only
// ever show "this PDF preview could not be loaded".
const PUBLISHER_PDF =
  "https://giwmscdnone.gov.np/media/pdf_upload/%E0%A4%B5%E0%A4%BE%E0%A4%B0%E0%A5%8D%E0%A4%B7%E0%A4%BF%E0%A4%95_aokavxp.pdf";
const OUR_PDF = "https://s3.jawafdehi.org/case_uploads/report.pdf";
const NGM_PDF = "https://ngm-store.jawafdehi.org/uploads/ciaa/press-releases/files/1235.pdf";

describe("canPreviewDocument", () => {
  it("accepts files on our own buckets over https", () => {
    expect(canPreviewDocument(OUR_PDF)).toBe(true);
    expect(canPreviewDocument(NGM_PDF)).toBe(true);
    expect(canPreviewDocument("https://S3.Jawafdehi.org/x.pdf")).toBe(true);
  });

  it("accepts same-origin (relative) files", () => {
    expect(canPreviewDocument("/documents/1/report.pdf")).toBe(true);
  });

  it("refuses files on any other host, which the proxy would 403", () => {
    expect(canPreviewDocument(PUBLISHER_PDF)).toBe(false);
    expect(canPreviewDocument("https://storage.courtlistener.com/recap/x.pdf")).toBe(false);
    expect(canPreviewDocument("https://www.sec.gov/litigation/x.pdf")).toBe(false);
    // Look-alike hosts and plain http are refused like the proxy refuses them.
    expect(canPreviewDocument("https://s3.jawafdehi.org.evil.example/x.pdf")).toBe(false);
    expect(canPreviewDocument("http://s3.jawafdehi.org/x.pdf")).toBe(false);
  });
});

describe("getDocumentProxyUrl", () => {
  it("routes our own files through the proxy", () => {
    expect(getDocumentProxyUrl(OUR_PDF)).toBe(
      `/document-preview?url=${encodeURIComponent(OUR_PDF)}`,
    );
    expect(getDocumentProxyUrl(OUR_PDF, true)).toBe(
      `/document-preview?url=${encodeURIComponent(OUR_PDF)}&download=1`,
    );
  });

  it("links a publisher-hosted file directly instead of to a proxy that 403s", () => {
    expect(getDocumentProxyUrl(PUBLISHER_PDF)).toBe(PUBLISHER_PDF);
    expect(getDocumentProxyUrl(PUBLISHER_PDF, true)).toBe(PUBLISHER_PDF);
  });
});
