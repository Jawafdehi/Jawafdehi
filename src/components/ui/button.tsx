import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "font-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground font-semibold transition-colors duration-200 hover:bg-primary/85",
        primary:
          "bg-primary text-primary-foreground font-bold transition-colors duration-200 hover:bg-primary/85",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-primary font-bold bg-background text-primary hover:bg-accent hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        navIcon:
          "border border-border/70 bg-background/70 text-foreground/75 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-background hover:text-foreground",
        disclosure:
          "font-semibold text-primary hover:text-primary/75",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        xl: "h-14 px-10 text-base",
        // 40x40 painted, 44x44 tappable. `size="icon"` has 37 call sites and 40 is
        // 4px under the 44 of WCAG 2.5.5 (AAA) and the Apple HIG. Growing the box
        // to h-11 w-11 would be the obvious fix, and it is what navMenuIcon does —
        // but several of these sit beside `h-10` inputs and inside `h-10` rows, so
        // it would nudge layouts nobody can review one by one.
        //
        // What the guidelines actually size is the region that accepts the tap, not
        // the region that gets painted. So the box stays 40 and an empty
        // pseudo-element reaches 2px past every edge. Pointer events on a
        // pseudo-element hit its originating element, so the button gets the tap and
        // nothing moves.
        //
        // `-inset-[2px]`, NOT a fixed 44x44. A fixed size overflows by
        // `(44 - box) / 2` per edge, which GROWS as a call site shrinks the box: 2px
        // at 40, 4px at the `h-9 w-9` in ArchiveSearch, 6px at the `h-8 w-8` in
        // DocumentPreviewDialog. Relative inset makes the overflow a constant 2px at
        // every size, so the clearance a neighbour needs is a constant 4px instead of
        // something you have to recompute per call site. The trade is that a call
        // site which shrinks the box gets box+4 rather than 44 — which is the honest
        // outcome: it opted out of 44 when it overrode the size.
        //
        // Two things to know before reusing this:
        //
        //   * The parent must not clip — an `overflow-hidden` ancestor cuts the
        //     overflowing 2px straight back off.
        //   * Two of these need >=4px of clearance, or one ring covers the other's
        //     PAINTED pixels and a tap on a visible pixel activates the wrong
        //     control. That is not hypothetical: with a fixed 44x44 ring and the two
        //     zero-gap segmented controls in Cases.tsx and ArchiveSearch.tsx, the
        //     last 2px and 4px of the left button activated the right one. Both now
        //     carry `gap-1`, and tests/layout/asset-weight.test.ts asserts the two
        //     containers keep it.
        icon: "relative h-10 w-10 after:absolute after:-inset-[2px] after:content-['']",
        navCta: "font-button h-11 px-4",
        navSheet: "h-11 px-4",
        navMenuIcon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
