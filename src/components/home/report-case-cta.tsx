import { useTranslation } from "react-i18next";

import { ReportAllegationDialog } from "@/components/ReportAllegationDialog";

export function ReportCaseCta() {
  const { t } = useTranslation();

  return (
    <section className="relative isolate overflow-hidden border-b border-border bg-[linear-gradient(135deg,hsl(var(--primary-surface))_0%,hsl(var(--primary-surface))_34%,hsl(var(--accent))_100%)] py-16 dark:bg-[linear-gradient(135deg,hsl(215_70%_12%)_0%,hsl(220_38%_18%)_42%,hsl(354_66%_37%)_100%)] md:py-20">
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full bg-secondary/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_20%,hsl(var(--secondary)/0.24),transparent_34%),linear-gradient(135deg,hsl(var(--primary-surface)/0.3)_0%,transparent_48%,hsl(var(--accent)/0.2)_100%)]"
      />

      <div className="container mx-auto px-4 text-center">
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          <h2 className="text-3xl font-extrabold leading-tight tracking-normal text-white md:text-4xl">
            {t("reportCta.title")}
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/90 md:text-base">
            {t("reportCta.description")}
          </p>
          <ReportAllegationDialog />
        </div>
      </div>
    </section>
  );
}
