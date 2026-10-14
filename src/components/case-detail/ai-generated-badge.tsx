import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HOVER_CLOSE_DELAY_MS = 150;

/**
 * The "AI-generated" label on a case section heading. A popover rather than a
 * tooltip so the explanation opens on tap as well as hover: touch screens have
 * no hover, and the explanation carries a link a tooltip could not hold.
 */
export function AiGeneratedBadge({ className }: Readonly<{ className?: string }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // True while the popover is open only because a mouse is over it; a click
  // then pins it open instead of toggling it shut.
  const openedByHover = useRef(false);
  // Set as a hover-opened popover closes, so focus is not sent to the trigger.
  const skipCloseFocus = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = () => {
    skipCloseFocus.current = openedByHover.current;
    openedByHover.current = false;
    setOpen(false);
  };

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  useEffect(() => cancelClose, []);

  const onPointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    cancelClose();
    if (!open) {
      openedByHover.current = true;
      setOpen(true);
    }
  };
  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !openedByHover.current) return;
    cancelClose();
    closeTimer.current = setTimeout(close, HOVER_CLOSE_DELAY_MS);
  };

  const label = t("caseDetail.aiGenerated.label");

  return (
    <>
      <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="ai-generated-badge"
            aria-label={`${label}: ${t("caseDetail.aiGenerated.explainLabel")}`}
            className={cn(
              badgeVariants({ variant: "accent" }),
              "cursor-pointer gap-1 align-middle tracking-normal",
              className,
            )}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            onClick={(e) => {
              // preventDefault stops Radix's own toggle, which would close it.
              if (open && openedByHover.current) {
                e.preventDefault();
                cancelClose();
                openedByHover.current = false;
              }
            }}
          >
            <Info aria-hidden="true" className="h-3 w-3" />
            {label}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="space-y-2 text-sm leading-6"
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          // A hover is only a glance: it must not move focus in, or back out.
          onOpenAutoFocus={(e) => {
            if (openedByHover.current) e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            if (skipCloseFocus.current) e.preventDefault();
            skipCloseFocus.current = false;
          }}
        >
          <p>{t("caseDetail.aiGenerated.explanation")}</p>
          <Link
            to="/our-process"
            className="inline-block font-medium text-accent underline underline-offset-4 hover:text-accent/80"
          >
            {t("nav.ourProcess")}
          </Link>
        </PopoverContent>
      </Popover>
      {/* print.css hides every button, so a printout carries the label as text. */}
      <span data-testid="ai-generated-print-label" className="print-ai-label hidden print:inline">
        {label}
      </span>
    </>
  );
}
