import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FaDiscord } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CtaProps = {
  className?: string;
};

export function Cta({ className }: Readonly<CtaProps>) {
  const { t } = useTranslation();
  return (
    <section
      id="contribute"
      className={cn(
        "container mx-auto border-b border-border bg-background py-14 md:py-18 lg:py-20",
        className,
      )}
      aria-labelledby="contribute-title"
    >
      <div className="relative isolate overflow-hidden rounded-lg bg-[linear-gradient(135deg,hsl(var(--primary-surface))_0%,hsl(var(--primary-surface))_34%,hsl(var(--accent))_100%)] px-6 py-10 shadow-xl shadow-accent/10 dark:bg-[linear-gradient(135deg,hsl(215_70%_12%)_0%,hsl(220_38%_18%)_42%,hsl(354_66%_37%)_100%)] sm:px-10 md:px-12 md:py-12">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full bg-secondary/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_20%,hsl(var(--secondary)/0.24),transparent_34%),linear-gradient(135deg,hsl(var(--primary-surface)/0.3)_0%,transparent_48%,hsl(var(--accent)/0.2)_100%)]"
        />

        <div className="flex max-w-3xl flex-col items-start">

          <h2
            id="contribute-title"
            className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-normal text-white md:text-4xl"
          >
            {t("cta.title")}
          </h2>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/90 md:text-base">
            {t("cta.description")}
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              asChild
              variant="primary"
              size="lg"
              className="bg-white text-primary shadow-lg shadow-black/10 hover:bg-white/90 dark:bg-white dark:text-primary-surface dark:hover:bg-white/90"
            >
              <a
                href="https://discord.gg/jawafdehi"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaDiscord className="mr-2 h-5 w-5 text-[#5865F2]" aria-hidden="true" />
                {t("cta.discord")}
              </a>
            </Button>

            <Button
              asChild
              variant="secondary"
              size="lg"
              className="border border-white/20 bg-white/10 text-white hover:bg-white/18 hover:text-white dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/18"
            >
              <a href="mailto:report@jawafdehi.org">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {t("cta.email")}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
