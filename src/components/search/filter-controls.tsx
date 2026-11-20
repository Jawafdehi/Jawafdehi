// The parts every archive filter is built from, so the groups read as one
// control whichever tab is open: a list of rows, each a 40px rounded line with
// a 16px marker on the left and its label at 15px. Single-choice groups (the
// amount and date presets) mark with a dot, multi-choice ones with a box; a
// "Custom range" or "Show all" row sits in the same list with a chevron where
// the marker would be. Typed bounds open beneath as hairline fields.
import { Check, ChevronDown } from "@/components/icons";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const ROW =
  "flex min-h-10 w-full items-center gap-3 rounded-xl px-2.5 text-left text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** The rows of one group, bled to the panel edge so the hover fill does. */
export function OptionList({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="-mx-2.5 flex flex-col">{children}</div>;
}

/** The marker a row leads with. */
export function OptionMarker({
  checked,
  shape,
}: Readonly<{ checked: boolean; shape: "radio" | "box" }>) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center border transition-colors",
        shape === "radio" ? "rounded-full" : "rounded-[5px]",
        checked
          ? "border-primary-surface bg-primary-surface text-primary-foreground"
          : "border-border bg-surface",
      )}
    >
      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </span>
  );
}

/** Text colour and hover of a row, by whether it is chosen. */
function optionRowClass(selected: boolean, className?: string) {
  return cn(
    ROW,
    selected ? "text-primary" : "text-primary/80 hover:bg-muted hover:text-primary",
    className,
  );
}

/** A single-choice row: one preset of a range. Choosing it again clears it. */
export function RadioRow({
  checked,
  onClick,
  children,
}: Readonly<{ checked: boolean; onClick: () => void; children: ReactNode }>) {
  return (
    <button aria-pressed={checked} className={optionRowClass(checked)} onClick={onClick} type="button">
      <OptionMarker checked={checked} shape="radio" />
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

/**
 * A row that opens or reveals more — "Custom range", "Show all 77". The
 * chevron takes the marker's column so the label lines up with the options.
 */
export function DisclosureRow({
  open,
  onClick,
  marker,
  children,
}: Readonly<{
  open: boolean;
  onClick: () => void;
  /** A marker of its own (Custom range's dot); the chevron then moves right. */
  marker?: ReactNode;
  children: ReactNode;
}>) {
  const chevron = (
    <ChevronDown
      aria-hidden="true"
      className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
    />
  );
  return (
    <button aria-expanded={open} className={optionRowClass(false)} onClick={onClick} type="button">
      {marker ?? chevron}
      <span className="min-w-0 flex-1">{children}</span>
      {marker ? chevron : null}
    </button>
  );
}

/** A typed bound beneath a "Custom range" row: a label over a hairline field. */
export function RangeField({
  id,
  label,
  className,
  ...input
}: Readonly<{ id: string; label: string } & ComponentProps<"input">>) {
  return (
    <div className="min-w-0 flex-1">
      <label className="mb-1 block text-[13px] text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      {/*
        `font-input` (16px on touch, 14px with a real pointer): a sub-16px field
        zooms the page on iOS when focused. Focus is the search bar's soft navy
        halo, not a hard ring.
      */}
      <input
        className={cn(
          "font-input h-10 w-full min-w-0 rounded-xl border border-border bg-surface px-3 tabular-nums text-foreground transition-[border-color,box-shadow] focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/[0.07]",
          className,
        )}
        id={id}
        {...input}
      />
    </div>
  );
}
