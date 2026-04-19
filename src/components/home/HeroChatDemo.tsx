import { useEffect, useState } from "react";
import { Clock3, FileSearch, Landmark, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

type DemoPhase = "typing" | "loading" | "answer";

const DEMO_TIMELINE = [
  { title: "Complaint", detail: "Allegation is reviewed first.", icon: FileSearch },
  { title: "Investigation", detail: "CIAA gathers facts and records.", icon: ShieldCheck },
  { title: "Court filing", detail: "A charge sheet may be filed.", icon: Landmark },
  { title: "After that", detail: "Court progress can move or stall.", icon: Clock3 },
] as const;

export function HeroChatDemo() {
  const { t } = useTranslation();
  const [demoTypedQuestion, setDemoTypedQuestion] = useState("");
  const [demoSubmittedQuestion, setDemoSubmittedQuestion] = useState("");
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("typing");
  const demoQuestion = t("guestChat.prompts.ciaaProcess");

  useEffect(() => {
    let typingInterval: ReturnType<typeof setInterval> | null = null;
    let submitTimeout: ReturnType<typeof setTimeout> | null = null;
    let answerTimeout: ReturnType<typeof setTimeout> | null = null;

    setDemoPhase("typing");
    setDemoSubmittedQuestion("");
    setDemoTypedQuestion("");

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

  return (
    <div className="relative block lg:flex lg:h-full">
      <div className="absolute -top-3 right-0 z-10 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-lg ring-1 ring-primary/10 lg:right-2">
        Demo
      </div>

      <div className="ml-auto flex h-[560px] w-full max-w-[660px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-background/95 shadow-2xl ring-1 ring-white/10 backdrop-blur">
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
                <p className="text-xs font-medium text-muted-foreground">Public case archive</p>
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
              <Link to="/cases">Browse archive</Link>
            </Button>
          </div>
        </div>

        <div className="flex h-0 flex-1 flex-col p-4 md:p-5">
          <div className="flex h-full min-h-0 flex-col gap-3">
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

                <div className="min-w-0 flex-1 min-h-[190px]">
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
                    <div className="flex min-h-[190px] flex-col rounded-[24px] border border-border/70 bg-card p-4 shadow-sm">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-foreground">
                          CIAA usually appears at the investigation and court-filing stage.
                        </p>
                      </div>

                      <div className="grid gap-2 md:grid-cols-4">
                        {DEMO_TIMELINE.map((step, index) => {
                          const Icon = step.icon;

                          return (
                            <div
                              key={step.title}
                              className="rounded-[16px] border border-border/70 bg-gradient-to-br from-background to-muted/30 p-2.5"
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                                  {index + 1}
                                </div>
                              </div>
                              <p className="text-[15px] font-semibold leading-5 text-foreground">{step.title}</p>
                              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                                {step.detail}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 rounded-[18px] border border-primary/15 bg-primary/[0.04] px-3 py-2.5">
                        <p className="text-xs leading-5 text-foreground/80">
                          After CIAA files a case, the public record usually shifts to court hearings, decisions, and case progress.
                        </p>
                      </div>
                    </div>
                  ) : <div aria-hidden="true" className="min-h-[190px]" />}
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
              <Button asChild size="sm" className="h-10 shrink-0 rounded-xl px-4 text-sm font-semibold shadow-sm">
                <Link to="/ask">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Try it yourself
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
