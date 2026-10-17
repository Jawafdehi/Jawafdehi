import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import {
  DocumentPreviewViewer,
  type PreviewDocument,
} from "@/components/DocumentPreviewDialog";
import { Button } from "@/components/ui/button";
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
      <main className="flex min-h-screen items-center justify-center bg-code-surface px-4 text-white">
        <div className="max-w-md rounded-xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl">
          <h1 className="text-lg font-semibold">{t("documentPreview.unavailableTitle")}</h1>
          <p className="mt-2 text-sm text-white/65">
            {t("documentPreview.unavailableDescription")}
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("documentPreview.backToJawafdehi")}
            </Link>
          </Button>
        </div>
      </main>
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
