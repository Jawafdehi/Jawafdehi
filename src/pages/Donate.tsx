import { Community } from "@/components/donate/community";
// import { DonationDescription } from "@/components/donate/description";
import { DonationFaq } from "@/components/donate/faq";
import { DonateHero } from "@/components/donate/hero";
import { DonationInfo } from "@/components/donate/info";
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
        <DonateHero />
        {/* <DonationDescription /> */}
        <DonationInfo />
        <Community />
        <DonationFaq />
      </section>
    </div>
  );
};

export default Donate;
