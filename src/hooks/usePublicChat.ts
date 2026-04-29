import { useMutation } from "@tanstack/react-query";
import {
  askPublicQuestion,
  getPublicChatSessionId,
  resetPublicChatSession,
} from "@/services/public-chat";
import type { PublicChatHistoryItem } from "@/types/public-chat";

interface SubmitQuestionInput {
  question: string;
  history?: PublicChatHistoryItem[];
}

export function usePublicChat(language?: string) {
  const mutation = useMutation({
    mutationFn: async ({ question, history }: SubmitQuestionInput) =>
      askPublicQuestion({
        question,
        history,
        language,
        sessionId: getPublicChatSessionId(),
      }),
  });

  const submitQuestion = async (question: string, history?: PublicChatHistoryItem[]) => {
    try {
      return await mutation.mutateAsync({ question, history });
    } catch {
      return null;
    }
  };

  const resetConversation = () => {
    resetPublicChatSession();
    mutation.reset();
  };

  return {
    response: mutation.data ?? null,
    error: mutation.error ?? null,
    isLoading: mutation.isPending,
    submitQuestion,
    resetConversation,
  };
}
