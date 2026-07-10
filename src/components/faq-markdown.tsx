import type { Components } from "react-markdown";

import { cn } from "@/lib/utils";

// Shared react-markdown renderers for FAQ answers, used by both the FAQ landing
// sections (FaqSection) and the dedicated FAQ page (FaqPage) so the two render
// answer prose identically.
export const faqMarkdownComponents: Components = {
  p: ({ className, node: _node, ...props }) => (
    <p className={cn("mb-3 last:mb-0", className)} {...props} />
  ),
  ul: ({ className, node: _node, ...props }) => (
    <ul className={cn("my-3 list-disc space-y-2 pl-5", className)} {...props} />
  ),
  ol: ({ className, node: _node, ...props }) => (
    <ol className={cn("my-3 list-decimal space-y-2 pl-5", className)} {...props} />
  ),
  li: ({ className, node: _node, ...props }) => (
    <li className={cn("pl-1", className)} {...props} />
  ),
  strong: ({ className, node: _node, ...props }) => (
    <strong className={cn("font-medium text-foreground", className)} {...props} />
  ),
  a: ({ className, node: _node, ...props }) => (
    <a
      className={cn("font-medium text-primary underline-offset-4 hover:underline", className)}
      {...props}
    />
  ),
};
