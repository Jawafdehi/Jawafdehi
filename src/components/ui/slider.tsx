import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

type ThumbProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Thumb>;

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    /** Per-thumb props, indexed to match `value` — e.g. a label per handle. */
    thumbProps?: ThumbProps[];
  }
>(({ className, thumbProps, ...props }, ref) => {
  // One thumb per value, so the same primitive serves a single-value slider and
  // a two-thumb range. Radix drives thumb count off `value`/`defaultValue`
  // length; rendering a fixed single Thumb silently loses the second handle.
  const values = props.value ?? props.defaultValue ?? [0];

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          // 20px is under the 44px touch target this codebase holds itself to,
          // so the hit area is widened with a padded ::before rather than by
          // growing the visible handle (which would swamp a 250px sidebar).
          className="relative block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors before:absolute before:-inset-3 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          {...thumbProps?.[index]}
        />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
