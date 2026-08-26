import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { humanizeEntityType } from "@/utils/entity-helpers";
import {
  getMaterial,
  type Material,
  type MaterialBilingual,
} from "@/services/datalake-api";
import { API_BASE_URL } from "@/services/http";
import { ViewJsonButton } from "@/components/ViewJsonButton";
import {
  DocumentPreviewDialog,
  type PreviewDocument,
} from "@/components/DocumentPreviewDialog";
import { ShareButton } from "@/components/ShareButton";
import { seriesBySource } from "@/data/material-series";
import { getMaterialSourceLinks } from "@/lib/material-links";

// ─── value helpers (a material is schema.org JSON-LD, same family as entities) ──

function bilingual(v: MaterialBilingual | string | undefined): {
  en: string;
  ne: string;
} {
  if (!v) return { en: "", ne: "" };
  if (typeof v === "string") return { en: v, ne: "" };
  return { en: v.en || "", ne: v.ne || "" };
}

function typeToken(
  t: Material["@type"],
  additional?: string,
): string | undefined {
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
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return String(v);
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
  "@id",
  "@type",
  "@context",
  "additionalType",
  "name",
  "alternateName",
  "description",
  "text",
  "url",
  "sameAs",
  "identifier",
  "associatedMedia",
  "jawafdehi:visibility",
  "jawafdehi:visibilityPolicy",
]);

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
  const displayName =
    name.en ||
    name.ne ||
    iriLabel(data?.["@id"]) ||
    tail.split("/").pop() ||
    "Material";
  const typeLabel = humanizeEntityType(
    data ? typeToken(data["@type"], data.additionalType) : undefined,
  );
  const description = data ? bilingual(data.description) : { en: "", ne: "" };
  const descText = description.en || description.ne;
  const fullText = data
    ? bilingual(data.text as MaterialBilingual | string | undefined)
    : { en: "", ne: "" };
  const fullTextStr = fullText.en || fullText.ne;
  const links = getMaterialSourceLinks(data);
  const [previewDocument, setPreviewDocument] =
    useState<PreviewDocument | null>(null);
  const series = seriesBySource(tail.split("/")[0] || "");

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
        ...(data.datePublished
          ? { datePublished: String(data.datePublished) }
          : {}),
        publisher: { "@type": "Organization", name: "Jawafdehi" },
      })
    : null;

  return (
    <main
      id="main-content"
      className="min-h-screen bg-background py-8 md:py-12"
    >
      <Helmet>
        <title>{displayName} | Jawafdehi governance archive</title>
        <meta
          name="description"
          content={
            descText ||
            `${displayName} — ${typeLabel} in the Jawafdehi governance archive.`
          }
        />
        {jsonLd ? <script type="application/ld+json">{jsonLd}</script> : null}
      </Helmet>

      <div className="layout-container">
        <div className="mb-8 flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link
              to={series ? `/materials/?series=${series.slug}` : "/materials/"}
            >
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              {series ? `Back to ${series.name.en}` : "Back to materials"}
            </Link>
          </Button>
        </div>

        {isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This material could not be found in the Jawafdehi governance
              archive.
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-12 w-4/5" />
            <Skeleton className="h-80 w-full" />
          </div>
        ) : data ? (
          <article>
            <header>
              <h1 className="font-archive-hero-title max-w-4xl">
                {displayName}
              </h1>
              {name.ne && name.ne !== displayName ? (
                <p className="mt-3 text-lg text-muted-foreground">{name.ne}</p>
              ) : null}
            </header>

            <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] xl:gap-14">
              <section className="min-w-0">
                <Tabs defaultValue="summary">
                  <TabsList className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0">
                    <TabsTrigger
                      value="summary"
                      className="rounded-none border-b-2 border-transparent px-5 py-3 data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      Summary
                    </TabsTrigger>
                    {fullTextStr ? (
                      <TabsTrigger
                        value="text"
                        className="rounded-none border-b-2 border-transparent px-5 py-3 data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        Document text
                      </TabsTrigger>
                    ) : null}
                  </TabsList>

                  <TabsContent value="summary" className="mt-0">
                    <Card className="rounded-none border border-t-0 shadow-none">
                      <div className="p-5 md:p-8">
                        {descText ? (
                          <p className="mb-6 max-w-3xl text-base leading-7 text-foreground">
                            {descText}
                          </p>
                        ) : null}
                        <dl className="divide-y divide-border/70">
                          <div className="grid gap-1 py-3 md:grid-cols-[190px_minmax(0,1fr)] md:gap-4">
                            <dt className="font-semibold text-foreground underline decoration-dotted underline-offset-4">
                              Type
                            </dt>
                            <dd className="min-w-0 break-words text-foreground">
                              {typeLabel}
                            </dd>
                          </div>
                          {detailRows.map((row) => (
                            <div
                              key={row.label}
                              className="grid gap-1 py-3 md:grid-cols-[190px_minmax(0,1fr)] md:gap-4"
                            >
                              <dt className="font-semibold text-foreground underline decoration-dotted underline-offset-4">
                                {row.label}
                              </dt>
                              <dd className="min-w-0 break-words text-foreground">
                                {isHttpUrl(row.value) ? (
                                  <a
                                    href={row.value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={decodedUrl(row.value)}
                                    className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:no-underline"
                                  >
                                    {hostLabel(row.value)}
                                    <ExternalLink
                                      className="h-3.5 w-3.5 shrink-0"
                                      aria-hidden="true"
                                    />
                                  </a>
                                ) : (
                                  row.value
                                )}
                              </dd>
                            </div>
                          ))}
                          {data.identifier ? (
                            <div className="grid gap-1 py-3 md:grid-cols-[190px_minmax(0,1fr)] md:gap-4">
                              <dt className="font-semibold text-foreground underline decoration-dotted underline-offset-4">
                                Identifier
                              </dt>
                              <dd className="min-w-0 break-words text-foreground">
                                {data.identifier}
                              </dd>
                            </div>
                          ) : null}
                          <div className="grid gap-1 py-3 md:grid-cols-[190px_minmax(0,1fr)] md:gap-4">
                            <dt className="font-semibold text-foreground underline decoration-dotted underline-offset-4">
                              Canonical ID
                            </dt>
                            <dd className="min-w-0 break-all font-mono text-xs text-muted-foreground">
                              {data["@id"]}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </Card>
                  </TabsContent>

                  {fullTextStr ? (
                    <TabsContent value="text" className="mt-0">
                      <Card className="rounded-none border border-t-0 shadow-none">
                        <p className="whitespace-pre-wrap break-words p-5 text-sm leading-7 text-foreground md:p-8">
                          {fullTextStr}
                        </p>
                      </Card>
                    </TabsContent>
                  ) : null}
                </Tabs>
              </section>

              <aside className="space-y-8 lg:sticky lg:top-24">
                <section aria-labelledby="material-downloads-heading">
                  <h2
                    id="material-downloads-heading"
                    className="text-lg font-semibold text-foreground"
                  >
                    Downloads
                  </h2>
                  <Separator className="mt-3" />

                  <div className="mt-4 inline-grid gap-3">
                    {links.map((link) =>
                      link.previewType ? (
                        <Button
                          key={link.href}
                          type="button"
                          variant="outline"
                          className="h-auto min-h-11 justify-start gap-3 px-4 py-2.5 text-left"
                          onClick={() =>
                            setPreviewDocument({
                              title: displayName,
                              type: link.previewType!,
                              url: link.href,
                            })
                          }
                        >
                          <FileText
                            className="h-4 w-4 shrink-0 text-accent"
                            aria-hidden="true"
                          />
                          {link.label}
                        </Button>
                      ) : (
                        <Button
                          asChild
                          key={link.href}
                          variant="outline"
                          className="h-auto min-h-11 justify-start gap-3 px-4 py-2.5 text-left"
                        >
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download
                              className="h-4 w-4 shrink-0 text-accent"
                              aria-hidden="true"
                            />
                            {link.label}
                          </a>
                        </Button>
                      ),
                    )}
                    {data.url ? (
                      <Button
                        asChild
                        variant="outline"
                        className="h-auto min-h-11 justify-start gap-3 px-4 py-2.5 text-left"
                      >
                        <a
                          href={data.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          Original source
                        </a>
                      </Button>
                    ) : null}
                  </div>

                  {links.length === 0 && !data.url ? (
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      No downloadable files are attached to this record.
                    </p>
                  ) : null}
                </section>

                <section aria-labelledby="material-actions-heading">
                  <h2
                    id="material-actions-heading"
                    className="text-lg font-semibold text-foreground"
                  >
                    Actions
                  </h2>
                  <Separator className="mt-3" />

                  <div className="mt-4 inline-grid gap-2">
                    {tail ? (
                      <ViewJsonButton
                        data={data}
                        title={`${displayName} — JSON-LD`}
                        rawUrl={`${API_BASE_URL}/api/materials/${tail}`}
                        variant="outline"
                        className="h-11 justify-start gap-3 px-4"
                      />
                    ) : null}
                    <ShareButton
                      url={data["@id"]}
                      title={displayName}
                      description={descText}
                      variant="ghost"
                      size="default"
                      showLabel
                      className="h-11 justify-start gap-3 px-4 [&_span]:!mt-0 [&_span]:!inline"
                    />
                  </div>
                </section>
              </aside>
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
