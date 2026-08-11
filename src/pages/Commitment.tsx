import { Helmet } from "react-helmet-async";

import { CommitmentList } from "@/components/commitment/commitment";
import { CommitmentHero } from "@/components/commitment/hero";
import { CommitmentMission } from "@/components/commitment/mission";
import { OG_LOCALE_ENGLISH, OG_LOCALE_NEPALI, SITE_NAME, SOCIAL_IMAGE_URL } from "@/utils/seo";

const Commitment = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Our Commitment — Jawafdehi</title>
        <meta name="description" content="Jawafdehi's commitments to the Nepali public: permanent records, factual accuracy, open source technology, and free access forever." />
        <link rel="canonical" href="https://jawafdehi.org/commitment/" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/commitment/" />
        <meta property="og:title" content="Our Commitment — Jawafdehi" />
        <meta property="og:description" content="Jawafdehi's commitments to the Nepali public: permanent records, factual accuracy, open source technology, and free access forever." />
        <meta property="og:image" content={SOCIAL_IMAGE_URL} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content={OG_LOCALE_NEPALI} />
        <meta property="og:locale:alternate" content={OG_LOCALE_ENGLISH} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Commitment — Jawafdehi" />
        <meta name="twitter:description" content="Jawafdehi's commitments to the Nepali public: permanent records, factual accuracy, open source technology, and free access forever." />
        <meta name="twitter:image" content={SOCIAL_IMAGE_URL} />
      </Helmet>

      <main id="main-content" className="flex-1">
        <CommitmentHero />

        <CommitmentMission />

        <CommitmentList />
      </main>

    </div>
  );
};

export default Commitment;
