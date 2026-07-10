import { Helmet } from "react-helmet-async";

import { CommitmentList } from "@/components/commitment/commitment";
import { CommitmentHero } from "@/components/commitment/hero";
import { CommitmentMission } from "@/components/commitment/mission";

const Commitment = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Our Commitment — Jawafdehi</title>
        <meta name="description" content="Jawafdehi's commitments to the Nepali public: permanent records, factual accuracy, open source technology, and free access forever." />
        <link rel="canonical" href="https://jawafdehi.org/commitment" />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/commitment" />
        <meta property="og:title" content="Our Commitment — Jawafdehi" />
        <meta property="og:description" content="Jawafdehi's commitments to the Nepali public: permanent records, factual accuracy, open source technology, and free access forever." />
        <meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Commitment — Jawafdehi" />
        <meta name="twitter:description" content="Jawafdehi's commitments to the Nepali public: permanent records, factual accuracy, open source technology, and free access forever." />
        <meta name="twitter:image" content="https://jawafdehi.org/assets/social-preview.png" />
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
