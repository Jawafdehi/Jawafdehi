import { Community } from "@/components/donate/community";
import { DonationFaq } from "@/components/donate/faq";
import { DonateHero } from "@/components/donate/hero";
import { DonationJourney } from "@/components/donate/journey";
import { Seo } from "@/components/Seo";
import { SITE_URL } from "@/utils/seo";

const Donate = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Donate — Jawafdehi"
        description="Support Jawafdehi with a donation. Your gift funds hosting, document archiving, and verification that keep Nepal's corruption archive permanent and free for everyone."
        canonicalUrl={`${SITE_URL}/donate/`}
      />

      <section className="flex-1">
        {/* Payment-first: the hero carries the payment card itself, so the
            page opens on *how to give*. The journey below answers *why*. */}
        <DonateHero />
        <DonationJourney />
        <Community />
        <DonationFaq />
      </section>
    </div>
  );
};

export default Donate;
