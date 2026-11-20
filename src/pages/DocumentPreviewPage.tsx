import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "@/components/icons";

import {
  DocumentPreviewViewer,
  type PreviewDocument,
} from "@/components/DocumentPreviewDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { TranscriptReader } from "@/components/materials/TranscriptReader";

/**
 * A count from the query string, or undefined.
 *
 * These are read from a URL anyone can edit, and the reader shows them as a
 * claim about how much of the document is readable. A junk value is dropped
 * rather than coerced — `Number("12 pages")` is NaN, and rendering that would
 * publish "NaN of 446 pages readable".
 */
function positiveParam(raw: string | null): number | undefined {
  if (raw === null || !/^\d+$/.test(raw)) return undefined;
  return Number.parseInt(raw, 10);
}

export default function DocumentPreviewPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const title = searchParams.get("title") || t("documentPreview.defaultTitle");

  // A transcript is not a file, so it has no `url` to proxy — it is addressed
  // by the material's tail and read from `…/content?type=page`. Handled before
  // `PreviewDocument` is built rather than widened into it, so the file viewer
  // keeps its `url`-always invariant.
  const transcriptTail =
    searchParams.get("type") === "transcript" ? searchParams.get("tail") : null;

  const document = useMemo<PreviewDocument | null>(() => {
    const type = searchParams.get("type");
    const url = searchParams.get("url");

    if (!url || (type !== "pdf" && type !== "markdown")) {
      return null;
    }

    return { title, type, url };
  }, [searchParams, title]);

  if (transcriptTail) {
    return (
      <main className="h-screen overflow-hidden">
        <TranscriptReader
          tail={transcriptTail}
          title={title}
          dataset={searchParams.get("dataset") ?? undefined}
          pages={positiveParam(searchParams.get("pages"))}
          pagesRead={positiveParam(searchParams.get("pagesRead"))}
          fullPage
          onClose={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/");
            }
          }}
        />
      </main>
    );
  }

  if (!document) {
    return (
      // The viewer itself is chromeless (a full-screen reader with its own
      // close bar), but with no document there is nothing to read: this state
      // is an ordinary page, with the site's header and footer as the way on.
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main id="main-content" className="layout-container flex-1">
        <EmptyState
          kind="couldNotLoad"
          fullHeight
          headingLevel="h1"
          title={t("documentPreview.unavailableTitle")}
          description={t("documentPreview.unavailableDescription")}
          actions={
            <Link
              to="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-muted px-5 text-[15px] text-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("documentPreview.backToJawafdehi")}
            </Link>
          }
        />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <main className="h-screen overflow-hidden">
      <DocumentPreviewViewer
        document={document}
        fullPage
        onClose={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate("/");
          }
        }}
      />
    </main>
  );
}
