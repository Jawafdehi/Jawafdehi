import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * The capsule toggle used for every "pick your tool" choice on the MCP page:
 * the track is a pill and the selected option a lighter tinted pill inside
 * it. Install and Skills both use it so the two choices read as one control.
 *
 * The rail scrolls sideways on a phone rather than wrapping — a capsule that
 * breaks onto a second line stops reading as one control.
 */
export const ToggleList = forwardRef<
  ElementRef<typeof TabsList>,
  ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => (
  <TabsList
    ref={ref}
    className={cn(
      "inline-flex h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-full border border-border bg-background p-0.5 [scrollbar-width:none]",
      className,
    )}
    {...props}
  />
));
ToggleList.displayName = "ToggleList";

export const ToggleTrigger = forwardRef<
  ElementRef<typeof TabsTrigger>,
  ComponentPropsWithoutRef<typeof TabsTrigger>
>(({ className, ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    className={cn(
      "shrink-0 rounded-full px-3 py-1 text-sm font-normal text-muted-foreground shadow-none hover:text-foreground sm:px-4",
      "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
      className,
    )}
    {...props}
  />
));
ToggleTrigger.displayName = "ToggleTrigger";
