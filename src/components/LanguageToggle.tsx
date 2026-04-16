import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trackEvent } from "@/utils/analytics";

export const LanguageToggle = () => {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language || "ne";

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t("common.changeLanguage")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleLanguageChange("en")}>
          <span className={currentLanguage === "en" ? "font-bold" : ""}>{t("common.english")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLanguageChange("ne")}>
          <span className={currentLanguage === "ne" ? "font-bold" : ""}>{t("common.nepali")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
