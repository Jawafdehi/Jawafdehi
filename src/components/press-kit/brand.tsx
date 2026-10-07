import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { PRESS_KIT_COLOURS, PRESS_KIT_TYPEFACES } from "./constants";

function ColourSwatch({ hex, label }: Readonly<{ hex: string; label: string }>) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Clear on unmount so a copy just before navigation can't set state on a
  // component that is already gone.
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard is unavailable over plain HTTP and in some locked-down
      // browsers. The hex is visible as text, so copying by hand still works.
    }
  }, [hex]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      {/* Inset ring so the warm-white #FAFAF7 swatch stays visible on a white card. */}
      <div
        className="h-20 w-full ring-1 ring-inset ring-black/10"
        style={{ backgroundColor: hex }}
        aria-hidden="true"
      />

      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-primary">{label}</p>
          <p className="font-mono text-xs text-muted-foreground">{hex}</p>
        </div>

        <button
          type="button"
          onClick={copy}
          aria-label={`${label} ${hex}`}
          className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {copied ? (
            <Check className="h-4 w-4 text-accent" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      <span aria-live="polite" className="sr-only">
        {copied ? t("pressKit.colours.copied") : ""}
      </span>
    </div>
  );
}

export function PressKitBrand() {
  const { t } = useTranslation();

  return (
    <section id="brand" className="bg-muted/10 py-12 md:py-16">
      <div className="layout-container">
        <h2 className="mb-3 text-center text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
          {t("pressKit.colours.title")}
        </h2>
        <p className="mx-auto mb-8 max-w-3xl text-center font-paragraph font-paragraph-foreground">
          {t("pressKit.colours.intro")}
        </p>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PRESS_KIT_COLOURS.map((colour) => (
            <ColourSwatch
              key={colour.hex}
              hex={colour.hex}
              label={t(`pressKit.colours.${colour.key}`)}
            />
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-muted-foreground">
          {t("pressKit.colours.note")}
        </p>

        <h2 className="mb-8 mt-14 text-center text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
          {t("pressKit.type.title")}
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {PRESS_KIT_TYPEFACES.map((face) => (
            <div
              key={face.name}
              className="rounded-lg border border-border bg-background p-5"
            >
              <p className={`${face.className} text-2xl text-primary`}>{face.sample}</p>
              <p className="mt-3 font-bold text-primary">{face.name}</p>
              <p className="text-sm text-muted-foreground">
                {t(`pressKit.type.${face.key}`)}
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-muted-foreground">
          {t("pressKit.type.note")}
        </p>
      </div>
    </section>
  );
}
