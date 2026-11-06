// "Know of a corruption case?": the call to report, on the home page and on
// /our-process. The same navy and the same diamond shader as the home hero, so
// the home page closes on the surface it opened with.
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FilePlus2 } from "lucide-react";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { Button } from "@/components/ui/button";

export function ReportCaseCta() {
  const { t } = useTranslation();

  return (
    <section className="relative isolate overflow-hidden bg-primary-surface py-20 md:py-28">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <ShaderBackdrop design="diamond" />
        {/* Navy pooled behind the copy so it reads over any frame. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_70%_at_50%_50%,hsl(var(--primary-surface))_35%,transparent_100%)]" />
      </div>

      <div className="layout-container text-center">
        <div className="mx-auto flex max-w-2xl flex-col items-center">
          <h2 className="font-home-section-title text-primary-foreground">{t("reportCta.title")}</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-primary-foreground/75">{t("reportCta.description")}</p>
          <Button variant="accent" size="lg" asChild className="mt-8">
            <Link to="/report">
              <FilePlus2 aria-hidden="true" />
              {t("report.trigger")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
