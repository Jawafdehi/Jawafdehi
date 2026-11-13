import * as React from "react";
import { Search, X } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchBarProps = React.ComponentProps<typeof Input> & {
  buttonClassName?: string;
  inputClassName?: string;
  submitLabel?: string;
  submitText?: string;
  /**
   * Whether to render the submit button. Default true.
   *
   * `false` is for a LIVE filter — one that narrows a list as you type and has
   * nothing to submit. A button there is a control that does nothing, and the
   * input keeps the right-hand padding that was only ever there to clear it.
   */
  showSubmit?: boolean;
  /**
   * Clears the field. When given, a quiet × appears while there is text — the
   * one control a bare search field still earns on its right edge.
   */
  onClear?: () => void;
  clearLabel?: string;
};

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      buttonClassName,
      className,
      inputClassName,
      submitLabel = "Search",
      submitText,
      showSubmit = true,
      onClear,
      clearLabel = "Clear search",
      ...props
    },
    ref,
  ) => {
    const hasSubmitText = Boolean(submitText);
    const showClear = Boolean(onClear) && String(props.value ?? "").length > 0;

    return (
      <div className={cn("relative w-full", className)}>
        <Input
          ref={ref}
          className={cn(
            // 40px, down from 48. The bar is a control, not a banner, and at
            // h-12 it was taller than every button beside it. py-0: with the
            // Input's py-2 the text box is taller than the line, and the text
            // sat at its top; with no padding the browser centres it.
            // A white pill on a hairline border, the redesign's input shape;
            // focus shows as a soft navy halo rather than a hard outline
            // (never the crimson accent, which reads as an error).
            "h-10 rounded-full border-border bg-surface py-0 pl-5 text-base text-ellipsis shadow-[0_1px_2px_rgba(14,31,59,0.05)] transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 hover:border-primary/25 focus-visible:border-primary/40 focus-visible:ring-4 focus-visible:ring-primary/[0.07] focus-visible:ring-offset-0",
            // The magnifier sits on the RIGHT edge, where the eye ends the
            // query, so the right padding clears it (or the × in its place).
            !showSubmit ? "pr-11" : hasSubmitText ? "pr-36 sm:pr-44" : "pr-12",
            inputClassName,
          )}
          {...props}
        />
        {showSubmit ? (
          <Button
            aria-label={submitLabel}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-transparent text-muted-foreground shadow-none hover:bg-muted hover:text-primary",
              hasSubmitText ? "h-8 px-4 sm:min-w-[9rem]" : "h-8 w-8 p-0",
              buttonClassName,
            )}
            type="submit"
          >
            {submitText || <Search aria-hidden="true" className="h-[18px] w-[18px]" />}
          </Button>
        ) : null}
        {/* The magnifier and the × share one slot: the × takes its place
            while there is text to clear, so the two never sit side by side. */}
        {!showSubmit && !showClear ? (
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
          />
        ) : null}
        {!showSubmit && showClear ? (
          <button
            aria-label={clearLabel}
            className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onClear}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    );
  },
);
SearchBar.displayName = "SearchBar";

export { SearchBar };
