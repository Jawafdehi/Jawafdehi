import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Code2, Flag, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FeedbackForm } from "@/components/FeedbackForm";

/**
 * "Use this data." Accountability data is only as useful as it is reusable, so
 * the page points journalists and researchers straight at the public read-only
 * API — and, right beside it, invites readers to flag anything that looks wrong
 * (the report-an-error card that used to live in the methodology footer).
 */
export function UseThisData() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.useData.heading", "Use this data")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.useData.description",
          "This archive is meant to be built on. Journalists, researchers and watchdogs can pull the records directly.",
        )}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Query the API */}
        <div className="flex flex-col rounded-xl border border-border bg-muted/20 p-5">
          <Code2 className="h-6 w-6 text-accent" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold text-foreground">
            {t("dataQuality.useData.api.title", "Query the API")}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t(
              "dataQuality.useData.api.desc",
              "A public, read-only API serves cases, entities, court records and materials in JSON.",
            )}
          </p>
          <a
            href="https://api.jawafdehi.org"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-accent hover:underline"
          >
            {t("dataQuality.useData.api.button", "Open the API")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        {/* Spot something wrong? — relocated report-an-error card */}
        <div className="flex flex-col rounded-xl border border-border bg-muted/20 p-5">
          <Flag className="h-6 w-6 text-accent" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold text-foreground">
            {t("dataQuality.methodology.report.heading", "Spot something wrong?")}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t(
              "dataQuality.methodology.report.body",
              "This archive is only as accurate as its sources. If a record looks off, tell us. Corrections are reviewed by a person.",
            )}
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="mt-auto self-start">
                {t("dataQuality.methodology.report.button", "Report a data error")}
              </Button>
            </DialogTrigger>
            <DialogContent className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-[600px] sm:gap-4 sm:rounded-lg sm:p-6">
              <div className="flex min-h-0 flex-1 flex-col">
                <DialogHeader className="shrink-0 px-4 pt-6 pb-4 text-left sm:px-0 sm:pt-0">
                  <DialogTitle>
                    {t("dataQuality.methodology.report.dialogTitle", "Report a data error")}
                  </DialogTitle>
                  <DialogDescription>
                    {t(
                      "dataQuality.methodology.report.dialogDesc",
                      "Tell us which record looks wrong and what it should say. Attach a source if you have one.",
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-0 sm:pb-0">
                  <div className="py-4">
                    <FeedbackForm
                      initialFeedbackType="content"
                      initialSubject={t(
                        "dataQuality.methodology.report.subject",
                        "Data quality report",
                      )}
                      initialRelatedPage="Data Quality (/data-quality)"
                      showFeedbackTypeSelector={false}
                      allowAttachment={true}
                      onSuccess={() => setOpen(false)}
                    />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
}
