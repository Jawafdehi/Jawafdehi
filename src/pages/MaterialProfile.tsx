import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { useEffect, useState } from "react";
import { useParams, useLocation, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Download,
  ExternalLink,
  FileText,
} from "@/components/icons";

import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { humanizeEntityType } from "@/utils/entity-helpers";
import {
  getMaterial,
  type Material,
  type MaterialBilingual,
} from "@/services/datalake-api";
import { DocumentContentPanel } from "@/components/materials/DocumentContentPanel";
import { restoreScroll, takeListScroll } from "@/lib/contents-scroll";
import { TranscriptReader } from "@/components/materials/TranscriptReader";
import { TableFocusView } from "@/components/materials/TableFocusView";
import { FigureFocusView } from "@/components/materials/FigureFocusView";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_BASE_URL } from "@/services/http";
import { ViewJsonButton } from "@/components/ViewJsonButton";
import {
  DocumentPreviewDialog,
  type PreviewDocument,
} from "@/components/DocumentPreviewDialog";
import { ShareButton } from "@/components/ShareButton";
import { seriesBySource, seriesSearchPath } from "@/data/material-series";
import { getMaterialSourceLinks } from "@/lib/material-links";
import {
  materialBilingual as bilingual,
  materialCanonicalUrl,
  materialDescriptionText,
  materialDisplayName,
  materialJsonLd,
  materialMetaDescription,
  materialMetaTitle,
  materialRobots,
  materialTypeLabel,
} from "@/lib/material-meta";

// ─── value helpers (a material is schema.org JSON-LD, same family as entities) ──
//
// The head this page renders lives in `@/lib/material-meta`, not here: worker.ts
// injects the same head at the edge for crawlers, which never run this component.

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
// isAccessibleForFree is schema.org's paywall flag. The API sets it to true on
// every material in the archive, so as a Details row it renders the constant
// "Is Accessible For Free — true" and tells a reader nothing. It stays in the
// JSON-LD below (and in the API payload) where crawlers actually read it.
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
  "isAccessibleForFree",
  "jawafdehi:visibility",
  "jawafdehi:visibilityPolicy",
]);

// ─── page ───────────────────────────────────────────────────────────────────

// The content switcher: grey pills, the active one white.
const TAB =
  "rounded-full px-4 py-2 text-[15px] text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm";
// The aside's downloads and actions: one column of grey pills.
const ASIDE_ACTION =
  "h-auto min-h-11 w-full justify-start gap-3 rounded-full bg-muted px-5 py-2.5 text-left text-[15px] font-normal text-primary hover:bg-primary/[0.08] hover:text-primary active:scale-[0.98]";

