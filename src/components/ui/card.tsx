import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm print-card", className)} {...props} />
));
Card.displayName = "Card";

const TeamCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <Card
      ref={ref}
      className={cn(
        "relative isolate flex flex-col items-center overflow-hidden rounded-2xl border-transparent p-8 text-center shadow-[0_18px_42px_-30px_hsl(var(--foreground)/0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_24px_52px_-32px_hsl(var(--foreground)/0.45)]",
        "before:pointer-events-none before:absolute before:-right-24 before:-top-28 before:z-0 before:h-96 before:w-96 before:rounded-full before:bg-accent before:opacity-0 before:blur-[86px] before:transition-opacity before:duration-300 hover:before:opacity-20",
        "after:pointer-events-none after:absolute after:-bottom-28 after:-left-28 after:z-0 after:h-80 after:w-80 after:rounded-full after:bg-[hsl(var(--primary)/0.45)] after:opacity-0 after:blur-[80px] after:transition-opacity after:duration-300 hover:after:opacity-20",
        "[&>*]:relative [&>*]:z-10",
        className,
      )}
      {...props}
    />
  ),
);
TeamCard.displayName = "TeamCard";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, TeamCard, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
