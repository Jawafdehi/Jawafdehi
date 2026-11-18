import LegalPage from "@/pages/legal/LegalPage";

const Privacy = () => (
  <LegalPage
    id="privacy"
    name="Privacy"
    path="/privacy/"
    copy={{
      en: {
        title: "Jawafdehi Initiative Privacy Policy",
        description:
          "Jawafdehi's privacy policy — how we handle data, cookies, analytics, and user information on Nepal's open corruption accountability platform.",
        lastUpdated: "Last updated: November 18, 2026",
        switchLabel: "यो नीति नेपालीमा पढ्नुहोस्",
      },
      ne: {
        title: "जवाफदेही इनिशिएटिभको गोपनीयता नीति",
        description:
          "जवाफदेहीको गोपनीयता नीति — नेपालको खुला भ्रष्टाचार जवाफदेही प्लेटफर्ममा हामी तथ्याङ्क, कुकी, एनालिटिक्स र प्रयोगकर्ताको सूचना कसरी सम्हाल्छौं।",
        lastUpdated: "अन्तिम अद्यावधिक: १८ नोभेम्बर २०२६",
        switchLabel: "Read this policy in English",
      },
    }}
  />
);

export default Privacy;
