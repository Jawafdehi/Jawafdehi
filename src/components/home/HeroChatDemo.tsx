import { useEffect, useState } from "react";
import { Clock3, FileSearch, Landmark, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

type DemoPhase = "typing" | "loading" | "answer";

const DEMO_TIMELINE = [
  {
    title: "Complaint registered",
    detail: "A complaint is filed, but most reports are not publicly accessible unless the case escalates.",
    nuance: "What the public sees: usually very little at this stage.",
    visibility: "Low visibility",
    icon: FileSearch,
  },
  {
    title: "CIAA investigates",
    detail: "CIAA collects documents, interviews officials, and may track assets or financial records.",
    nuance: "What can go wrong: investigations can stay confidential for a long time or move slowly.",
    visibility: "Mostly private",
    icon: ShieldCheck,
  },
  {
    title: "Charge sheet filed",
    detail: "If the case is strong enough, CIAA files a formal charge sheet in the Special Court.",
    nuance: "What the public sees: this is usually when the case becomes clearly traceable.",
    visibility: "High visibility",
    icon: Landmark,
  },
  {
    title: "Court process follows",
    detail: "After filing, the case moves through hearings, rulings, appeals, delays, or long pauses.",
    nuance: "What can go wrong: cases may stall for years due to appeals, pressure, or weak evidence.",
    visibility: "Case-by-case",
    icon: Clock3,
  },
] as const;

export function HeroChatDemo() {
  const { t } = useTranslation();
  const [demoTypedQuestion, setDemoTypedQuestion] = useState("");
  const [demoSubmittedQuestion, setDemoSubmittedQuestion] = useState("");
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("typing");
  const [revealedSteps, setRevealedSteps] = useState(0);
  const demoQuestion = t("guestChat.prompts.ciaaProcess");

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
      if (currentStep >= DEMO_TIMELINE.length) {
        clearInterval(revealInterval);
        return;
      }
      setRevealedSteps(currentStep + 1);
    }, 220);

    return () => clearInterval(revealInterval);
  }, [demoPhase]);

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

        <div className="flex h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
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
                    <div className="flex min-h-[220px] flex-col rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.94))] p-4 shadow-sm">
                      <div className="mb-3 rounded-[18px] border border-primary/10 bg-primary/[0.04] px-3.5 py-3">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                          Assistant summary
                        </div>
                        <p className="text-sm font-semibold leading-5 text-foreground">
                          CIAA typically becomes visible to the public during investigation and court filing. Earlier complaint stages are often not publicly documented.
                        </p>
                      </div>

                      <div className="relative flex flex-1 flex-col gap-2.5">
                        <div
                          aria-hidden="true"
                          className="absolute left-[1.05rem] top-3 bottom-3 w-px bg-gradient-to-b from-primary/20 via-primary/12 to-transparent"
                        />
                        {DEMO_TIMELINE.map((step, index) => {
                          const Icon = step.icon;
                          const isVisible = revealedSteps > index;
                          const isActive = revealedSteps === index + 1;

                          return (
                            <div
                              key={step.title}
                              className={`relative rounded-[18px] border p-3.5 pl-12 transition-all duration-300 ${
                                isVisible
                                  ? isActive
                                    ? "border-primary/25 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                                    : "border-border/70 bg-white/88 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                                  : "border-transparent bg-transparent opacity-0"
                              }`}
                              style={{
                                transform: isVisible ? "translateY(0)" : "translateY(8px)",
                              }}
                            >
                              <div className="absolute left-0 top-4 flex items-center">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-sm">
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                              </div>

                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">
                                    Step {index + 1}
                                  </div>
                                  <p className="text-[14px] font-semibold leading-5 text-foreground">
                                    {step.title}
                                  </p>
                                </div>
                                <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                                  {step.visibility}
                                </div>
                              </div>

                              <p className="mt-1.5 text-[11px] leading-[1.45] text-muted-foreground">
                                {step.detail}
                              </p>

                              <p className="mt-1.5 text-[11px] leading-[1.45] text-foreground/70">
                                {step.nuance}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 rounded-[18px] border border-primary/15 bg-primary/[0.045] px-3.5 py-3">
                        <p className="text-xs leading-5 text-foreground/80">
                          In short: the public usually sees the case clearly only once CIAA has investigated enough to file it in court.
                        </p>
                      </div>
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
