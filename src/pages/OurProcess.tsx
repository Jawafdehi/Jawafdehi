import { Helmet } from "react-helmet-async";

import { DataSources } from "@/components/data-sources";
import { ReportCaseCta } from "@/components/home/report-case-cta";
import { OurProcessHero } from "@/components/ourprocess/hero";
import { ProcessTimeline } from "@/components/ourprocess/timeline";

const OurProcess = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Helmet>
      <title>Our Process — Jawafdehi</title>
      <meta name="description" content="How Jawafdehi discovers, researches, compiles, and publishes CIAA corruption cases — from raw government documents to a permanent public archive." />
      <link rel="canonical" href="https://jawafdehi.org/our-process" />
      <meta property="og:site_name" content="Jawafdehi Nepal" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://jawafdehi.org/our-process" />
      <meta property="og:title" content="Our Process — Jawafdehi" />
      <meta property="og:description" content="How Jawafdehi discovers, researches, compiles, and publishes CIAA corruption cases — from raw government documents to a permanent public archive." />
      <meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Our Process — Jawafdehi" />
      <meta name="twitter:description" content="How Jawafdehi discovers, researches, compiles, and publishes CIAA corruption cases — from raw government documents to a permanent public archive." />
      <meta name="twitter:image" content="https://jawafdehi.org/assets/social-preview.png" />
    </Helmet>

    <main id="main-content" className="flex-1">
      <OurProcessHero />

      <ProcessTimeline />

      <DataSources />

      <ReportCaseCta />
    </main>
  </div>
);

export default OurProcess;
