// One look for everything that floats over the page — the sort menu, dropdown
// menus, filter popovers, the command list — so none of them reads as a
// browser default dropped onto the redesign. White on a hairline, a 16px
// radius, one soft navy shadow; items are rounded rows that fill grey when
// pointed at, never the crimson accent.

/** The floating panel itself. */
export const OVERLAY_SURFACE =
  "rounded-2xl border border-border/70 bg-popover text-popover-foreground shadow-[0_18px_40px_-24px_rgba(14,31,59,0.35)]";

/** A row in a menu or list inside that panel. */
export const MENU_ITEM =
  "relative flex cursor-default select-none items-center gap-2 rounded-xl px-3 py-2 text-[15px] text-primary/85 outline-none transition-colors focus:bg-muted focus:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

/** A menu's small section label. */
export const MENU_LABEL = "px-3 pb-1 pt-2 text-xs font-normal text-muted-foreground";
