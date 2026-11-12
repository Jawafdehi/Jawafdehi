import { Check, Copy } from "@/components/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { PRESS_KIT_COLOURS, PRESS_KIT_TYPEFACES } from "./constants";

function ColourSwatch({
  hex,
  swatch,
  label,
}: Readonly<{ hex: string; swatch: string; label: string }>) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Clear on unmount so a copy just before navigation can't set state on a
  // component that is already gone.
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    // Clipboard access is unavailable over plain HTTP and in some locked-down
    // browsers. Say so rather than appearing to do nothing — the hex is on
    // screen, so selecting it by hand still works.
    let next: "copied" | "failed" = "copied";
    try {
      await navigator.clipboard.writeText(hex);
    } catch {
      next = "failed";
    }
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), next === "copied" ? 1600 : 4000);
  }, [hex]);

  const copied = status === "copied";
  const failed = status === "failed";

  return (
    <div className="overflow-hidden rounded-[22px] border border-border/70 bg-surface">
      {/* Painted from the live token, so the sample is always the colour the
          site actually renders. The inset ring keeps the warm-white swatch
          visible against a white card. */}
      <div
        className="h-24 w-full ring-1 ring-inset ring-black/10"
        style={{ backgroundColor: swatch }}
        aria-hidden="true"
      />

      <div className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] text-primary">{label}</p>
          <p className="font-mono text-xs text-muted-foreground">{hex}</p>
        </div>

        <button
          type="button"
          onClick={copy}
          aria-label={`${label} ${hex}`}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {copied ? (
            <Check className="h-4 w-4 text-accent" />
          ) : (
            <Copy className={failed ? "h-4 w-4 text-accent" : "h-4 w-4"} />
          )}
        </button>
      </div>

      {failed ? (
        <p className="px-3 pb-3 text-xs text-accent">{t("pressKit.colours.copyFailed")}</p>
      ) : null}

      <span aria-live="polite" className="sr-only">
        {copied ? t("pressKit.colours.copied") : ""}
        {failed ? t("pressKit.colours.copyFailed") : ""}
      </span>
    </div>
  );
}

export function PressKitBrand() {
  const { t } = useTranslation();

  return (
    <section id="brand" className="pt-16 md:pt-24">
      <div className="layout-container">
        <h2 className="font-home-section-title text-primary">{t("pressKit.colours.title")}</h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{t("pressKit.colours.intro")}</p>

        <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PRESS_KIT_COLOURS.map((colour) => (
            <ColourSwatch
              key={colour.hex}
              hex={colour.hex}
              swatch={colour.swatch}
              label={t(`pressKit.colours.${colour.key}`)}
            />
          ))}
        </div>

        <p className="mt-4 max-w-3xl text-sm text-muted-foreground">{t("pressKit.colours.note")}</p>

        <h2 className="font-home-section-title mb-10 mt-16 text-primary md:mt-24">{t("pressKit.type.title")}</h2>

        {/* Four faces since the headline role split per locale, so the 3-col
            grid would leave an orphan: 2 columns from sm, 4 from lg. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRESS_KIT_TYPEFACES.map((face) => {
            // A face is documented either by an explicit family — pinned to
            // the face the caption names, which is all but the mono card — or
            // by a utility class, where the sample is whatever that role
            // currently resolves to. See the note in ./constants.
            const className = "className" in face ? face.className : "";
            const family = "family" in face ? face.family : undefined;
            return (
              <div
                key={face.name}
                className="rounded-[22px] bg-muted p-6"
              >
                <p
                  className={`${className} text-3xl text-primary`}
                  style={family ? { fontFamily: family } : undefined}
                >
                  {face.sample}
                </p>
                <p className="mt-6 text-[17px] text-primary">{face.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t(`pressKit.type.${face.key}`)}
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-4 max-w-3xl text-sm text-muted-foreground">{t("pressKit.type.note")}</p>
      </div>
    </section>
  );
}
