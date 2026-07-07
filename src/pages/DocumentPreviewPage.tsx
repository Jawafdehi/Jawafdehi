import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import {
  DocumentPreviewViewer,
  type PreviewDocument,
} from "@/components/DocumentPreviewDialog";
import { Button } from "@/components/ui/button";

export default function DocumentPreviewPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const document = useMemo<PreviewDocument | null>(() => {
    const title = searchParams.get("title") || t("documentPreview.defaultTitle");
    const type = searchParams.get("type");
    const url = searchParams.get("url");

    if (!url || (type !== "pdf" && type !== "markdown")) {
      return null;
    }

    return { title, type, url };
  }, [searchParams, t]);

  if (!document) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0b0c] px-4 text-white">
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
