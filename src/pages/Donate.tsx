import { Helmet } from "react-helmet-async";

import { Community } from "@/components/donate/community";
// import { DonationDescription } from "@/components/donate/description";
import { DonationFaq } from "@/components/donate/faq";
import { DonateHero } from "@/components/donate/hero";
import { DonationInfo } from "@/components/donate/info";
import { SITE_NAME } from "@/utils/seo";

const Donate = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Donate — Jawafdehi</title>
        <meta name="description" content="Support Jawafdehi with a donation. Your gift funds hosting, document archiving, and verification that keep Nepal's corruption archive permanent and free for everyone." />
        <link rel="canonical" href="https://jawafdehi.org/donate" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/donate" />
        <meta property="og:title" content="Donate — Jawafdehi" />
        <meta property="og:description" content="Support Jawafdehi with a donation. Your gift funds hosting, document archiving, and verification that keep Nepal's corruption archive permanent and free for everyone." />
        <meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Donate — Jawafdehi" />
        <meta name="twitter:description" content="Support Jawafdehi with a donation. Your gift funds hosting, document archiving, and verification that keep Nepal's corruption archive permanent and free for everyone." />
        <meta name="twitter:image" content="https://jawafdehi.org/assets/social-preview.png" />
      </Helmet>

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
