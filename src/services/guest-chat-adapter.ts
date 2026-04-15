import { searchEntities } from "@/services/api";
import { getCaseById, getCases, getDocumentSourceById } from "@/services/jds-api";
import type { Case, DocumentSource } from "@/types/jds";
import type {
  GuestAskResponse,
  GuestCaseChatCitation,
  GuestCaseChatResponse,
  GuestCaseResultItem,
  GuestEntityMatch,
} from "@/types/guest-chat";

const MAX_CASE_PAGES = 5;
const DEFAULT_FOLLOWUPS = [
  "Open the most relevant case",
  "What are the key allegations in the first case?",
  "Which public sources are attached to that case?",
];

function stripHtml(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractSearchPhrase(query: string): string {
  const trimmed = query.trim();
  const match = trimmed.match(/(?:related to|about|for)\s+(.+?)(?:\?|$)/i);
  return (match?.[1] || trimmed).replace(/^["']|["']$/g, "").trim();
}

async function getAllPublicCases(): Promise<Case[]> {
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

function getCaseSummary(caseItem: Case): string {
  return (
    stripHtml(caseItem.short_description) ||
    caseItem.key_allegations[0] ||
    stripHtml(caseItem.description)
  );
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
  matchedEntityNames: string[] = [],
  matchedEntityIds: number[] = []
): GuestCaseResultItem {
  return {
    id: caseItem.id,
    title: caseItem.title,
    state: caseItem.state,
    case_type: caseItem.case_type,
    short_description: getCaseSummary(caseItem),
    tags: caseItem.tags,
    matched_entity_names: matchedEntityNames,
    caseItem,
    matchReason,
    matchedEntityIds,
    matchedEntityNames,
  };
}

function buildAskAnswer(
  phrase: string,
  caseResults: GuestCaseResultItem[],
  entityMatches: GuestEntityMatch[]
): GuestAskResponse["answer"] {
  if (caseResults.length === 0) {
    return {
      kind: "entity_match",
      text: `I could not find a published public case clearly related to ${phrase}. Try a different name, organization, or case keyword.`,
      confidence: "low",
    };
  }

  if (entityMatches.length > 0) {
    return {
      kind: "entity_match",
      text: `Yes. I found ${caseResults.length} published case${caseResults.length === 1 ? "" : "s"} related to ${entityMatches[0].display_name}.`,
      confidence: caseResults.length > 0 ? "high" : "medium",
    };
  }

  return {
    kind: "entity_match",
    text: `I found ${caseResults.length} published case${caseResults.length === 1 ? "" : "s"} that appear relevant to "${phrase}".`,
    confidence: "medium",
  };
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
  sources: Array<{ sourceId: number; source: DocumentSource | null; evidenceDescription?: string }>
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

    if (normalizedQuestion.includes("source") || normalizedQuestion.includes("evidence")) {
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

export async function askGuestQuestion(query: string): Promise<GuestAskResponse> {
  const phrase = extractSearchPhrase(query);
  const normalizedPhrase = normalize(phrase);
  const publicCases = await getAllPublicCases();

  const entitySearch = phrase ? await searchEntities(phrase, { limit: 8 }) : { entities: [] };
  const entityMatches: GuestEntityMatch[] = entitySearch.entities.slice(0, 5).map((entity) => ({
    jawaf_entity_id: 0,
    nes_id: entity.id,
    display_name: entity.name || entity.id,
    match_reason: "Matched from the public entity directory",
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
          ? `Matched related entity${matchedEntities.length === 1 ? "" : "ies"}: ${matchedEntities
              .map((entity) => entity.display_name)
              .filter(Boolean)
              .join(", ")}`
          : "Matched through the public entity directory",
        matchedEntities.map((entity) => entity.display_name || entity.nes_id || "Unnamed entity"),
        matchedEntities.map((entity) => entity.id)
      );
    });

  const keywordCases = publicCases
    .filter((caseItem) =>
      normalize(
        [caseItem.title, caseItem.description, caseItem.key_allegations.join(" "), caseItem.tags.join(" ")]
          .join(" ")
      ).includes(normalizedPhrase)
    )
    .map((caseItem) =>
      buildCaseResult(caseItem, `Matched public case text for "${phrase}"`)
    );

  const caseResults = dedupeCaseResults([...entityLinkedCases, ...keywordCases]).slice(0, 6);

  return {
    query,
    answer: buildAskAnswer(phrase, caseResults, entityMatches),
    entity_matches: entityMatches,
    case_results: caseResults,
    suggested_followups:
      caseResults.length > 0
        ? [
            `Open ${caseResults[0].title}`,
            "Which public sources support the first case?",
            "What are the key allegations in the first case?",
          ]
        : DEFAULT_FOLLOWUPS,
    answerOrigin: "public-read-adapter",
  };
}

export async function askGuestCaseQuestion(params: {
  caseId: number;
  question: string;
}): Promise<GuestCaseChatResponse> {
  const { caseData, sourceEntries } = await resolveCaseSources(params.caseId);
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
  } else if (normalizedQuestion.includes("source") || normalizedQuestion.includes("evidence")) {
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
