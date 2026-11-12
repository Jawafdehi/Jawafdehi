import * as React from "react";
import { ArrowRight, Search } from "lucide-react";

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
      ...props
    },
    ref,
  ) => {
    const hasSubmitText = Boolean(submitText);

    return (
      <div className={cn("relative w-full", className)}>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={ref}
          className={cn(
            // 40px, down from 48. The bar is a control, not a banner, and at
            // h-12 it was taller than every button beside it. py-0: with the
            // Input's py-2 the text box is taller than the line, and the text
            // sat at its top; with no padding the browser centres it.
            // A white pill on a hairline border, the redesign's input shape;
            // focus shows as a soft accent ring rather than a hard outline.
            "h-10 rounded-full border-border/70 bg-surface py-0 pl-11 text-base shadow-none transition-colors placeholder:text-muted-foreground/80 hover:border-border focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:ring-offset-0",
            !showSubmit ? "pr-4" : hasSubmitText ? "pr-36 sm:pr-44" : "pr-12",
            inputClassName,
          )}
          {...props}
        />
        {showSubmit ? (
          <Button
            aria-label={submitLabel}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-primary-surface text-primary-foreground hover:bg-primary-surface/90",
              hasSubmitText ? "h-8 px-4 sm:min-w-[9rem]" : "h-8 w-8 p-0",
              buttonClassName,
            )}
            type="submit"
          >
            {submitText || <ArrowRight aria-hidden="true" className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>
    );
  },
);
SearchBar.displayName = "SearchBar";

export { SearchBar };
