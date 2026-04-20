import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AlertCircle, PencilLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { BotTypingBubble } from "@/components/guest/BotTypingBubble";
import { Header } from "@/components/Header";
import { GuestAnswerBlock } from "@/components/guest/GuestAnswerBlock";
import { GuestChatInput } from "@/components/guest/GuestChatInput";
import { GuestCaseResultList } from "@/components/guest/GuestCaseResultList";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGuestAsk } from "@/hooks/useGuestAsk";
import type { GuestAskResponse } from "@/types/guest-chat";

interface GuestChatTurn {
  id: string;
  question: string;
  response: GuestAskResponse;
}

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
  const [history, setHistory] = useState<GuestChatTurn[]>([]);
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
  } = useGuestAsk(i18n.language);

  const handleSubmit = async (question: string) => {
    if (isLoading) {
      return;
    }

    if (response) {
      setHistory((current) => {
        if (current.some((turn) => turn.response.query === response.query)) {
          return current;
        }

        return [
          ...current,
          {
            id: `turn-${Date.now()}`,
            question: response.query,
            response,
          },
        ];
      });
    }

    setSubmittedQuestion(question);
    await submitQuestion(question);
  };

  const resetConversation = () => {
    setSubmittedQuestion("");
    setHistory([]);
    resetGuestAsk();
  };

  const hasConversation = response || isLoading || history.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t("guestChat.metaTitle")}</title>
        <meta name="description" content={t("guestChat.metaDescription")} />
      </Helmet>

      <Header />

      <main className="container mx-auto h-[calc(100vh-5rem)] px-4 py-6 md:h-[calc(100vh-5.5rem)] md:py-8">
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
                        <span className="rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                          Demo
                        </span>
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
                  <AlertDescription>{t("guestChat.errors.loadFailed")}</AlertDescription>
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
                          answer={turn.response.answer.text}
                          resultCount={turn.response.case_results.length}
                        />
                        {turn.response.case_results.length > 0 ? (
                          <div className="ml-12">
                            <GuestCaseResultList results={turn.response.case_results} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {(submittedQuestion || response?.query || isLoading) ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-[28px] bg-primary px-5 py-4 text-sm leading-7 text-primary-foreground shadow-sm">
                        {submittedQuestion || response?.query}
                      </div>
                    </div>
                  ) : null}

                  {isLoading && !response ? (
                    <BotTypingBubble />
                  ) : response ? (
                    <div className="space-y-4">
                      <GuestAnswerBlock
                        answer={response.answer.text}
                        resultCount={response.case_results.length}
                      />
                      {response.case_results.length > 0 ? (
                        <div className="ml-12">
                          <GuestCaseResultList results={response.case_results} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="border-t border-border/60 bg-background/95 pt-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="mx-auto w-full max-w-[736px] space-y-3">
                {response ? (
                  <GuestPromptGrid
                    prompts={response.suggested_followups}
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
                  disabled
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
