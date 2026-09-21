import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/utils/analytics";

type LanguageToggleProps = {
  quiet?: boolean;
  /** Sitting on a dark (navy) surface — e.g. the transparent header over the
   * home hero stage. Flips the labels and thumb to light-on-dark. */
  onDark?: boolean;
};

export const LanguageToggle = ({ quiet = false, onDark = false }: LanguageToggleProps) => {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language?.startsWith("en") ? "en" : "ne";
  const nextLanguage = currentLanguage === "en" ? "ne" : "en";
  const nextLanguageLabel = nextLanguage === "en" ? t("common.english") : t("common.nepali");

  const handleLanguageChange = async (lang: "en" | "ne") => {
    if (lang === currentLanguage) {
      return;
    }

    const updateLanguage = async () => {
      try {
        await i18n.changeLanguage(lang);
        trackEvent("language_switch", { from_lang: currentLanguage, to_lang: lang });
      } catch (error) {
        console.error("[LanguageToggle] Failed to change language", error);
      }
    };

    if (!document.startViewTransition) {
      await updateLanguage();
    } else {
      document.startViewTransition(async () => {
        await updateLanguage();
      });
    }
    // Language preference is persisted to localStorage by the languageChanged handler in src/i18n/config.ts.
  };

  return (
    <button
      type="button"
      onClick={() => handleLanguageChange(nextLanguage)}
      role="switch"
      aria-checked={currentLanguage === "en"}
      aria-label={`${t("common.changeLanguage")}: ${nextLanguageLabel}`}
      title={`${t("common.changeLanguage")}: ${nextLanguageLabel}`}
      className={cn(
        "relative inline-flex h-9 w-[76px] shrink-0 items-center overflow-hidden rounded-full border px-1 text-sm font-semibold leading-none text-foreground transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        quiet
          ? "border-transparent bg-transparent shadow-none hover:border-transparent hover:bg-secondary/30 hover:shadow-none"
          : "border-border/70 bg-background/70 shadow-sm shadow-foreground/5 hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-background hover:shadow-md",
        onDark && "text-primary-foreground hover:bg-primary-foreground/10",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1 top-1/2 h-7 w-[calc(50%-4px)] -translate-y-1/2 rounded-full bg-foreground shadow-sm transition-transform duration-200 motion-reduce:transition-none",
          currentLanguage === "en" ? "translate-x-0" : "translate-x-full",
          onDark && "bg-primary-foreground",
        )}
      />
      <span className="relative z-10 grid h-full w-full grid-cols-2 items-center">
        <span
          className={cn(
            "grid h-full place-items-center text-center text-xs font-bold leading-none transition-colors",
            currentLanguage === "en" ? "text-background" : "text-muted-foreground",
            onDark && (currentLanguage === "en" ? "text-primary" : "text-primary-foreground/65"),
          )}
        >
          EN
        </span>
        <span
          className={cn(
            "grid h-full place-items-center text-center text-xs font-bold leading-none transition-colors",
            currentLanguage === "ne" ? "text-background" : "text-muted-foreground",
            onDark && (currentLanguage === "ne" ? "text-primary" : "text-primary-foreground/65"),
          )}
        >
          ने
        </span>
      </span>
    </button>
  );
};
