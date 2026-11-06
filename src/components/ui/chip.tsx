// The rounded filter / switcher pill. One size everywhere it appears: the
// /whats-new tag filter and the /mcp client tabs. A chip is "on" either through
// `active` (a plain button) or through Radix's data-state="active" (a
// TabsTrigger), so both read the same.
import { cva } from "class-variance-authority";

export const chipVariants = cva(
  [
    "inline-flex items-center rounded-full border px-3.5 py-1 text-sm font-normal transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    "border-border text-foreground/75 hover:border-primary-surface/40 hover:text-foreground",
    "data-[state=active]:border-primary-surface data-[state=active]:bg-primary-surface data-[state=active]:text-primary-foreground data-[state=active]:shadow-none data-[state=active]:hover:border-primary-surface data-[state=active]:hover:text-primary-foreground",
  ],
  {
    variants: {
      active: {
        true: "border-primary-surface bg-primary-surface text-primary-foreground hover:border-primary-surface hover:text-primary-foreground",
        false: "",
      },
    },
    defaultVariants: { active: false },
  },
);
