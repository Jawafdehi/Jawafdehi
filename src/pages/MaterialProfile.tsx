import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ExternalLink, FileText } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { humanizeEntityType } from "@/utils/entity-helpers";
import { getMaterial, type Material, type MaterialBilingual } from "@/services/datalake-api";
import { API_BASE_URL } from "@/services/http";
import { ViewJsonButton } from "@/components/ViewJsonButton";
import { DocumentPreviewDialog, type PreviewDocument } from "@/components/DocumentPreviewDialog";

// ─── value helpers (a material is schema.org JSON-LD, same family as entities) ──

function bilingual(v: MaterialBilingual | string | undefined): { en: string; ne: string } {
  if (!v) return { en: "", ne: "" };
  if (typeof v === "string") return { en: v, ne: "" };
  return { en: v.en || "", ne: v.ne || "" };
}

function typeToken(t: Material["@type"], additional?: string): string | undefined {
  const parts: string[] = [];
  if (Array.isArray(t)) parts.push(...t);
  else if (t) parts.push(t);
  if (additional) parts.push(additional);
  return parts.length ? parts.join(",") : undefined;
}

// Last IRI segment, humanized — a fallback title when no name is present.
function iriLabel(iri: string | undefined): string {
  if (!iri) return "";
  const tail = iri.split("/").filter(Boolean).pop() || iri;
  return tail.replace(/[-_]/g, " ").trim() || tail;
}

// schema.org / jawafdehi key -> human label for the generic Details section.
const FIELD_LABELS: Record<string, string> = {
  datePublished: "Published",
  dateCreated: "Created",
  "jawafdehi:projectStage": "Project stage",
  "jawafdehi:executingAgency": "Executing agency",
  "jawafdehi:implementingAgency": "Implementing agency",
  "jawafdehi:totalCommitment": "Total commitment",
  "jawafdehi:financingInstrument": "Financing instrument",
  "jawafdehi:assistanceType": "Assistance type",
  "jawafdehi:sector": "Sector",
  "jawafdehi:publicationDate": "Publication date",
  "jawafdehi:agency": "Agency",
  "jawafdehi:documentType": "Document type",
};

function labelFor(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const bare = key.includes(":") ? key.split(":").pop()! : key;
  return bare
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

// Render a scalar/bilingual value as a string (objects/arrays handled elsewhere).
function scalar(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object" && ("en" in v! || "ne" in v!)) {
    const b = bilingual(v as MaterialBilingual);
    return b.en || b.ne || null;
  }
  return null;
}

// A stored value like jawafdehi:sourceUrl is a full http(s) URL — often a long,
// unbroken, percent-encoded path (…/%E0%A5%A6…pdf). Printed verbatim it overflows
// its grid cell and overlaps the neighbouring field, and reads as noise. Detect
// it so the Details grid can render it as a compact host link instead.
function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

