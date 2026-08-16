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
        // What the guidelines actually size is the region that accepts the tap,
        // not the region that gets painted. So the box stays 40 and an empty
        // pseudo-element, centred and 44x44, carries the extra 2px on each edge.
        // Pointer events on a pseudo-element hit its originating element, so the
        // button gets the tap and nothing moves.
        //
        // Two things to know before reusing this: the parent must not clip (an
        // `overflow-hidden` ancestor cuts the overflowing 2px back off), and two
        // of these need >=4px between them or the 44px regions overlap and the
        // boundary between them stops being predictable. Everywhere this is used
        // today has `gap-2` or more.
        icon: "relative h-10 w-10 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
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
