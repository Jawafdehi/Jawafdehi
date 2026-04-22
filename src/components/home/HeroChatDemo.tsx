import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

type DemoPhase = "typing" | "loading" | "answer";

export function HeroChatDemo() {
  const { t } = useTranslation();
  const [demoTypedQuestion, setDemoTypedQuestion] = useState("");
  const [demoSubmittedQuestion, setDemoSubmittedQuestion] = useState("");
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("typing");
  const [revealedSteps, setRevealedSteps] = useState(0);
  const demoQuestion = t("guestChat.prompts.ciaaProcess");
  const demoTimeline = t("heroChatDemo.timeline", {
    returnObjects: true,
  }) as Array<{ title: string; detail: string }>;

  useEffect(() => {
    let typingInterval: ReturnType<typeof setInterval> | null = null;
    let submitTimeout: ReturnType<typeof setTimeout> | null = null;
    let answerTimeout: ReturnType<typeof setTimeout> | null = null;

    setDemoPhase("typing");
    setDemoSubmittedQuestion("");
    setDemoTypedQuestion("");
    setRevealedSteps(0);

    let currentIndex = 0;
    typingInterval = setInterval(() => {
      currentIndex += 1;
      setDemoTypedQuestion(demoQuestion.slice(0, currentIndex));

      if (currentIndex >= demoQuestion.length) {
        if (typingInterval) {
          clearInterval(typingInterval);
          typingInterval = null;
        }

        submitTimeout = setTimeout(() => {
          setDemoSubmittedQuestion(demoQuestion);
          setDemoTypedQuestion("");
          setDemoPhase("loading");

          answerTimeout = setTimeout(() => {
            setDemoPhase("answer");
          }, 1200);
        }, 450);
      }
    }, 38);

    return () => {
      if (typingInterval) clearInterval(typingInterval);
      if (submitTimeout) clearTimeout(submitTimeout);
      if (answerTimeout) clearTimeout(answerTimeout);
    };
  }, [demoQuestion]);

  useEffect(() => {
    if (demoPhase !== "answer") {
      setRevealedSteps(0);
      return;
    }

    let currentStep = 0;
    setRevealedSteps(1);

    const revealInterval = setInterval(() => {
      currentStep += 1;
      if (currentStep >= demoTimeline.length) {
        clearInterval(revealInterval);
        return;
      }
      setRevealedSteps(currentStep + 1);
    }, 220);

    return () => clearInterval(revealInterval);
  }, [demoPhase, demoTimeline.length]);

  return (
    <div className="relative block lg:flex lg:h-full">
      <div className="ml-auto flex h-[560px] w-full max-w-[740px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-background/95 shadow-2xl ring-1 ring-white/10 backdrop-blur">
        <div className="border-b border-border/60 px-4 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/15 bg-primary/10">
                <img
                  src="/assets/bot.svg"
                  alt={t("guestCommon.assistantAlt")}
                  className="h-10 w-10"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("heroChatDemo.subtitle")}
                </p>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {t("guestChat.title")}
                </h2>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden rounded-full border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 sm:inline-flex"
            >
              <Link to="/cases">{t("heroChatDemo.demoCta")}</Link>
            </Button>
          </div>
        </div>

        <div className="flex h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
          <div className="flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
            <div className="flex h-[72px] flex-shrink-0 items-start justify-end">
              <div
                className="max-w-[82%] rounded-[24px] bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm transition-opacity duration-200"
                style={{ opacity: demoSubmittedQuestion ? 1 : 0 }}
                aria-hidden={!demoSubmittedQuestion}
              >
                {demoSubmittedQuestion || demoQuestion}
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <div className="flex h-full items-start gap-3">
                <div
                  className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-opacity duration-200"
                  style={{ opacity: demoPhase === "loading" || demoPhase === "answer" ? 1 : 0 }}
                  aria-hidden={demoPhase === "typing"}
                >
                  <img
                    src="/assets/bot.svg"
                    alt={t("guestCommon.assistantAlt")}
                    className="h-7 w-7"
                  />
                </div>

                <div className="min-w-0 flex-1 min-h-[220px]">
                  {demoPhase === "loading" ? (
                    <div
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                      className="inline-flex min-h-[56px] items-center self-start rounded-[22px] border border-border/70 bg-card px-4 py-3 shadow-sm"
                    >
                      <span className="sr-only">{t("guestCommon.assistantTyping")}</span>
                      <div className="inline-flex items-center gap-2">
                        {[0, 1, 2].map((index) => (
                          <span
                            key={index}
                            aria-hidden="true"
                            className="h-2.5 w-2.5 rounded-full bg-muted-foreground/45 animate-pulse"
                            style={{ animationDelay: `${index * 180}ms`, animationDuration: "1.1s" }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : demoPhase === "answer" ? (
                    <div className="flex min-h-[220px] flex-col rounded-[24px] border border-border/70 bg-card p-4 shadow-sm">
                      <p className="mb-3 text-sm leading-6 text-foreground">
                        {t("heroChatDemo.answerIntro")}
                      </p>

                      <div className="flex flex-1 flex-col gap-2.5">
                        {demoTimeline.map((step, index) => {
                          const isVisible = revealedSteps > index;
                          const isActive = revealedSteps === index + 1;

                          return (
                            <div
                              key={step.title}
                              className={`relative rounded-[18px] border p-4 pl-[3.9rem] transition-all duration-300 ${
                                isVisible
                                  ? isActive
                                    ? "border-primary/25 bg-background shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                                    : "border-border/70 bg-background/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:bg-background/60 dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
                                  : "border-transparent bg-transparent opacity-0"
                              }`}
                              style={{
                                transform: isVisible ? "translateY(0)" : "translateY(8px)",
                              }}
                            >
                              <div className="absolute left-4 top-4 flex items-center">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
                                  {index + 1}
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5">
                                <p className="text-[14px] font-semibold leading-5 text-foreground">
                                  {step.title}
                                </p>
                              </div>

                              <p className="mt-1.5 text-sm leading-[1.45] text-muted-foreground">
                                {step.detail}
                              </p>

                             
                            </div>
                          );
                        })}
                      </div>

                      <p className="mt-3 text-xs leading-5 text-foreground/80">
                        {t("heroChatDemo.answerSummary")}
                      </p>
                    </div>
                  ) : <div aria-hidden="true" className="min-h-[220px]" />}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/60 bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="rounded-[24px] border border-border/80 bg-card p-2.5 shadow-sm">
            <div className="flex items-end gap-3">
              <div className="min-h-[24px] flex-1 py-1 text-sm leading-6 text-muted-foreground">
                {demoTypedQuestion || t("guestChatInput.askQuestionPlaceholder")}
              </div>
              <Button asChild variant="primary" >
                <Link to="/ask">
                  {t("heroChatDemo.tryItYourself")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
