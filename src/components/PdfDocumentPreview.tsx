import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PanelLeft } from "lucide-react";

import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type PdfPageSize = {
  height: number;
  width: number;
};

type PdfDocumentProxy = {
  numPages: number;
  getPage(pageNumber: number): Promise<{
    getViewport(options: { scale: number }): PdfPageSize;
  }>;
};

interface PdfDocumentPreviewProps {
  currentPage: number;
  getPageHeight: (pageNumber: number, width: number) => number;
  goToPage: (page: number) => void;
  pageCount: number;
  pageRefs: MutableRefObject<Record<number, HTMLDivElement | null>>;
  pdfError: boolean;
  pdfLoadIdRef: MutableRefObject<number>;
  previewUrl: string;
  renderedPageWidth: number;
  scrollContainerRef: RefObject<HTMLDivElement>;
  setPageCount: Dispatch<SetStateAction<number>>;
  setPageSizes: Dispatch<SetStateAction<Record<number, PdfPageSize>>>;
  setPdfError: Dispatch<SetStateAction<boolean>>;
  shouldRenderPage: (pageNumber: number) => boolean;
  shouldRenderThumbnail: (pageNumber: number) => boolean;
}

export function PdfDocumentPreview({
  currentPage,
  getPageHeight,
  goToPage,
  pageCount,
  pageRefs,
  pdfError,
  pdfLoadIdRef,
  previewUrl,
  renderedPageWidth,
  scrollContainerRef,
  setPageCount,
  setPageSizes,
  setPdfError,
  shouldRenderPage,
  shouldRenderThumbnail,
}: Readonly<PdfDocumentPreviewProps>) {
  const { t } = useTranslation();

  const handleLoadSuccess = (pdf: PdfDocumentProxy) => {
    setPdfError(false);
    setPageCount(pdf.numPages);
    const loadId = pdfLoadIdRef.current;

    (async () => {
      const sizes: Array<[number, PdfPageSize]> = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        if (pdfLoadIdRef.current !== loadId) return;

        try {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1 });
          sizes.push([pageNumber, { height: viewport.height, width: viewport.width }]);
        } catch {
          // Keep the default A4 fallback for pages whose dimensions fail to load.
        }
      }

      if (pdfLoadIdRef.current === loadId) {
        setPageSizes(Object.fromEntries(sizes));
      }
    })();
  };

  return (
    <>
      <aside className="hidden w-24 shrink-0 overflow-y-auto border-r border-white/10 bg-[#111214] px-3 py-4 md:block">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-white/70">
          <PanelLeft className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{t("documentPreview.thumbnails")}</span>
        </div>
        <Document file={previewUrl} loading={null} error={null}>
          {Array.from({ length: pageCount }, (_, index) => {
            const pageNumber = index + 1;

            return (
              <button
                key={`thumbnail-${previewUrl}-${pageNumber}`}
                type="button"
                className={cn(
                  "mb-3 block w-full rounded-md border bg-white p-1 text-left text-black transition",
                  currentPage === pageNumber
                    ? "border-blue-400 ring-2 ring-blue-400"
                    : "border-white/20 hover:border-white/70",
                )}
                onClick={() => goToPage(pageNumber)}
              >
                <span className="mb-1 block text-center text-xs font-semibold">{pageNumber}</span>
                {shouldRenderThumbnail(pageNumber) ? (
                  <Page pageNumber={pageNumber} width={64} renderAnnotationLayer={false} renderTextLayer={false} />
                ) : (
                  <div
                    className="flex w-16 items-center justify-center bg-slate-100 text-[10px] font-semibold text-slate-400"
                    style={{ height: getPageHeight(pageNumber, 64) }}
                  >
                    {pageNumber}
                  </div>
                )}
              </button>
            );
          })}
        </Document>
      </aside>

      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto px-4 py-6">
        <div className="flex min-h-full justify-center">
          <Document
            key={previewUrl}
            file={previewUrl}
            loading={
              <p className="text-sm text-white/70">
                {t("documentPreview.loading")}
              </p>
            }
            error={
              <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-4 text-sm text-white/70">
                {t("documentPreview.pdfError")}
              </div>
            }
            onLoadSuccess={handleLoadSuccess}
            onLoadError={() => setPdfError(true)}
            className="flex flex-col items-center gap-6"
          >
            {!pdfError &&
              Array.from({ length: pageCount }, (_, index) => {
                const pageNumber = index + 1;

                return (
                  <div
                    key={`${previewUrl}-${pageNumber}`}
                    className="overflow-hidden"
                    ref={(node) => {
                      pageRefs.current[pageNumber] = node;
                    }}
                  >
                    {shouldRenderPage(pageNumber) ? (
                      <Page
                        pageNumber={pageNumber}
                        width={renderedPageWidth}
                        className="overflow-hidden bg-white shadow-2xl ring-1 ring-black/60"
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center bg-white text-sm font-medium text-slate-300 shadow-2xl ring-1 ring-black/60"
                        style={{
                          height: getPageHeight(pageNumber, renderedPageWidth),
                          width: renderedPageWidth,
                        }}
                      >
                        {pageNumber}
                      </div>
                    )}
                  </div>
                );
              })}
          </Document>
        </div>
      </div>
    </>
  );
}
