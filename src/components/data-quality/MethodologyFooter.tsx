import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

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

const SOURCE_KEYS = ["ngm", "ciaa", "submissions"] as const;

/**
 * The trust-building close: plain-language account of where the data comes
 * from, how it's kept current, and a quiet invitation to flag errors. No
 * gradient hero — just prose a general reader can follow.
 */
export function MethodologyFooter() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[1.75rem]">
        {t("dataQuality.methodology.heading", "Where this comes from")}
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-[1.4fr_1fr] md:gap-12">
        <div className="max-w-2xl space-y-4 text-[0.95rem] leading-7 text-foreground/70">
          <p>
            {t(
              "dataQuality.methodology.intro",
              "Everything on this page comes from public records: court filings, CIAA reports, and leads people send us. It updates as new records are published. Where a figure isn't yet available from a verified source, we leave it out rather than estimate it.",
            )}
          </p>
          <ul className="space-y-2">
            {SOURCE_KEYS.map((key) => (
              <li key={key} className="flex gap-2.5">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-foreground">
                    {t(`dataQuality.methodology.sources.${key}.name`)}
                  </strong>
                  {": "}
                  {t(`dataQuality.methodology.sources.${key}.desc`)}
                </span>
              </li>
            ))}
          </ul>
          <p>
            <Link
              to="/our-process"
              className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
            >
              {t("dataQuality.methodology.processLink", "Read how we research and verify each case")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-5">
          <h3 className="text-sm font-semibold text-foreground">
            {t("dataQuality.methodology.report.heading", "Spot something wrong?")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t(
              "dataQuality.methodology.report.body",
              "This archive is only as accurate as its sources. If a record looks off, tell us. Corrections are reviewed by a person.",
            )}
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="mt-4">
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
