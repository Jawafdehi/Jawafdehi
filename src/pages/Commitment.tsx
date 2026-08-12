import { CommitmentList } from "@/components/commitment/commitment";
import { CommitmentHero } from "@/components/commitment/hero";
import { CommitmentMission } from "@/components/commitment/mission";
import { Seo } from "@/components/Seo";
import { SITE_URL } from "@/utils/seo";

const Commitment = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Our Commitment — Jawafdehi"
        description="Jawafdehi's commitments to the Nepali public: permanent records, factual accuracy, open source technology, and free access forever."
        canonicalUrl={`${SITE_URL}/commitment/`}
      />

      <main id="main-content" className="flex-1">
        <CommitmentHero />

        <CommitmentMission />

        <CommitmentList />
      </main>

    </div>
  );
};

export default Commitment;
