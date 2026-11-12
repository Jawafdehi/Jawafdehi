// DEV ONLY — which icon library the dev icon switch has picked. Kept in
// localStorage so a reload keeps the choice; every shimmed icon subscribes.
import { useSyncExternalStore } from "react";

export const ICON_LIBS = [
  { value: "lucide", label: "Lucide (now)" },
  { value: "lucide-thin", label: "Lucide 1.5" },
  { value: "phosphor", label: "Phosphor" },
  { value: "tabler", label: "Tabler" },
  { value: "iconoir", label: "Iconoir" },
  { value: "hugeicons", label: "Hugeicons" },
] as const;
export type IconLib = (typeof ICON_LIBS)[number]["value"];

const KEY = "dev-icon-lib";
const listeners = new Set<() => void>();

function read(): IconLib {
  try {
    const value = localStorage.getItem(KEY);
    return ICON_LIBS.some((lib) => lib.value === value) ? (value as IconLib) : "lucide";
  } catch {
    return "lucide";
  }
}

let current: IconLib = typeof window === "undefined" ? "lucide" : read();

export function setIconLib(next: IconLib) {
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Private windows: the choice lasts until reload.
  }
  listeners.forEach((listener) => listener());
}

export function useIconLib(): IconLib {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => "lucide",
  );
}
