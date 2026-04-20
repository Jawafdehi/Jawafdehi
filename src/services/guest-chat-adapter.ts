import { GUEST_TOPIC_KNOWLEDGE, type GuestTopicId } from "@/data/guest-knowledge";
import { searchEntities } from "@/services/api";
import { getCaseById, getCases, getDocumentSourceById } from "@/services/jds-api";
import type { Case, CaseDetail, DocumentSource } from "@/types/jds";
import type {
  GuestAskResponse,
  GuestCaseChatCitation,
  GuestCaseChatResponse,
  GuestCaseResultItem,
  GuestEntityMatch,
} from "@/types/guest-chat";

const MAX_CASE_PAGES = 5;
const DEFAULT_FOLLOWUPS_EN = [
  "Open the most relevant case",
  "What are the key allegations in the first case?",
  "Which public sources are attached to that case?",
];
const DEFAULT_FOLLOWUPS_NE = [
  "सबैभन्दा सम्बन्धित मुद्दा खोल",
  "पहिलो मुद्दाका मुख्य आरोप के हुन्?",
  "पहिलो मुद्दासँग कुन सार्वजनिक स्रोतहरू जोडिएका छन्?",
];
const CIAA_TRACKER_2081_2082_TOTAL_CASES = 135;

export interface GuestCaseSourceEntry {
  sourceId: number;
  source: DocumentSource | null;
  evidenceDescription?: string;
}

type GuestLanguage = "en" | "ne";

interface TopicDetectionResult {
  topicId: GuestTopicId;
  score: number;
}

type ProcurementQuestionIntent =
  | "overview"
  | "patterns"
  | "examples"
  | "where"
  | "definition";

