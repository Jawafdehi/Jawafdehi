import LegalPage from "@/pages/legal/LegalPage";

const TermsOfService = () => (
  <LegalPage
    id="terms"
    name="Terms"
    path="/terms/"
    copy={{
      en: {
        title: "Jawafdehi Initiative Terms of Service",
        description:
          "Jawafdehi's terms of service — guidelines for using Nepal's open corruption accountability platform and public case archive.",
        lastUpdated: "Last updated: November 18, 2026",
        switchLabel: "यी सर्तहरू नेपालीमा पढ्नुहोस्",
      },
      ne: {
        title: "जवाफदेही इनिशिएटिभका सेवाका सर्तहरू",
        description:
          "जवाफदेहीका सेवाका सर्तहरू — नेपालको खुला भ्रष्टाचार जवाफदेही प्लेटफर्म र सार्वजनिक मुद्दा अभिलेख प्रयोग गर्ने नियम।",
        lastUpdated: "अन्तिम अद्यावधिक: १८ नोभेम्बर २०२६",
        switchLabel: "Read these terms in English",
      },
    }}
  />
);

export default TermsOfService;
