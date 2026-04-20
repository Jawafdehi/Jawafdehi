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
    
      "What patterns repeat across these procurement cases?",
    ],
    followupsNe: [
   
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
     
    ],
    followupsNe: [
    
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
     
      "Show me a case where the investigation stalled",
    ],
    followupsNe: [
     
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
