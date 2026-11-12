// The rounded switcher pill, one look everywhere it appears: the archive search
// tabs, the /whats-new tag filter, the /mcp client tabs and the /materials
// presets. The chosen pill fills grey; the rest are plain text that take a
// fainter grey on hover — navy and grey only, never the crimson accent. 15px
// regular, the same size as the search page's filter chips.
//
// A chip is "on" either through `active` (a plain button) or through Radix's
// data-state="active" (a TabsTrigger), so both read the same.
import { cva } from "class-variance-authority";

export const chipVariants = cva(
  [
    "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-normal transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "text-muted-foreground hover:bg-muted/60 hover:text-primary",
    "data-[state=active]:bg-muted data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:hover:bg-muted",
  ],
  {
    variants: {
      active: {
        true: "bg-muted text-primary hover:bg-muted",
        false: "",
      },
    },
    defaultVariants: { active: false },
  },
);
