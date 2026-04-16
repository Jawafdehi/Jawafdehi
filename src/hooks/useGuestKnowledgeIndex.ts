import { useQuery } from "@tanstack/react-query";
import { getAllPublicCases } from "@/services/guest-chat-adapter";

const GUEST_KNOWLEDGE_INDEX_QUERY_KEY = ["guest", "knowledge-index"] as const;

export function useGuestKnowledgeIndex() {
  return useQuery({
    queryKey: GUEST_KNOWLEDGE_INDEX_QUERY_KEY,
    queryFn: getAllPublicCases,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export { GUEST_KNOWLEDGE_INDEX_QUERY_KEY };
