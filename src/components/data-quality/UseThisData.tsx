import { useTranslation } from "react-i18next";
import { Code2, ArrowRight } from "lucide-react";

/**
 * "Use this data." Accountability data is only as useful as it is reusable, so
 * the page points journalists and researchers straight at the public read-only
 * API.
 */
export function UseThisData() {
  const { t } = useTranslation();

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

      <div className="mt-6 flex max-w-md flex-col rounded-xl border border-border bg-muted/20 p-5">
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
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          {t("dataQuality.useData.api.button", "Open the API")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
