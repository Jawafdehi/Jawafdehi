import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // The pulse is decorative and can be distracting (or worse) for motion-sensitive
  // users, so it is gated on `prefers-reduced-motion` — same convention the rest of
  // the app uses for its `motion-reduce:` transitions. The block itself still shows,
  // so the placeholder keeps communicating structure either way.
  return (
    <div
      className={cn("animate-pulse motion-reduce:animate-none rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