export default function MaterialProfile() {
  const { t } = useTranslation();
  const params = useParams();
  const tail = params["*"] || "";
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["datalake-material", tail],
    queryFn: () => getMaterial(tail),
    enabled: tail.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // What is inside the document, if we have read it. This rides on the material
  // payload itself, so deciding whether to offer the tab costs no request —
  // and the key is ABSENT rather than zeroed for the ~346k materials we have
  // not parsed, which is why presence is the test.
  const contentSummary = data?.["jawafdehi:content"];

  // `?table=<key>` addresses one table directly — the `page` candidate in
  // ContentLayoutLab. Harmless in production: nothing links to it there,
  // because the dev-only lab is the only thing that builds the link.
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const focusedTable = searchParams.get("table");
  const focusedFigure = searchParams.get("figure");
  // Either focus hides the listing and drops the aside, so the rest of the
  // page asks this rather than one of them.
  const focused = focusedTable ?? focusedFigure;

  // ScrollToTop fires on every `search` change, so opening a table and coming
  // back both jump to the top of the document. The position was recorded on
  // the click that left; put the reader back on it once the listing has laid
  // out far enough to allow it.
  useEffect(() => {
    if (focused) return;
    const y = takeListScroll(location.pathname);
    if (y === null) return;
    return restoreScroll(y);
  }, [focused, location.pathname]);

  // A deep link has to survive a COLD load, not just a click. Defaulting to
  // "summary" meant pasting `?table=…` into a fresh tab opened the Summary tab
  // and showed no table at all — which would have made the citable-URL variant
  // look like it worked, while the only case that matters, someone opening a
  // link you sent them, silently did nothing.
  const [tab, setTab] = useState(
    searchParams.get("table") || searchParams.get("figure") ? "content" : "summary",
  );

  const name = data ? bilingual(data.name) : { en: "", ne: "" };
  const displayName = materialDisplayName(data, tail);
  const typeLabel = materialTypeLabel(data);
  const description = data ? bilingual(data.description) : { en: "", ne: "" };
  const descText = description.en || description.ne;
  const fullText = data
    ? bilingual(data.text as MaterialBilingual | string | undefined)
    : { en: "", ne: "" };
  const fullTextStr = fullText.en || fullText.ne;
  const links = getMaterialSourceLinks(data);
  const [previewDocument, setPreviewDocument] =
    useState<PreviewDocument | null>(null);
  // The transcript opens in its own reader rather than inside a tab panel: it
  // is the document's text, which a reader wants full-width and continuous.
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  // The document's own JSON-LD carries the kind, so this page never has to
  // guess which of a source's shelves it belongs to.
  const series = seriesBySource(
    tail.split("/")[0] || "",
    typeof data?.["jawafdehi:datasetBucket"] === "string"
      ? data["jawafdehi:datasetBucket"]
      : undefined,
  );

  // Generic details: any presentable scalar field not handled elsewhere.
  const detailRows: Array<{ label: string; value: string }> = [];
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (HANDLED_KEYS.has(key)) continue;
      const s = scalar(value);
      if (s) detailRows.push({ label: labelFor(key), value: s });
    }
  }

  // The head, built by the same module the edge uses — see @/lib/material-meta.
  const metaDescription = materialMetaDescription(data, displayName, typeLabel);
  const robots = materialRobots(data);
  // schema.org JSON-LD for crawlers (parity with the retired R2 HTML landing page).
  //
  // materialDescriptionText, not the raw `descText` the body renders: the worker
  // passes the stripped form, and passing a different one here would make the
  // structured data differ edge vs hydrated — the exact drift this shared module
  // exists to prevent.
  const jsonLd = data
    ? materialJsonLd(data, displayName, materialDescriptionText(data))
    : null;

  const summaryPanel = data ? (
    <div className={fullTextStr || contentSummary ? "pt-8" : undefined}>
      <div>
        {descText ? (
          <p className="mb-8 max-w-3xl text-lg leading-8 text-primary/85">
            {descText}
          </p>
        ) : null}
        <dl className="divide-y divide-border/70 border-y border-border/70">
          <div className="grid gap-1 py-4 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-6">
            <dt className="text-[15px] text-muted-foreground">
              Type
            </dt>
            <dd className="min-w-0 break-words text-base text-primary">
              {typeLabel}
            </dd>
          </div>
          {detailRows.map((row) => (
            <div
              key={row.label}
              className="grid gap-1 py-4 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-6"
            >
              <dt className="text-[15px] text-muted-foreground">
                {row.label}
              </dt>
              <dd className="min-w-0 break-words text-base text-primary">
                {isHttpUrl(row.value) ? (
                  <a
                    href={row.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={decodedUrl(row.value)}
                    className="inline-flex items-center gap-1 text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:decoration-primary"
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
            <div className="grid gap-1 py-4 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-6">
              <dt className="text-[15px] text-muted-foreground">
                Identifier
              </dt>
              <dd className="min-w-0 break-words text-base text-primary">
                {data.identifier}
              </dd>
            </div>
          ) : null}
          <div className="grid gap-1 py-4 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-6">
            <dt className="text-[15px] text-muted-foreground">
              Canonical ID
            </dt>
            <dd className="min-w-0 break-all font-mono text-xs text-muted-foreground">
              {data["@id"]}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  ) : null;

  return (
    <main
      id="main-content"
      className="min-h-screen bg-background pb-20 pt-8 md:pt-12"
    >
      <Helmet>
        <title>{materialMetaTitle(displayName)}</title>
        <meta name="description" content={metaDescription} />
        {/*
          Canonical and Open Graph were both missing here, so even after hydration
          a material page declared no canonical URL and unfurled as the site
          banner. worker.ts injects the same tags for clients that never run JS.
        */}
        <link rel="canonical" href={materialCanonicalUrl(tail)} />
        {robots ? <meta name="robots" content={robots} /> : null}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={materialCanonicalUrl(tail)} />
        <meta property="og:title" content={materialMetaTitle(displayName)} />
        <meta property="og:description" content={metaDescription} />
        <meta name="twitter:title" content={materialMetaTitle(displayName)} />
        <meta name="twitter:description" content={metaDescription} />
        {jsonLd ? <script type="application/ld+json">{jsonLd}</script> : null}
      </Helmet>

      <div className="layout-container">
        <PageBreadcrumb
          items={[
            { label: t("nav.home"), to: "/" },
            { label: t("materialProfile.breadcrumb", "Documents"), to: "/materials/" },
            ...(series ? [{ label: series.name.en, to: seriesSearchPath(series.slug) }] : []),
          ]}
        />

        {isError ? (
          // Only a 404 says the record is missing; anything else is our fault.
          (error as { statusCode?: number } | null)?.statusCode === 404 ? (
            <EmptyState
              kind="notFound"
              fullHeight
              headingLevel="h1"
              title={t("materialProfile.notFoundTitle", "Document not found")}
              description={t("materialProfile.notFoundLine", "This material could not be found in the Jawafdehi governance archive.")}
            />
          ) : (
            <EmptyState
              kind="couldNotLoad"
              fullHeight
              headingLevel="h1"
              title={t("materialProfile.errorTitle", "This document didn't load")}
              description={t("materialProfile.errorLine", "Something went wrong on our side. Please try again in a moment.")}
            />
          )
        ) : isLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-14 w-4/5 rounded-xl" />
            <Skeleton className="h-80 w-full rounded-[24px]" />
          </div>
        ) : data ? (
          <article>
            <header className="mt-8 md:mt-10">
              <span className="inline-flex h-8 items-center rounded-full bg-muted px-3.5 text-sm text-primary">
                {typeLabel}
              </span>
              <h1 className="font-home-display mt-5 max-w-4xl text-balance break-words text-4xl text-primary sm:text-5xl lg:text-[3.5rem] [:root[lang=en]_&]:leading-[1.06]">
                {displayName}
              </h1>
              {name.ne && name.ne !== displayName ? (
                <p className="mt-3 text-xl text-muted-foreground">{name.ne}</p>
              ) : null}
            </header>

            {/* One focused table takes the whole width: these are 14-column
                government tables, and 17rem of sticky aside is the difference
                between four columns visible and six. The aside is DROPPED here
                rather than scrolled under — a table wide enough to reach it
                would otherwise collide with "Read the transcript". */}
            <div
              className={cn(
                "mt-8 grid items-start gap-10 xl:gap-14",
                !focused && "lg:grid-cols-[minmax(0,1fr)_17rem]",
              )}
            >
              <section className="min-w-0">
                {/* One view needs no switcher, and a lone tab panel with no
                    tab list would be announced as an unnamed panel. */}
                {fullTextStr || contentSummary ? (
                <Tabs value={tab} onValueChange={setTab} id="material-content-tab">
                  {/* A switcher only when there is something to switch to. */}
                  {fullTextStr || contentSummary ? (
                  <TabsList className="h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-full bg-muted p-1 [scrollbar-width:none]">
                    <TabsTrigger
                      value="summary"
                      className={TAB}
                    >
                      Summary
                    </TabsTrigger>
                    {fullTextStr ? (
                      <TabsTrigger
                        value="text"
                        className={TAB}
                      >
                        Document text
                      </TabsTrigger>
                    ) : null}
                    {contentSummary ? (
                      <TabsTrigger
                        value="content"
                        className={TAB}
                      >
                        Contents
                      </TabsTrigger>
                    ) : null}
                  </TabsList>
                  ) : null}

                  <TabsContent value="summary" className="mt-0">
                    {summaryPanel}
                  </TabsContent>

                  {fullTextStr ? (
                    <TabsContent value="text" className="mt-0">
                      <div className="mt-6 rounded-[24px] border border-border/70 bg-surface">
                        <p className="whitespace-pre-wrap break-words p-6 text-base leading-8 text-primary/85 md:p-8">
                          {fullTextStr}
                        </p>
                      </div>
                    </TabsContent>
                  ) : null}

                  {contentSummary ? (
                    <TabsContent value="content" className="mt-0">
                      <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70 bg-surface">
                        {focusedTable ? (
                          <TableFocusView
                            tail={tail}
                            tableKey={focusedTable}
                            backTo={location.pathname}
                          />
                        ) : null}
                        {!focusedTable && focusedFigure ? (
                          <FigureFocusView
                            tail={tail}
                            figureKey={focusedFigure}
                            backTo={location.pathname}
                          />
                        ) : null}
                        {/* The panel stays MOUNTED behind the focused view
                            rather than being swapped out for it. Unmounting
                            threw away everything the reader had set up — which
                            sections were open, what they had typed into the
                            filter, which table was expanded — so "Back to
                            contents" dropped them at the top of a closed list
                            and made them find their place again. Hidden, not
                            removed, so all of that state is still there when
                            they come back. */}
                        <div hidden={Boolean(focused)}>
                          <DocumentContentPanel
                            tail={tail}
                            summary={contentSummary}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  ) : null}
                </Tabs>
                ) : (
                  summaryPanel
                )}
              </section>

              {focused ? null : (
              <aside className="space-y-8 lg:sticky lg:top-28">
                <section aria-labelledby="material-downloads-heading">
                  <h2 id="material-downloads-heading" className="text-[15px] text-muted-foreground">
                    Downloads
                  </h2>

                  {/* `grid`, not `inline-grid`: an inline grid sizes itself to
                      its widest child, so these buttons were as wide as the
                      longest label while the transcript button below was
                      `w-full`. Every action in this list is now one column of
                      the aside, so they match whatever the labels say. */}
                  <div className="mt-3 grid gap-2">
                    {links.map((link) =>
                    link.previewType ? (
                        <Button
                          key={link.href}
                          type="button"
                          variant="ghost"
                          className={ASIDE_ACTION}
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
                    ) : link.isExternal ? (
                      <Button
                        asChild
                        key={link.href}
                        variant="ghost"
                        className={ASIDE_ACTION}
                      >
                        <a href={link.href} target="_blank" rel="noopener noreferrer">
                          <ExternalLink
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          {link.label}
                        </a>
                      </Button>
                    ) : (
                        <Button
                          asChild
                          key={link.href}
                          variant="ghost"
                          className={ASIDE_ACTION}
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
                        variant="ghost"
                        className={ASIDE_ACTION}
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

                    {/* Inside the grid with the other downloads, and carrying
                        their exact classes — it is the same kind of action
                        (open this document and read it), and it used to be the
                        one button in the aside with a different width. */}
                    {contentSummary && contentSummary.pages_read > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className={ASIDE_ACTION}
                        onClick={() => setTranscriptOpen(true)}
                      >
                        <FileText
                          className="h-4 w-4 shrink-0 text-accent"
                          aria-hidden="true"
                        />
                        Read the transcript
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
                  <h2 id="material-actions-heading" className="text-[15px] text-muted-foreground">
                    Actions
                  </h2>

                  <div className="mt-3 grid gap-2">
                    {tail ? (
                      <ViewJsonButton
                        data={data}
                        title={`${displayName} — JSON-LD`}
                        rawUrl={`${API_BASE_URL}/api/materials/${tail}`}
                        variant="ghost"
                        className={ASIDE_ACTION}
                      />
                    ) : null}
                    <ShareButton
                      url={data["@id"]}
                      title={displayName}
                      description={descText}
                      variant="ghost"
                      size="default"
                      showLabel
                      className={cn(ASIDE_ACTION, "[&_span]:!mt-0 [&_span]:!inline")}
                    />
                  </div>
                </section>
              </aside>
              )}
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

      {contentSummary ? (
        <Dialog open={transcriptOpen} onOpenChange={setTranscriptOpen}>
          <DialogContent
            overlayClassName="bg-black/85"
            className="h-[94vh] w-[min(98vw,1280px)] max-w-none overflow-hidden border-white/10 bg-code-surface p-0 shadow-2xl sm:rounded-xl [&>button:last-child]:hidden"
          >
            <DialogTitle className="sr-only">{displayName}</DialogTitle>
            <DialogDescription className="sr-only">
              The transcript of this document, page by page.
            </DialogDescription>
            <TranscriptReader
              tail={tail}
              title={displayName}
              dataset={contentSummary.provenance?.dataset}
              pages={contentSummary.pages}
              pagesRead={contentSummary.pages_read}
              onClose={() => setTranscriptOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </main>
  );
}