function stripHtml(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[“”"'`]/g, "").replace(/\s+/g, " ").trim();
}

function getGuestLanguage(language?: string): GuestLanguage {
  return language?.toLowerCase().startsWith("ne") ? "ne" : "en";
}

function getDefaultFollowups(language: GuestLanguage): string[] {
  return language === "ne" ? DEFAULT_FOLLOWUPS_NE : DEFAULT_FOLLOWUPS_EN;
}

function getCaseSummary(caseItem: Case): string {
  return (
    caseItem.short_description?.trim() ||
    caseItem.key_allegations[0] ||
    stripHtml(caseItem.description)
  );
}

function getCaseSearchText(caseItem: Case): string {
  return normalize(
    [
      caseItem.title,
      caseItem.short_description,
      stripHtml(caseItem.description),
      caseItem.key_allegations.join(" "),
      caseItem.tags.join(" "),
      caseItem.entities.map((entity) => `${entity.display_name || ""} ${entity.notes || ""}`).join(" "),
      caseItem.timeline
        .map((entry) => `${entry.title} ${entry.description}`)
        .join(" "),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getRelevantCiaaTimelineEntries(caseItem: Case) {
  return caseItem.timeline.filter((entry) => {
    const text = normalize(`${entry.title} ${entry.description}`);
    return (
      text.includes("ciaa") ||
      text.includes("अख्तियार") ||
      text.includes("complaint") ||
      text.includes("ujuri") ||
      text.includes("उजुरी") ||
      text.includes("investigation") ||
      text.includes("probe") ||
      text.includes("अनुसन्धान") ||
      text.includes("charge") ||
      text.includes("charge sheet") ||
      text.includes("accusation") ||
      text.includes("अभियोग") ||
      text.includes("आरोपपत्र") ||
      text.includes("special court") ||
      text.includes("विशेष अदालत")
    );
  });
}

function extractCiaaAction(entry: Case["timeline"][number], language: GuestLanguage): string | null {
  const text = normalize(`${entry.title} ${entry.description}`);

  if (
    text.includes("charge sheet") ||
    text.includes("आरोपपत्र") ||
    text.includes("अभियोग")
  ) {
    return language === "ne"
      ? "अख्तियारले आरोपपत्र दर्ता गर्‍यो"
      : "CIAA filed a charge sheet";
  }

  if (text.includes("special court") || text.includes("विशेष अदालत")) {
    return language === "ne"
      ? "अख्तियारले मुद्दा विशेष अदालतमा पुर्‍यायो"
      : "CIAA took the case to Special Court";
  }

  if (
    text.includes("investigation") ||
    text.includes("probe") ||
    text.includes("अनुसन्धान") ||
    text.includes("छानबिन")
  ) {
    return language === "ne"
      ? "अख्तियारले छानबिन गर्‍यो"
      : "CIAA investigated the case";
  }

  if (text.includes("complaint") || text.includes("ujuri") || text.includes("उजुरी")) {
    return language === "ne"
      ? "अख्तियारमा उजुरी पर्‍यो"
      : "a complaint was filed with CIAA";
  }

  if (text.includes("stalled") || text.includes("delay") || text.includes("रोकिएको") || text.includes("ढिलो")) {
    return language === "ne"
      ? "अख्तियारसँग जोडिएको प्रक्रिया ढिलो भयो"
      : "the CIAA-linked process was delayed";
  }

  return null;
}

function formatCiaaActionWithDate(entry: Case["timeline"][number], language: GuestLanguage): string | null {
  const action = extractCiaaAction(entry, language);
  if (!action) {
    return null;
  }

  return entry.date ? `${entry.date}: ${action}` : action;
}

function getRelevantCiaaDescriptionSnippet(caseItem: Case): string {
  const descriptionSentences = stripHtml(caseItem.description)
    .split(/(?<=[.!?।])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const ciaaSentences = descriptionSentences.filter((sentence) => {
    const text = normalize(sentence);
    return (
      text.includes("ciaa") ||
      text.includes("अख्तियार") ||
      text.includes("commission for investigation of abuse of authority") ||
      text.includes("commission for the investigation of abuse of authority") ||
      text.includes("charge sheet") ||
      text.includes("special court") ||
      text.includes("आरोपपत्र") ||
      text.includes("अभियोग") ||
      text.includes("formal investigation")
    );
  });

  const candidates = [
    caseItem.short_description,
    caseItem.key_allegations.find((item) => {
      const text = normalize(item);
      return (
        text.includes("ciaa") ||
        text.includes("अख्तियार") ||
        text.includes("charge") ||
        text.includes("charge sheet") ||
        text.includes("special court") ||
        text.includes("आरोपपत्र") ||
        text.includes("अभियोग")
      );
    }),
    ciaaSentences.slice(0, 2).join(" "),
  ]
    .map((item) => stripHtml(item))
    .filter(Boolean);

  return candidates[0] || "";
}

function extractSearchPhrase(query: string): string {
  const trimmed = query.trim();
  const match = trimmed.match(/(?:related to|about|for|show me)\s+(.+?)(?:\?|$)/i);
  return (match?.[1] || trimmed).replace(/^["']|["']$/g, "").trim();
}

function dedupeCaseResults(results: GuestCaseResultItem[]): GuestCaseResultItem[] {
  const deduped = new Map<number, GuestCaseResultItem>();

  for (const result of results) {
    const existing = deduped.get(result.id);
    if (!existing || result.matchedEntityNames.length > existing.matchedEntityNames.length) {
      deduped.set(result.id, result);
    }
  }

  return Array.from(deduped.values());
}

function buildCaseResult(
  caseItem: Case,
  matchReason: string,
  exampleDescription?: string,
  matchedEntityNames: string[] = [],
  matchedEntityIds: number[] = []
): GuestCaseResultItem {
  return {
    id: caseItem.id,
    title: caseItem.title,
    state: caseItem.state,
    case_type: caseItem.case_type,
    tags: caseItem.tags,
    matched_entity_names: matchedEntityNames,
    caseItem,
    matchReason,
    exampleDescription,
    matchedEntityIds,
    matchedEntityNames,
  };
}

function formatCurrency(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  return `NPR ${value.toLocaleString()}`;
}

export async function getAllPublicCases(): Promise<Case[]> {
  const allCases: Case[] = [];
  let page = 1;

  while (page <= MAX_CASE_PAGES) {
    const response = await getCases({ page });
    allCases.push(...response.results);

    if (!response.next) {
      break;
    }

    page += 1;
  }

  return allCases;
}

function detectTopic(query: string): TopicDetectionResult | null {
  const normalizedQuery = normalize(query);

  const scoredTopics = GUEST_TOPIC_KNOWLEDGE.map((topic) => {
    if (topic.id === "procurement_corruption") {
      const exactProcurementTerms = [
        "procurement",
        "public procurement",
        "procurement-related",
        "खरिद",
        "सार्वजनिक खरिद",
        "खरिदसम्बन्धी",
      ];

      const score = exactProcurementTerms.reduce((total, keyword) => {
        return normalizedQuery.includes(normalize(keyword)) ? total + 1 : total;
      }, 0);

      return { topicId: topic.id, score };
    }

    const allKeywords = [...topic.keywordsEn, ...topic.keywordsNe];
    const score = allKeywords.reduce((total, keyword) => {
      return normalizedQuery.includes(normalize(keyword)) ? total + 1 : total;
    }, 0);

    return { topicId: topic.id, score };
  }).filter((entry) => entry.score > 0);

  if (scoredTopics.length === 0) {
    return null;
  }

  return scoredTopics.sort((left, right) => right.score - left.score)[0];
}

function detectProcurementQuestionIntent(query: string): ProcurementQuestionIntent {
  const normalizedQuery = normalize(query);

  if (
    normalizedQuery.includes("pattern") ||
    normalizedQuery.includes("repeat") ||
    normalizedQuery.includes("common") ||
    normalizedQuery.includes("ढाँचा") ||
    normalizedQuery.includes("दोहोर") ||
    normalizedQuery.includes("सामान्य")
  ) {
    return "patterns";
  }

  if (
    normalizedQuery.includes("show me") ||
    normalizedQuery.includes("examples") ||
    normalizedQuery.includes("cases") ||
    normalizedQuery.includes("which cases") ||
    normalizedQuery.includes("उदाहरण") ||
    normalizedQuery.includes("मुद्दा") ||
    normalizedQuery.includes("देखाऊ")
  ) {
    return "examples";
  }

  if (
    normalizedQuery.includes("province") ||
    normalizedQuery.includes("provincial") ||
    normalizedQuery.includes("local level") ||
    normalizedQuery.includes("federal") ||
    normalizedQuery.includes("where") ||
    normalizedQuery.includes("कहाँ") ||
    normalizedQuery.includes("प्रदेश") ||
    normalizedQuery.includes("स्थानीय तह") ||
    normalizedQuery.includes("संघीय")
  ) {
    return "where";
  }

  if (
    normalizedQuery.includes("what is procurement") ||
    normalizedQuery.includes("what procurement is") ||
    normalizedQuery.includes("define procurement") ||
    normalizedQuery.includes("procurement means") ||
    normalizedQuery.includes("खरिद भनेको") ||
    normalizedQuery.includes("खरिद के हो")
  ) {
    return "definition";
  }

  return "overview";
}

function detectPatterns(caseItems: Case[], patternTerms: Array<{ key: string; labelEn: string; labelNe: string; terms: string[] }>) {
  return patternTerms
    .map((pattern) => {
      const count = caseItems.reduce((total, caseItem) => {
        const haystack = getCaseSearchText(caseItem);
        return pattern.terms.some((term) => haystack.includes(normalize(term))) ? total + 1 : total;
      }, 0);

      return { ...pattern, count };
    })
    .filter((pattern) => pattern.count > 0)
    .sort((left, right) => right.count - left.count);
}

function scoreCaseForTopic(caseItem: Case, topicId: GuestTopicId): number {
  const searchText = getCaseSearchText(caseItem);

  if (topicId === "procurement_corruption") {
    const strictProcurementTerms = [
      "procurement",
      "tender",
      "bid",
      "contract",
      "bank guarantee",
      "खरिद",
      "ठेक्का",
      "टेन्डर",
      "बोलपत्र",
      "बैंक ग्यारेन्टी",
    ];

    const supportiveProcurementTerms = [
      "subsidy",
      "grant",
      "fake document",
      "inflated",
      "irregular payment",
      "selection",
      "eligibility",
      "specification",
      "milamato",
      "अनुदान",
      "नक्कली कागजात",
      "भुक्तानी",
      "मिलेमतो",
      "छनौट",
      "लागत अनुमान",
      "स्पेसिफिकेशन",
    ];

    const strictMatches = strictProcurementTerms.reduce((total, term) => {
      if (!searchText.includes(normalize(term))) {
        return total;
      }

      if (normalize(caseItem.title).includes(normalize(term))) {
        return total + 5;
      }

      if (caseItem.tags.some((tag) => normalize(tag).includes(normalize(term)))) {
        return total + 4;
      }

      return total + 3;
    }, 0);

    if (strictMatches === 0) {
      return 0;
    }

    const supportiveMatches = supportiveProcurementTerms.reduce((total, term) => {
      if (!searchText.includes(normalize(term))) {
        return total;
      }

      return total + 1;
    }, 0);

    return strictMatches + supportiveMatches;
  }

  if (topicId === "ciaa_process") {
    const ciaaTerms = ["ciaa", "commission for the investigation of abuse of authority", "अख्तियार"];
    const baseScore = ciaaTerms.reduce((total, term) => {
      return searchText.includes(normalize(term)) ? total + 3 : total;
    }, 0);

    return (
      baseScore +
      caseItem.timeline.filter((entry) =>
        normalize(`${entry.title} ${entry.description}`).includes("ciaa") ||
        normalize(`${entry.title} ${entry.description}`).includes("अख्तियार")
      ).length * 2
    );
  }

  if (topicId === "big_corruption_cases") {
    const bigoScore =
      caseItem.bigo && caseItem.bigo > 0 ? Math.min(12, Math.log10(caseItem.bigo + 1) * 3) : 0;
    const evidenceScore = Math.min(5, caseItem.evidence.length);
    const allegationScore = Math.min(5, caseItem.key_allegations.length);
    const seriousTagScore = caseItem.tags.reduce((total, tag) => {
      const normalizedTag = normalize(tag);
      if (
        normalizedTag.includes("political corruption") ||
        normalizedTag.includes("embezzlement") ||
        normalizedTag.includes("ciaa")
      ) {
        return total + 2;
      }
      return total;
    }, 0);

    return bigoScore + evidenceScore + allegationScore + seriousTagScore;
  }

  return 0;
}

function getTopTopicCases(publicCases: Case[], topicId: GuestTopicId): Array<{ caseItem: Case; score: number }> {
  return publicCases
    .map((caseItem) => ({
      caseItem,
      score: scoreCaseForTopic(caseItem, topicId),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
}

function summarizeCiaaHandling(caseItem: Case, language: GuestLanguage): string {
  const relevantEntries = getRelevantCiaaTimelineEntries(caseItem);
  const actions = relevantEntries
    .map((entry) => ({
      key: formatCiaaActionWithDate(entry, language),
      date: entry.date,
      action: extractCiaaAction(entry, language),
    }))
    .filter(
      (item, index, array): item is { key: string; date: string; action: string } =>
        Boolean(item.key && item.date && item.action) &&
        array.findIndex((candidate) => candidate.key === item.key) === index
    );

  if (actions.length >= 2) {
    return language === "ne"
      ? `यस मुद्दामा ${actions[0].date} मा ${actions[0].action}। त्यसपछि ${actions[1].date} मा ${actions[1].action}।`
      : `In this case, on ${actions[0].date}, ${actions[0].action}. Then on ${actions[1].date}, ${actions[1].action}.`;
  }

  if (actions.length === 1) {
    return language === "ne"
      ? `यस मुद्दामा ${actions[0].date} मा ${actions[0].action}।`
      : `In this case, on ${actions[0].date}, ${actions[0].action}.`;
  }

  const descriptionSnippet = getRelevantCiaaDescriptionSnippet(caseItem);
  if (descriptionSnippet) {
    return language === "ne"
      ? `यहाँ मुद्दाको सार्वजनिक विवरणमा यस्तो उल्लेख छ: ${descriptionSnippet}`
      : `Here, the public case description says: ${descriptionSnippet}`;
  }

  const timelineText = normalize(
    caseItem.timeline.map((entry) => `${entry.title} ${entry.description}`).join(" ")
  );
  const descriptionText = getCaseSearchText(caseItem);

  const mentionsComplaint =
    timelineText.includes("complaint") ||
    timelineText.includes("ujuri") ||
    timelineText.includes("उजुरी");
  const mentionsInvestigation =
    timelineText.includes("investigation") ||
    timelineText.includes("probe") ||
    timelineText.includes("अनुसन्धान") ||
    descriptionText.includes("ciaa investigated");
  const mentionsCharge =
    timelineText.includes("charge") ||
    timelineText.includes("charge sheet") ||
    timelineText.includes("accusation") ||
    timelineText.includes("अभियोग") ||
    timelineText.includes("आरोपपत्र") ||
    descriptionText.includes("special court");
  const mentionsStalled =
    timelineText.includes("stalled") ||
    timelineText.includes("delay") ||
    timelineText.includes("political pressure") ||
    timelineText.includes("रोकिएको") ||
    timelineText.includes("ढिलो");

  if (language === "ne") {
    if (mentionsComplaint && mentionsInvestigation && mentionsCharge && mentionsStalled) {
      return "यहाँ अभिलेखले देखाउँछ कि पहिले उजुरी वा आरोप उठ्यो, त्यसपछि अख्तियारले छानबिन गर्‍यो, मुद्दा अदालतसम्म पुग्यो, र प्रक्रिया ढिलो वा विवादित पनि बन्यो।";
    }

    if (mentionsComplaint && mentionsInvestigation && mentionsCharge) {
      return "यहाँ अभिलेखले देखाउँछ कि पहिले उजुरी वा आरोप उठ्यो, त्यसपछि अख्तियारले छानबिन गर्‍यो, र पछि मुद्दा अदालतसम्म पुग्यो।";
    }

    if (mentionsComplaint && mentionsInvestigation) {
      return "यहाँ अभिलेखले देखाउँछ कि पहिले उजुरी वा आरोप उठ्यो, त्यसपछि अख्तियारले छानबिन अघि बढायो।";
    }

    if (mentionsInvestigation && mentionsCharge) {
      return "यहाँ अभिलेखले देखाउँछ कि अख्तियारले छानबिन गर्‍यो र त्यसपछि मुद्दा अदालतसम्म पुग्यो।";
    }

    if (mentionsStalled) {
      return "यहाँ अभिलेखले यो प्रक्रिया सहज नभएको, ढिलो भएको, वा बीचमै अड्किएको संकेत गर्छ।";
    }

    return "यहाँ अभिलेखले अख्तियारको भूमिका मुख्यतः उजुरी वा आरोपपछि छानबिन गर्ने, प्रमाण पुगेमा आरोपपत्र दर्ता गर्ने, र मुद्दालाई अदालतको प्रक्रियातर्फ लैजाने रूपमा देखाउँछ।";
  }

  if (mentionsComplaint && mentionsInvestigation && mentionsCharge && mentionsStalled) {
    return "Here, the record shows that a complaint or accusation was raised, CIAA investigated it, charges were later filed, the case went to court, and the process also became delayed or contested.";
  }

  if (mentionsComplaint && mentionsInvestigation && mentionsCharge) {
    return "Here, the record shows that a complaint or accusation was raised, CIAA investigated it, charges were later filed, and the case went to court.";
  }

  if (mentionsComplaint && mentionsInvestigation) {
    return "Here, the record shows that a complaint or accusation was raised and CIAA opened an investigation.";
  }

  if (mentionsInvestigation && mentionsCharge) {
    return "Here, the record shows that CIAA investigated the case, filed charges, and moved it into court proceedings.";
  }

  if (mentionsStalled) {
    return "Here, the record shows that the process became delayed, stuck, or politically contested.";
  }

  return "Here, the record shows CIAA mainly at the stage where a complaint is examined, an investigation is carried out, and if the evidence is considered sufficient, charges are filed and the case moves into court.";
}

function buildTopicCaseResults(
  matches: Array<{ caseItem: Case; score: number }>,
  language: GuestLanguage,
  topicId: GuestTopicId
): GuestCaseResultItem[] {
  return matches.map(({ caseItem, score }) => {
    if (topicId === "big_corruption_cases") {
      const amount = formatCurrency(caseItem.bigo);
      const reason =
        amount != null
          ? language === "ne"
            ? `ठूलो बिगो र सार्वजनिक स्रोतका आधारमा उच्च-प्राथमिकताको मुद्दा (${amount})`
            : `High-significance public case based on disputed amount and source depth (${amount})`
          : language === "ne"
          ? `धेरै आरोप, स्रोत वा सार्वजनिक महत्त्वका आधारमा प्राथमिकतामा परेको मुद्दा`
          : `Ranked highly based on allegations, evidence volume, and public significance`;

      return buildCaseResult(caseItem, reason);
    }

    const reason =
      topicId === "ciaa_process"
        ? language === "ne"
          ? `अख्तियार, अनुसन्धान वा सार्वजनिक प्रक्रियासँग सम्बन्धित संकेत फेला पर्‍यो (${score})`
          : `Matched CIAA or public investigation signals in the published case record (${score})`
        : language === "ne"
        ? `खरिद, अनुदान वा सम्झौता अनियमिततासँग सम्बन्धित संकेत फेला पर्‍यो (${score})`
        : `Matched procurement, subsidy, or contract-irregularity signals in the published case record (${score})`;

    const exampleDescription =
      topicId === "ciaa_process"
        ? summarizeCiaaHandling(caseItem, language)
        : undefined;

    return buildCaseResult(caseItem, reason, exampleDescription);
  });
}

function buildProcurementAnswer(
  caseResults: GuestCaseResultItem[],
  language: GuestLanguage,
  query: string
): GuestAskResponse["answer"] {
  if (caseResults.length === 0) {
    return {
      kind: "topic_summary",
      text:
        language === "ne"
          ? "हालको सार्वजनिक अभिलेखमा खरिदसम्बन्धी भ्रष्टाचारसँग स्पष्ट रूपमा मेल खाने प्रकाशित मुद्दा फेला परेन।"
          : "I could not find a published public case in the current archive that clearly matches procurement-related corruption.",
      confidence: "low",
    };
  }

  const cases = caseResults.map((result) => result.caseItem);
  const detectedPatterns = detectPatterns(cases, [
    {
      key: "fake_documents",
      labelEn: "fake or manipulated documents and guarantees",
      labelNe: "नक्कली वा हेरफेर गरिएका कागजात र ग्यारेन्टी",
      terms: ["fake document", "bank guarantee", "नक्कली कागजात", "बैंक ग्यारेन्टी"],
    },
    {
      key: "irregular_selection",
      labelEn: "irregular selection, bid, or eligibility decisions",
      labelNe: "अनियमित छनौट, बोलपत्र वा योग्यता निर्णय",
      terms: ["tender", "bid", "selection", "छनौट", "बोलपत्र", "टेन्डर"],
    },
    {
      key: "irregular_payment",
      labelEn: "payments released without proper verification or completion",
      labelNe: "काम पूरा नभई वा पर्याप्त जाँच बिना गरिएको भुक्तानी",
      terms: ["payment", "paid", "भुक्तानी", "निकासा", "completion", "कार्यसम्पन्न"],
    },
    {
      key: "collusion",
      labelEn: "collusion or abuse of authority by officials and beneficiaries",
      labelNe: "अधिकारी र लाभग्राहीबीचको मिलेमतो वा अख्तियार दुरुपयोग",
      terms: ["collusion", "milamato", "abuse of authority", "मिलेमतो", "दुरुपयोग"],
    },
  ]).slice(0, 3);

  const patternText =
    detectedPatterns.length > 0
      ? detectedPatterns
          .map((pattern) => (language === "ne" ? pattern.labelNe : pattern.labelEn))
          .join(language === "ne" ? ", " : ", ")
      : language === "ne"
      ? "खरिद वा अनुदानसम्बन्धी अनियमितता"
      : "procurement and subsidy irregularities";

  const matchedCountText =
    language === "ne"
      ? `${caseResults.length} वटा मिल्दोजुल्दो सार्वजनिक मुद्दा तल देखाइएका छन्।`
      : `${caseResults.length} matching public case result${caseResults.length === 1 ? "" : "s"} shown below.`;

  const procurementIntent = detectProcurementQuestionIntent(query);

  return {
    kind: "topic_summary",
    text:
      procurementIntent === "patterns"
        ? language === "ne"
          ? `मैले फेला पारेका सार्वजनिक खरिदसम्बन्धी मुद्दाहरूमा सबैभन्दा धेरै दोहोरिने ढाँचा ${patternText} हुन्। यी ढाँचाहरूले निर्णय, छनौट, वा भुक्तानी चरणमा प्रक्रिया हेरफेर भएको संकेत गर्छन्। ${matchedCountText}`
          : `Across the public procurement cases I found, the main repeating patterns are ${patternText}. Those patterns point to manipulation at the selection, verification, guarantee, or payment stages of procurement. ${matchedCountText}`
        : procurementIntent === "examples"
        ? language === "ne"
          ? `मैले तल सार्वजनिक खरिदसँग प्रत्यक्ष रूपमा सम्बन्धित प्रकाशित मुद्दाहरू देखाएको छु। यी मुद्दाहरूमा ${patternText} जस्ता खरिद-विशेष संकेत देखिन्छन्। ${matchedCountText}`
          : `I’ve listed published cases below that are directly tied to public procurement. In those cases, the procurement-specific signals most often include ${patternText}. ${matchedCountText}`
        : procurementIntent === "where"
        ? language === "ne"
          ? `सार्वजनिक खरिदसम्बन्धी भ्रष्टाचार नेपालमा संघीय, प्रदेश, र स्थानीय तहमा देखिन सक्छ। प्रकाशित सार्वजनिक मुद्दाहरूका आधारमा यस्तो जोखिम मन्त्रालय, सार्वजनिक निकाय, नगरपालिका, र कार्यक्रम कार्यान्वयन तहमा देखिन सक्छ, विशेषगरी जहाँ खरिद निर्णय, छनौट, वा भुक्तानी प्रक्रियामा कमजोरी हुन्छ। ${matchedCountText}`
          : `Procurement-related corruption in Nepal can arise at federal, provincial, and local levels. Based on the public cases in this archive, the risk can appear in ministries, public agencies, municipalities, and program implementation units, especially where procurement decisions, selection, or payment controls are weak. ${matchedCountText}`
        : procurementIntent === "definition"
        ? language === "ne"
          ? `सार्वजनिक खरिद भनेको सरकार वा सार्वजनिक निकायहरूले सामान, सेवा, वा निर्माण कार्य खरिद गर्ने प्रक्रिया हो। खरिदसम्बन्धी भ्रष्टाचार तब देखिन्छ जब निर्णयकर्ता, आपूर्तिकर्ता, वा लाभग्राहीहरूले निजी फाइदाका लागि योग्यता, स्पेसिफिकेशन, ग्यारेन्टी, प्रमाणीकरण, वा भुक्तानी प्रक्रियामा हेरफेर गर्छन्। प्रकाशित मुद्दाहरूमा यो प्रायः ${patternText} जस्ता रूपहरूमा देखिन्छ। ${matchedCountText}`
          : `Public procurement is the process through which government bodies and public institutions buy goods, services, and works. Procurement-related corruption appears when officials, vendors, or beneficiaries manipulate eligibility, specifications, guarantees, verification, or payment decisions for private gain. In the published cases I found, that usually appears as ${patternText}. ${matchedCountText}`
        : language === "ne"
        ? `सार्वजनिक खरिद भनेको सरकार वा सार्वजनिक निकायहरूले सामान, सेवा, वा निर्माण कार्य खरिद गर्ने प्रक्रिया हो। खरिदसम्बन्धी भ्रष्टाचार तब देखिन्छ जब निर्णयकर्ता, आपूर्तिकर्ता, वा लाभग्राहीहरूले निजी फाइदाका लागि छनौट, योग्यता, स्पेसिफिकेशन, ग्यारेन्टी, प्रमाणीकरण, वा भुक्तानी प्रक्रियामा हेरफेर गर्छन्। प्रकाशित सार्वजनिक मुद्दाहरूका आधारमा यस्तो भ्रष्टाचार प्रायः ${patternText} जस्ता ढाँचामा देखिन्छ। नेपालमा यस्तो जोखिम संघीय, प्रदेश, र स्थानीय तहका मन्त्रालय, निकाय, र कार्यक्रमहरूमा देखिन सक्छ। ${matchedCountText}`
        : `Public procurement is the process through which government bodies and public institutions buy goods, services, and works. Procurement-related corruption usually appears when officials, vendors, or beneficiaries manipulate eligibility, specifications, guarantees, verification, or payment decisions for private gain. Based on the published public cases in this archive, those risks most often appear as ${patternText}. In Nepal, that kind of corruption can arise at federal, provincial, and local levels, including ministries, public agencies, and municipalities. ${matchedCountText}`,
    confidence: caseResults.length >= 2 ? "high" : "medium",
  };
}

function buildBigCasesAnswer(caseResults: GuestCaseResultItem[], language: GuestLanguage): GuestAskResponse["answer"] {
  if (caseResults.length === 0) {
    return {
      kind: "case_collection",
      text:
        language === "ne"
          ? "हालको सार्वजनिक अभिलेखमा ठूलो वा उच्च-प्राथमिकताका भ्रष्टाचार मुद्दा छुट्याउन पर्याप्त संकेत फेला परेन।"
          : "I could not confidently identify any large or high-significance corruption cases from the current public archive.",
      confidence: "low",
    };
  }

  const highlightedCases = caseResults
    .slice(0, 5)
    .map((result) => {
      const amount = formatCurrency(result.caseItem.bigo);
      if (amount) {
        return language === "ne"
          ? `${result.title} (${amount})`
          : `${result.title} (${amount})`;
      }

      return result.title;
    })
    .join(language === "ne" ? " ; " : "; ");

  return {
    kind: "case_collection",
    text:
      language === "ne"
        ? `मैले सार्वजनिक अभिलेखबाट ठूलो बिगो, धेरै स्रोत, र गम्भीर आरोपका संकेत भएका भ्रष्टाचार मुद्दाहरू छानेको छु। माथिका प्रमुख उदाहरणहरूमा ${highlightedCases} पर्छन्।`
        : `I ranked these as the largest or most significant public corruption cases using disputed amount where available, plus source volume and allegation depth. The related examples include ${highlightedCases}.`,
    confidence: caseResults.length > 0 ? "medium" : "low",
  };
}

function buildCasesRegistered20812082Answer(language: GuestLanguage): GuestAskResponse["answer"] {
  return {
    kind: "case_collection",
    text:
      language === "ne"
        ? `आर्थिक वर्ष २०८१/८२ मा जम्मा ${CIAA_TRACKER_2081_2082_TOTAL_CASES} वटा भ्रष्टाचार मुद्दा दर्ता भएका थिए।\n\nती ६ प्रकारमा देखिन्छन्:\n- घुस (रिसवत) सँग सम्बन्धित मुद्दा: ३७\n- गैरकानुनी लाभ वा हानि नोक्सानी गरी भ्रष्टाचार गरेका मुद्दा: ३४\n- नक्कली शैक्षिक प्रमाणपत्रसम्बन्धी मुद्दा: २७\n- सार्वजनिक सम्पत्ति हानि नोक्सानीसम्बन्धी मुद्दा: २४\n- गैरकानुनी आम्दानीसम्बन्धी मुद्दा: ८\n- सम्पत्ति शुद्धीकरणसम्बन्धी मुद्दा: ५`
        : `There were total ${CIAA_TRACKER_2081_2082_TOTAL_CASES} corruption cases registered in the year 2081/82 BS.\n\nThere were 6 categories:\n- Bribery cases: 37\n- Illegal benefit or loss cases: 34\n- Fake education certificate cases: 27\n- Public asset damage cases: 24\n- Illegal income cases: 8\n- Money laundering cases: 5`,
    confidence: "high",
  };
}

function buildCiaaAnswer(caseResults: GuestCaseResultItem[], language: GuestLanguage): GuestAskResponse["answer"] {
  return {
    kind: "institutional_explainer",
    text:
      language === "ne"
        ? "अख्तियार भ्रष्टाचार मुद्दाहरूमा मुख्यतः अनुसन्धान र आरोपपत्र दर्ता हुने चरणमा देखिन्छ। हालका सार्वजनिक मुद्दाहरूमा सामान्य ढाँचा यस्तो देखिन्छ: उजुरी वा आरोपको जाँच, अख्तियारद्वारा अनुसन्धान, र प्रमाण पर्याप्त ठहरेमा विशेष अदालतमा आरोपपत्र / charge sheet दायर। त्यसपछि सार्वजनिक अभिलेख अदालतका कार्यवाही, फैसला, र स्रोत-आधारित अद्यावधिकतर्फ सर्छ। अभिलेखले यो प्रक्रिया सधैं छिटो वा एकनासले नचल्ने पनि देखाउँछ; केही मुद्दाहरूमा अनुसन्धान ढिलो, रोकिएको, वा राजनीतिक रूपमा विवादित देखिएको छ। त्यसैले यहाँ अख्तियार सम्पूर्ण अन्त्यसम्मको भ्रष्टाचार प्रणालीभन्दा बढी अनुसन्धान गर्ने, अभियोजन गर्ने कि नगर्ने निर्णय गर्ने, र प्रमुख भ्रष्टाचार आरोपहरू अदालतसम्म पुर्‍याउने निकायका रूपमा देखिन्छ।"
        : "CIAA appears mainly at the investigation and charge-filing stage of corruption cases. The pattern usually looks like this: a complaint or allegation is examined by CIAA, CIAA investigates the alleged irregularity, and, if it considers the evidence sufficient, it files an आरोपपत्र / charge sheet in the Special Court. After that, the public record shifts toward court proceedings, decisions, and source-based updates. The archive also shows that this process does not always move quickly or consistently. In some cases, CIAA investigation is described as stalled, delayed, or politically contested. So CIAA appears less as the entire end-to-end corruption system and more as the body that investigates, decides whether to prosecute, and brings major corruption allegations into court.",
    confidence: caseResults.length > 0 ? "medium" : "low",
  };
}

function getTopicFollowups(topicId: GuestTopicId, language: GuestLanguage): string[] {
  const knowledge = GUEST_TOPIC_KNOWLEDGE.find((topic) => topic.id === topicId);
  if (!knowledge) {
    return getDefaultFollowups(language);
  }

  return language === "ne" ? knowledge.followupsNe : knowledge.followupsEn;
}

async function resolveCaseSources(caseId: number) {
  const caseData = await getCaseById(caseId);
  const sourceEntries = await Promise.all(
    caseData.evidence.map(async (entry) => {
      try {
        const source = await getDocumentSourceById(entry.source_id);
        return {
          sourceId: entry.source_id,
          source,
          evidenceDescription: entry.description,
        };
      } catch {
        return {
          sourceId: entry.source_id,
          source: null,
          evidenceDescription: entry.description,
        };
      }
    })
  );

  return { caseData, sourceEntries };
}

function findRelevantSources(
  question: string,
  sources: GuestCaseSourceEntry[]
): GuestCaseChatCitation[] {
  const normalizedQuestion = normalize(question);

  const matches = sources.filter(({ source, evidenceDescription }) => {
    const haystack = normalize(
      [
        source?.title,
        source?.description,
        evidenceDescription,
        Array.isArray(source?.url) ? source?.url.join(" ") : "",
      ]
        .filter(Boolean)
        .join(" ")
    );

    if (!haystack) {
      return false;
    }

    if (normalizedQuestion.includes("charge sheet")) {
      return haystack.includes("charge sheet");
    }

    if (normalizedQuestion.includes("timeline")) {
      return false;
    }

    if (
      normalizedQuestion.includes("source") ||
      normalizedQuestion.includes("evidence") ||
      normalizedQuestion.includes("स्रोत")
    ) {
      return true;
    }

    return haystack.includes(normalizedQuestion);
  });

  return matches.slice(0, 3).map(({ sourceId, source, evidenceDescription }) => ({
    sourceId,
    sourceTitle: source?.title || `Source ${sourceId}`,
    reason: evidenceDescription || source?.description || undefined,
  }));
}

function buildEntityAskAnswer(
  phrase: string,
  caseResults: GuestCaseResultItem[],
  entityMatches: GuestEntityMatch[],
  language: GuestLanguage
): GuestAskResponse["answer"] {
  if (caseResults.length === 0) {
    return {
      kind: "entity_match",
      text:
        language === "ne"
          ? `${phrase} सँग स्पष्ट रूपमा सम्बन्धित प्रकाशित सार्वजनिक मुद्दा फेला परेन। अर्को नाम, संस्था, वा केस-किवर्ड प्रयोग गर्नुहोस्।`
          : `I could not find a published public case clearly related to ${phrase}. Try a different name, organization, or case keyword.`,
      confidence: "low",
    };
  }

  if (entityMatches.length > 0) {
    return {
      kind: "entity_match",
      text:
        language === "ne"
          ? `हो, ${entityMatches[0].display_name} सँग सम्बन्धित ${caseResults.length} वटा प्रकाशित सार्वजनिक मुद्दा भेटिए।`
          : `Yes. I found ${caseResults.length} published case${caseResults.length === 1 ? "" : "s"} related to ${entityMatches[0].display_name}.`,
      confidence: caseResults.length > 0 ? "high" : "medium",
    };
  }

  return {
    kind: "entity_match",
    text:
      language === "ne"
        ? `"${phrase}" सँग सम्बन्धित देखिने ${caseResults.length} वटा प्रकाशित सार्वजनिक मुद्दा भेटिए।`
        : `I found ${caseResults.length} published case${caseResults.length === 1 ? "" : "s"} that appear relevant to "${phrase}".`,
    confidence: "medium",
  };
}

async function buildEntitySearchResponse(
  query: string,
  publicCases: Case[],
  language: GuestLanguage
): Promise<GuestAskResponse> {
  const phrase = extractSearchPhrase(query);
  const normalizedPhrase = normalize(phrase);

  const entitySearch = phrase ? await searchEntities(phrase, { limit: 8 }) : { entities: [] };
  const entityMatches: GuestEntityMatch[] = entitySearch.entities.slice(0, 5).map((entity) => ({
    jawaf_entity_id: 0,
    nes_id: entity.id,
    display_name: entity.name || entity.id,
    match_reason:
      language === "ne"
        ? "सार्वजनिक इकाइ डाइरेक्टरीबाट मिलान गरिएको"
        : "Matched from the public entity directory",
  }));

  const entityLinkedCases = publicCases
    .filter((caseItem) =>
      caseItem.entities.some(
        (entity) =>
          normalize(entity.display_name || "") === normalizedPhrase ||
          normalize(entity.nes_id || "").includes(normalizedPhrase) ||
          entityMatches.some((match) => match.nes_id === entity.nes_id)
      )
    )
    .map((caseItem) => {
      const matchedEntities = caseItem.entities.filter(
        (entity) =>
          normalize(entity.display_name || "") === normalizedPhrase ||
          entityMatches.some((match) => match.nes_id === entity.nes_id)
      );

      return buildCaseResult(
        caseItem,
        matchedEntities.length > 0
          ? language === "ne"
            ? `सम्बन्धित इकाइ मिलान: ${matchedEntities
                .map((entity) => entity.display_name)
                .filter(Boolean)
                .join(", ")}`
            : `Matched related entity${matchedEntities.length === 1 ? "" : "ies"}: ${matchedEntities
                .map((entity) => entity.display_name)
                .filter(Boolean)
                .join(", ")}`
          : language === "ne"
          ? "सार्वजनिक इकाइ डाइरेक्टरीमार्फत मिलान भयो"
          : "Matched through the public entity directory",
        matchedEntities.map((entity) => entity.display_name || entity.nes_id || "Unnamed entity"),
        matchedEntities.map((entity) => entity.id)
      );
    });

  const keywordCases = publicCases
    .filter((caseItem) => getCaseSearchText(caseItem).includes(normalizedPhrase))
    .map((caseItem) =>
      buildCaseResult(
        caseItem,
        language === "ne"
          ? `"${phrase}" का लागि सार्वजनिक केस-पाठ मिल्यो`
          : `Matched public case text for "${phrase}"`
      )
    );

  const caseResults = dedupeCaseResults([...entityLinkedCases, ...keywordCases]);

  return {
    query,
    answer: buildEntityAskAnswer(phrase, caseResults, entityMatches, language),
    entity_matches: entityMatches,
    case_results: caseResults,
    suggested_followups:
      caseResults.length > 0
        ? language === "ne"
          ? [
              `${caseResults[0].title} खोल`,
              "पहिलो मुद्दालाई कुन सार्वजनिक स्रोतहरूले समर्थन गर्छन्?",
              "पहिलो मुद्दाका मुख्य आरोप के हुन्?",
            ]
          : [
              `Open ${caseResults[0].title}`,
              "Which public sources support the first case?",
              "What are the key allegations in the first case?",
            ]
        : getDefaultFollowups(language),
    answerOrigin: "public-read-adapter",
  };
}

export async function askGuestQuestion(
  query: string,
  options: {
    publicCases?: Case[];
    language?: string;
  } = {}
): Promise<GuestAskResponse> {
  const language = getGuestLanguage(options.language);
  const publicCases = options.publicCases ?? (await getAllPublicCases());
  const detectedTopic = detectTopic(query);

  if (!detectedTopic) {
    return buildEntitySearchResponse(query, publicCases, language);
  }

  if (detectedTopic.topicId === "cases_registered_2081_2082_bs") {
    return {
      query,
      answer: buildCasesRegistered20812082Answer(language),
      entity_matches: [],
      case_results: [],
      suggested_followups: getTopicFollowups(detectedTopic.topicId, language),
      answerOrigin: "public-read-adapter",
    };
  }

  const topicMatches = getTopTopicCases(publicCases, detectedTopic.topicId);
  const caseResults = buildTopicCaseResults(topicMatches, language, detectedTopic.topicId);

  let answer: GuestAskResponse["answer"];

  if (detectedTopic.topicId === "procurement_corruption") {
    answer = buildProcurementAnswer(caseResults, language, query);
  } else if (detectedTopic.topicId === "big_corruption_cases") {
    answer = buildBigCasesAnswer(caseResults, language);
  } else {
    answer = buildCiaaAnswer(caseResults, language);
  }

  return {
    query,
    answer,
    entity_matches: [],
    case_results: caseResults,
    suggested_followups: getTopicFollowups(detectedTopic.topicId, language),
    answerOrigin: "public-read-adapter",
  };
}

export async function askGuestCaseQuestion(params: {
  caseId: number;
  question: string;
  caseData?: CaseDetail;
  sourceEntries?: GuestCaseSourceEntry[];
}): Promise<GuestCaseChatResponse> {
  const resolvedContext =
    params.caseData && params.sourceEntries
      ? { caseData: params.caseData, sourceEntries: params.sourceEntries }
      : await resolveCaseSources(params.caseId);
  const { caseData, sourceEntries } = resolvedContext;
  const normalizedQuestion = normalize(params.question);
  const citations = findRelevantSources(params.question, sourceEntries);

  let answer = `This public case record is titled "${caseData.title}". `;

  if (normalizedQuestion.includes("allegation")) {
    answer =
      caseData.key_allegations.length > 0
        ? `The key public allegations are: ${caseData.key_allegations.join(" ")}`
        : "This public case page does not list any key allegations yet.";
  } else if (normalizedQuestion.includes("timeline") || normalizedQuestion.includes("happened first")) {
    answer =
      caseData.timeline.length > 0
        ? `The public timeline begins with ${caseData.timeline[0].date}: ${caseData.timeline[0].title}. ${caseData.timeline
            .slice(1, 3)
            .map((entry) => `${entry.date}: ${entry.title}.`)
            .join(" ")}`
        : "This public case page does not include a timeline yet.";
  } else if (
    normalizedQuestion.includes("source") ||
    normalizedQuestion.includes("evidence") ||
    normalizedQuestion.includes("स्रोत")
  ) {
    answer =
      sourceEntries.length > 0
        ? `This case currently references ${sourceEntries.length} public source${sourceEntries.length === 1 ? "" : "s"}: ${sourceEntries
            .map(({ source, sourceId }) => source?.title || `Source ${sourceId}`)
            .join(", ")}.`
        : "This public case page does not list any document sources yet.";
  } else if (normalizedQuestion.includes("related entit") || normalizedQuestion.includes("who")) {
    answer =
      caseData.entities.length > 0
        ? `The related public entities listed on this case are ${caseData.entities
            .map((entity) => entity.display_name || entity.nes_id || "Unnamed entity")
            .join(", ")}.`
        : "This public case page does not list related entities yet.";
  } else if (normalizedQuestion.includes("charge sheet")) {
    const chargeSheet = sourceEntries.find(({ source, evidenceDescription }) =>
      normalize(`${source?.title || ""} ${source?.description || ""} ${evidenceDescription || ""}`).includes(
        "charge sheet"
      )
    );
    answer = chargeSheet?.source
      ? `${chargeSheet.source.title} is the source most directly related to the charge sheet for this public case.`
      : "I could not identify a public source on this case page that explicitly mentions a charge sheet.";
  } else {
    answer = `${stripHtml(caseData.description) || "This public case page has limited descriptive text."} ${
      caseData.key_allegations[0] ? `One key allegation is: ${caseData.key_allegations[0]}` : ""
    }`.trim();
  }

  return {
    caseId: params.caseId,
    question: params.question,
    answer,
    grounded: true,
    citations,
    followups: [
      "What are the key allegations?",
      "Summarize the timeline",
      "Which sources support this case?",
    ],
    origin: "public-read-adapter",
  };
}
