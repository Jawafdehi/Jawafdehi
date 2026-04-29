export interface PublicChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface PublicChatSource {
  title: string;
  url: string;
  type: string;
  snippet?: string;
  source_id?: string | null;
  document_id?: string | null;
  chunk_id?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  score?: number | null;
}

export interface PublicChatRelatedCase {
  id: number;
  title: string;
  url: string;
  slug?: string | null;
  case_id?: string | null;
  short_description?: string | null;
}

export interface PublicChatResponse {
  answer_text: string;
  session_id?: string;
  sources: PublicChatSource[];
  related_cases: PublicChatRelatedCase[];
  follow_up_questions: string[];
}
