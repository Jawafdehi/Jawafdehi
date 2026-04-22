import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/utils/analytics";

export const LanguageToggle = () => {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language?.startsWith("en") ? "en" : "ne";
  const nextLanguage = currentLanguage === "en" ? "ne" : "en";
  const nextLanguageLabel = nextLanguage === "en" ? t("common.english") : t("common.nepali");

  const handleLanguageChange = async (lang: "en" | "ne") => {
    if (lang === currentLanguage) {
      return;
    }

    try {
      await i18n.changeLanguage(lang);
      trackEvent('language_switch', { from_lang: currentLanguage, to_lang: lang });
    } catch (error) {
      console.error("[LanguageToggle] Failed to change language", error);
    }
    // Language preference is automatically persisted via localStorage by i18next-browser-languagedetector
  };

  return (
    <button
      type="button"
      onClick={() => handleLanguageChange(nextLanguage)}
      aria-label={`${t("common.changeLanguage")}: ${nextLanguageLabel}`}
      title={`${t("common.changeLanguage")}: ${nextLanguageLabel}`}
      className="relative inline-flex h-8 w-[78px] items-center rounded-full border border-primary/40 bg-background px-1 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 h-6 w-8 -translate-y-1/2 rounded-full bg-primary/85 shadow-sm transition-transform duration-200",
          currentLanguage === "en" ? "translate-x-0" : "translate-x-8",
        )}
      />
      <span className="relative z-10 grid w-full grid-cols-2 items-center">
        <span
          className={cn(
            "text-center text-[11px] tracking-wide transition-colors",
            currentLanguage === "en" ? "text-primary-foreground" : "text-muted-foreground",
          )}
        >
          EN
        </span>
        <span
          className={cn(
            "text-center text-[11px] tracking-wide transition-colors",
            currentLanguage === "ne" ? "text-primary-foreground" : "text-muted-foreground",
          )}
        >
          ने
        </span>
      </span>
    </button>
  );
};
