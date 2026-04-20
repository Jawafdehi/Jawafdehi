export type GuestTopicId =
  | "procurement_corruption"
  | "big_corruption_cases"
  | "ciaa_process"
  | "cases_registered_2081_2082_bs";

export interface GuestTopicKnowledge {
  id: GuestTopicId;
  keywordsEn: string[];
  keywordsNe: string[];
  followupsEn: string[];
  followupsNe: string[];
  introEn?: string;
  introNe?: string;
}

export const GUEST_TOPIC_KNOWLEDGE: GuestTopicKnowledge[] = [
  {
    id: "procurement_corruption",
    keywordsEn: [
      "procurement",
      "tender",
      "bidding",
      "bid",
      "contract",
      "contractor",
      "subsidy",
      "grant",
      "bank guarantee",
      "fake document",
      "inflated price",
      "irregular payment",
    ],
    keywordsNe: [
      "खरिद",
      "सार्वजनिक खरिद",
      "ठेक्का",
      "टेन्डर",
      "बोलपत्र",
      "बैंक ग्यारेन्टी",
      "नक्कली कागजात",
      "अनुदान",
      "भुक्तानी",
      "मिलेमतो",
      "लागत अनुमान",
    ],
    followupsEn: [
      "Show me the strongest procurement-related cases",
      "Which sources support the first procurement case?",
      "What patterns repeat across these procurement cases?",
    ],
    followupsNe: [
      "सबैभन्दा सम्बन्धित खरिदसम्बन्धी मुद्दा देखाऊ",
      "पहिलो मुद्दालाई कुन स्रोतहरूले समर्थन गर्छन्?",
      "यी खरिदसम्बन्धी मुद्दाहरूमा दोहोरिने ढाँचा के छन्?",
    ],
  },
  {
    id: "big_corruption_cases",
    keywordsEn: [
      "big corruption",
      "major corruption",
      "largest corruption",
      "high profile corruption",
      "big cases",
      "major cases",
      "famous corruption",
    ],
    keywordsNe: [
      "ठूलो भ्रष्टाचार",
      "ठूला भ्रष्टाचार मुद्दा",
      "चर्चित भ्रष्टाचार",
      "ठूला मुद्दा",
      "मुख्य भ्रष्टाचार मुद्दा",
    ],
    followupsEn: [
      "Open the biggest case",
      "Why is the top case significant?",
      "Show me another large corruption case",
    ],
    followupsNe: [
      "सबैभन्दा ठूलो मुद्दा खोल",
      "पहिलो मुद्दा किन महत्वपूर्ण छ?",
      "अर्को ठूलो भ्रष्टाचार मुद्दा देखाऊ",
    ],
  },
  {
    id: "ciaa_process",
    keywordsEn: [
      "ciaa",
      "how ciaa handles",
      "how does ciaa work",
      "ciaa process",
      "investigation process",
      "anti corruption process",
    ],
    keywordsNe: [
      "अख्तियार",
      "अख्तियारले कसरी",
      "अख्तियार प्रक्रिया",
      "भ्रष्टाचार अनुसन्धान प्रक्रिया",
      "छानबिन प्रक्रिया",
    ],
    followupsEn: [
      "Show me CIAA-related public cases",
      "Which case mentions a CIAA investigation?",
      "Show me a case where the investigation stalled",
    ],
    followupsNe: [
      "अख्तियारसँग सम्बन्धित सार्वजनिक मुद्दा देखाऊ",
      "कुन मुद्दामा अख्तियारको अनुसन्धान उल्लेख छ?",
      "अनुसन्धान रोकिएको मुद्दा देखाऊ",
    ],
    introEn:
      "Based on this public archive, CIAA-related case records usually show a pattern of complaint, investigation or charge filing, and then court or public-source updates.",
    introNe:
      "यस सार्वजनिक अभिलेखका आधारमा अख्तियारसम्बन्धी मुद्दाहरूमा सामान्यतया उजुरी, अनुसन्धान वा अभियोग दर्ता, त्यसपछि अदालत वा सार्वजनिक स्रोतबाट आउने अद्यावधिकहरू देखिन्छन्।",
  },
  {
    id: "cases_registered_2081_2082_bs",
    keywordsEn: [
      "how many corruption cases were registered in the year 2081/82 bs",
      "how many corruption cases were registered in 2081/82 bs",
      "2081/82 bs cases",
      "2081/82 corruption cases",
      "registered in 2081/82 bs",
      "year 2081/82 bs",
    ],
    keywordsNe: [
      "२०८१/८२ बीएसमा कति भ्रष्टाचार मुद्दा दर्ता भएका थिए",
      "२०८१/८२ सालमा दर्ता भएका भ्रष्टाचार मुद्दा",
      "२०८१/८२ सालका भ्रष्टाचार मुद्दा",
      "२०८१/८२ बि.सं.",
    ],
    followupsEn: [],
    followupsNe: [],
  },
];
