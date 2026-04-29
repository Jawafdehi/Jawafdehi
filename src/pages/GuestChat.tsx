import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AlertCircle, PencilLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { BotTypingBubble } from "@/components/guest/BotTypingBubble";
import { Header } from "@/components/Header";
import { GuestAnswerBlock } from "@/components/guest/GuestAnswerBlock";
import { GuestChatInput } from "@/components/guest/GuestChatInput";
import { PublicChatRelatedCases } from "@/components/guest/PublicChatRelatedCases";
import { PublicChatSources } from "@/components/guest/PublicChatSources";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePublicChat } from "@/hooks/usePublicChat";
import type { PublicChatResponse } from "@/types/public-chat";

interface GuestChatTurn {
  id: string;
  question: string;
  response: PublicChatResponse;
}

const PUBLIC_CHAT_TURNS_KEY = "jawafdehi_public_chat_turns";

function GuestPromptGrid({
  prompts,
  onPromptClick,
  compact = false,
}: {
  prompts: string[];
  onPromptClick: (prompt: string) => void;
  compact?: boolean;
}) {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {prompts.map((prompt) => (
        <Button
          key={prompt}
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={() => onPromptClick(prompt)}
          className={
            compact
              ? "h-auto justify-start whitespace-normal rounded-2xl px-3 py-2 text-left text-xs"
              : "h-auto justify-start whitespace-normal rounded-2xl px-4 py-3 text-left text-sm"
          }
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}

export default function GuestChat() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [history, setHistory] = useState<GuestChatTurn[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const raw = window.sessionStorage.getItem(PUBLIC_CHAT_TURNS_KEY);
      return raw ? (JSON.parse(raw) as GuestChatTurn[]) : [];
    } catch {
      return [];
    }
  });
  const seededQuestion = searchParams.get("q") || "";
  const suggestedPrompts = [
    t("guestChat.prompts.procurementCorruption"),
    t("guestChat.prompts.ciaaProcess"),
    t("guestChat.prompts.bigCorruptionCases"),
    t("guestChat.prompts.casesRegistered20812082Bs"),
  ];
  const {
    response,
    error,
    isLoading,
    submitQuestion,
    resetConversation: resetGuestAsk,
  } = usePublicChat(i18n.language);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.sessionStorage.setItem(PUBLIC_CHAT_TURNS_KEY, JSON.stringify(history));
  }, [history]);

  const handleSubmit = async (question: string) => {
    if (isLoading) {
      return;
    }

    const requestHistory = history.flatMap((turn) => [
      { role: "user" as const, content: turn.question },
      { role: "assistant" as const, content: turn.response.answer_text },
    ]);

    setSubmittedQuestion(question);
    const nextResponse = await submitQuestion(question, requestHistory);
    if (nextResponse) {
      setHistory((current) => [
        ...current,
        {
          id: `turn-${Date.now()}`,
          question,
          response: nextResponse,
        },
      ]);
      setSubmittedQuestion("");
    }
  };

  const resetConversation = () => {
    setSubmittedQuestion("");
    setHistory([]);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(PUBLIC_CHAT_TURNS_KEY);
    }
    resetGuestAsk();
  };

  const latestResponse = history.length > 0 ? history[history.length - 1].response : response;
  const hasConversation = isLoading || history.length > 0 || Boolean(submittedQuestion) || Boolean(error);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t("guestChat.metaTitle")}</title>
        <meta name="description" content={t("guestChat.metaDescription")} />
      </Helmet>

      <Header />

      <main id="main-content" className="container mx-auto h-[calc(100vh-5rem)] px-4 py-6 md:h-[calc(100vh-5.5rem)] md:py-8">
        <div className="mx-auto flex h-full max-w-[768px] flex-col">
          {hasConversation ? (
            <div className="mb-4">
              <Button variant="ghost" className="rounded-full px-3" onClick={resetConversation}>
                <PencilLine className="h-4 w-4" />
                {t("guestChat.newChat")}
              </Button>
            </div>
          ) : null}

          <section className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              {!response && !isLoading && !error && history.length === 0 ? (
                <div className="flex min-h-full flex-col justify-center">
                  <div className="space-y-5 pt-6 text-center md:pt-12">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary">
                      <img
                        src="/assets/bot.svg"
                        alt={t("guestCommon.assistantAlt")}
                        className="h-16 w-16"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-3">
                        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                          {t("guestChat.title")}
                        </h1>
                      </div>
                    </div>
                  </div>

                  <div className="mx-auto w-full max-w-[736px] pt-24 md:pt-28">
                    <div className="space-y-6">
                      <GuestPromptGrid prompts={suggestedPrompts} onPromptClick={handleSubmit} />
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? (
                <Alert variant="destructive" className="mt-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error instanceof Error ? error.message : t("guestChat.errors.loadFailed")}
                  </AlertDescription>
                </Alert>
              ) : null}

              {hasConversation ? (
                <div className="space-y-5 pt-4 pb-8">
                  {history.map((turn) => (
                    <div key={turn.id} className="space-y-5">
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-[28px] bg-primary px-5 py-4 text-sm leading-7 text-primary-foreground shadow-sm">
                          {turn.question}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <GuestAnswerBlock
                          answer={turn.response.answer_text}
                          resultCount={turn.response.related_cases.length}
                        />
                        {turn.response.sources.length > 0 ? (
                          <div className="ml-12">
                            <PublicChatSources sources={turn.response.sources} />
                          </div>
                        ) : null}
                        {turn.response.related_cases.length > 0 ? (
                          <div className="ml-12">
                            <PublicChatRelatedCases cases={turn.response.related_cases} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {(submittedQuestion || isLoading) ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-[28px] bg-primary px-5 py-4 text-sm leading-7 text-primary-foreground shadow-sm">
                        {submittedQuestion}
                      </div>
                    </div>
                  ) : null}

                  {isLoading ? (
                    <BotTypingBubble />
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="border-t border-border/60 bg-background/95 pt-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="mx-auto w-full max-w-[736px] space-y-3">
                {latestResponse ? (
                  <GuestPromptGrid
                    prompts={latestResponse.follow_up_questions}
                    onPromptClick={handleSubmit}
                    compact
                  />
                ) : null}
                <GuestChatInput
                  defaultValue={!response && !isLoading && !error && history.length === 0 ? seededQuestion : undefined}
                  placeholder={
                    response || isLoading || history.length > 0
                      ? t("guestChatInput.askAnotherPlaceholder")
                      : t("guestChatInput.askQuestionPlaceholder")
                  }
                  submitLabel={t("guestChatInput.submit")}
                  loadingLabel={t("guestChatInput.searching")}
                  disabled={false}
                  isSubmitting={isLoading}
                  onSubmit={handleSubmit}
                />
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
