import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  quiet?: boolean;
  /** Lets a host (e.g. the navbar icon group) match this to its neighbours. */
  className?: string;
};

const themeToggleClass = (quiet: boolean, className?: string) =>
  cn(
    "h-10 w-10 rounded-full text-foreground/75 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    quiet
      ? "border border-transparent bg-transparent shadow-none hover:translate-y-0 hover:border-transparent hover:bg-secondary/35 hover:text-foreground hover:shadow-none"
      : "border border-border/70 bg-background/70 shadow-sm shadow-foreground/5 hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-background hover:text-foreground hover:shadow-md",
    className,
  );

export const ThemeToggle = ({ quiet = false, className }: ThemeToggleProps) => {
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const label = t(isDark ? "themeToggle.switchToLight" : "themeToggle.switchToDark");

  if (!mounted) {
    const placeholderLabel = t("themeToggle.toggleTheme");

    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        aria-label={placeholderLabel}
        title={placeholderLabel}
        className={themeToggleClass(quiet, className)}
      >
        <Monitor className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={themeToggleClass(quiet, className)}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
};