// Short, human label for a URL: its host (sans leading `www.`). Falls back to the
// raw string if the URL can't be parsed, so we never show nothing.
function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Decoded URL for the hover tooltip — turns %E0%A5%A6… back into readable
// Devanagari. Falls back to the raw URL on a malformed escape sequence.
function decodedUrl(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

// Keys handled explicitly in the header/links/full-text/provenance, never in Details.
// The jawafdehi:visibility[Policy] pair is a caseworker-only annotation the API
// adds on authed reads; it is an editor concern (see MaterialVisibilityControl),
// not a public detail, so keep it out of the generic grid.
const HANDLED_KEYS = new Set([
  "@id", "@type", "@context", "additionalType", "name", "alternateName",
  "description", "text", "url", "sameAs", "identifier", "associatedMedia",
  "jawafdehi:visibility", "jawafdehi:visibilityPolicy",
]);

// A roled source link (mirrors the data-lake DocumentSource link roles).
const ROLE_LABELS: Record<string, string> = {
  RAW: "Download document",
  ALTERNATE: "Alternate format",
  SOURCE_PAGE: "Original source page",
  MARKDOWN: "Text transcript",
  PERMALINK: "Permalink",
};

interface MediaLink {
  contentUrl?: string;
  url?: string;
  encodingFormat?: string;
  "jawafdehi:linkRole"?: string;
  "jawafdehi:role"?: string;
  role?: string;
  name?: string;
}

// PDFs and markdown/text transcripts open in the shared document modal; source
// pages and other formats (doc/docx) stay as external links.
function previewTypeOf(m: MediaLink, href: string, role: string): PreviewDocument["type"] | undefined {
  const fmt = (m.encodingFormat || "").toLowerCase();
  const ext = (href.split("?")[0].split(".").pop() || "").toLowerCase();
  if (fmt.includes("pdf") || ext === "pdf") return "pdf";
  if (role === "MARKDOWN" || fmt.includes("markdown") || ext === "md" || ext === "markdown") return "markdown";
  return undefined;
}

type MaterialSourceLink = { href: string; label: string; previewType?: PreviewDocument["type"] };

function sourceLinks(data: Material | undefined): MaterialSourceLink[] {
  if (!data) return [];
  const media = data.associatedMedia;
  const arr: MediaLink[] = Array.isArray(media) ? media : media ? [media as MediaLink] : [];
  const links: MaterialSourceLink[] = [];
  for (const m of arr) {
    const href = m.contentUrl || m.url;
    if (!href) continue;
    const role = (m["jawafdehi:linkRole"] || m["jawafdehi:role"] || m.role || "").toUpperCase();
    const previewType = previewTypeOf(m, href, role);
    const label =
      previewType === "pdf"
        ? "View PDF"
        : previewType === "markdown"
          ? "View transcript"
          : ROLE_LABELS[role] || m.name || ROLE_LABELS.RAW;
    links.push({ href, label, previewType });
  }
  return links;
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function MaterialProfile() {
  const params = useParams();
  const tail = params["*"] || "";
  const { data, isLoading, isError } = useQuery({
    queryKey: ["datalake-material", tail],
    queryFn: () => getMaterial(tail),
    enabled: tail.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const name = data ? bilingual(data.name) : { en: "", ne: "" };
  const displayName = name.en || name.ne || iriLabel(data?.["@id"]) || tail.split("/").pop() || "Material";
  const typeLabel = humanizeEntityType(data ? typeToken(data["@type"], data.additionalType) : undefined);
  const description = data ? bilingual(data.description) : { en: "", ne: "" };
  const descText = description.en || description.ne;
  const fullText = data ? bilingual((data.text as MaterialBilingual | string | undefined)) : { en: "", ne: "" };
  const fullTextStr = fullText.en || fullText.ne;
  const links = sourceLinks(data);
  const [previewDocument, setPreviewDocument] = useState<PreviewDocument | null>(null);

  // Generic details: any presentable scalar field not handled elsewhere.
  const detailRows: Array<{ label: string; value: string }> = [];
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (HANDLED_KEYS.has(key)) continue;
      const s = scalar(value);
      if (s) detailRows.push({ label: labelFor(key), value: s });
    }
  }

  // schema.org JSON-LD for crawlers (parity with the retired R2 HTML landing page).
  const jsonLd = data
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: displayName,
        url: data["@id"],
        identifier: data.identifier ?? undefined,
        inLanguage: name.ne ? "ne" : "en",
        isAccessibleForFree: true,
        ...(descText ? { description: descText } : {}),
        ...(data.datePublished ? { datePublished: String(data.datePublished) } : {}),
        publisher: { "@type": "Organization", name: "Jawafdehi" },
      })
    : null;

  return (
    <main id="main-content" className="min-h-screen bg-background py-8 md:py-12">
      <Helmet>
        <title>{displayName} | Jawafdehi governance archive</title>
        <meta
          name="description"
          content={descText || `${displayName} — ${typeLabel} in the Jawafdehi governance archive.`}
        />
        {jsonLd ? <script type="application/ld+json">{jsonLd}</script> : null}
      </Helmet>

      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/search?type=material">
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              Back to search
            </Link>
          </Button>
          {tail ? (
            <ViewJsonButton
              data={data}
              title={`${displayName} — JSON-LD`}
              rawUrl={`${API_BASE_URL}/api/materials/${tail}`}
              disabled={!data}
            />
          ) : null}
        </div>

        {isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This material could not be found in the Jawafdehi governance archive.
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-6 h-32 w-full" />
          </div>
        ) : data ? (
          <article className="space-y-6">
            <header className="space-y-2">
              <Badge variant="outline" className="capitalize">{typeLabel}</Badge>
              <h1 className="text-3xl font-extrabold text-primary md:text-4xl">{displayName}</h1>
              {name.ne && name.ne !== displayName ? (
                <p className="text-lg text-muted-foreground">{name.ne}</p>
              ) : null}
            </header>

            {descText ? <p className="text-base leading-7 text-foreground">{descText}</p> : null}

            {/* Source documents + external links. */}
            {links.length > 0 || data.url ? (
              <div className="flex flex-wrap gap-2">
                {links.map((l) =>
                  l.previewType ? (
                    <Button
                      key={l.href}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewDocument({ title: displayName, type: l.previewType!, url: l.href })
                      }
                    >
                      <FileText className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      {l.label}
                    </Button>
                  ) : (
                    <Button asChild key={l.href} variant="outline" size="sm">
                      <a href={l.href} target="_blank" rel="noopener noreferrer">
                        {l.label} <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </Button>
                  ),
                )}
                {data.url && links.length === 0 ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={data.url} target="_blank" rel="noopener noreferrer">
                      Original source page <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : null}

            {/* Details. */}
            {detailRows.length > 0 || data.identifier ? (
              <dl className="grid gap-4 rounded-xl bg-card p-5 sm:grid-cols-2">
                {detailRows.map((r) => (
                  // min-w-0: a grid item defaults to min-width:auto, which lets a
                  // long unbroken value push past its column and overlap the next
                  // one; allow it to shrink so break-words can actually wrap.
                  <div key={r.label} className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{r.label}</dt>
                    <dd className="mt-1 text-sm text-foreground break-words">
                      {isHttpUrl(r.value) ? (
                        <a
                          href={r.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={decodedUrl(r.value)}
                          className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:no-underline"
                        >
                          {hostLabel(r.value)}
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        </a>
                      ) : (
                        r.value
                      )}
                    </dd>
                  </div>
                ))}
                {data.identifier ? (
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identifier</dt>
                    <dd className="mt-1 text-sm text-foreground break-words">{data.identifier}</dd>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Canonical ID</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-muted-foreground">{data["@id"]}</dd>
                </div>
              </dl>
            ) : null}

            {/* Full-text transcript (when present). */}
            {fullTextStr ? (
              <section className="rounded-xl bg-card p-5">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4" aria-hidden="true" /> Document text
                </h2>
                {/* break-words: transcripts carry dotted leaders (……………फरार) and
                    other long unbroken runs that whitespace-pre-wrap will not
                    break, overflowing the card on a narrow (mobile) viewport. */}
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{fullTextStr}</p>
              </section>
            ) : null}

            {/* Provenance. */}
            <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
              <p>
                <strong>Source:</strong> Jawafdehi governance archive — public
                government records on Nepal&apos;s governance and judiciary.
              </p>
            </div>
          </article>
        ) : null}
      </div>

      <DocumentPreviewDialog
        document={previewDocument}
        open={Boolean(previewDocument)}
        onOpenChange={(open) => {
          if (!open) setPreviewDocument(null);
        }}
      />
    </main>
  );
}
