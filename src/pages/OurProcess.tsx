import { DataSources } from "@/components/data-sources";
import { ReportCaseCta } from "@/components/home/report-case-cta";
import { OurProcessHero } from "@/components/ourprocess/hero";
import { ProcessTimeline } from "@/components/ourprocess/timeline";
import { Seo } from "@/components/Seo";
import { SITE_URL } from "@/utils/seo";

const OurProcess = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Seo
      title="Our Process — Jawafdehi"
      description="How Jawafdehi discovers, researches, compiles, and publishes CIAA corruption cases — from raw government documents to a permanent public archive."
      canonicalUrl={`${SITE_URL}/our-process/`}
    />

    <main id="main-content" className="flex-1">
      <OurProcessHero />

      <ProcessTimeline />

      <DataSources />

      <ReportCaseCta />
    </main>
  </div>
);

export default OurProcess;
