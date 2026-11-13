// DEV ONLY — the "Demo data / Worst case / Empty / One" switch for /search, and
// the case page's "Real case / Worst case / Sparse / One stage" (pass `modes`).
// Plain chrome on purpose: it is not part of the design under test. The choice
// lives in the URL (?data=worst) so a reload keeps it.
import { useSearchParams } from "react-router-dom";

import { STRESS_MODES } from "@/dev/archive-search-stress";

export default function StressToggle({
  modes = STRESS_MODES,
}: Readonly<{ modes?: ReadonlyArray<{ value: string; label: string }> }>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const current = searchParams.get("data") ?? "demo";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: "#e5e7eb",
        font: "12px system-ui, sans-serif",
        boxShadow: "0 1px 3px rgba(0,0,0,.15)",
      }}
    >
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            if (mode.value === "demo") next.delete("data");
            else next.set("data", mode.value);
            setSearchParams(next, { replace: true });
          }}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "5px 12px",
            cursor: "pointer",
            background: current === mode.value ? "#fff" : "transparent",
            color: "#111",
          }}
          type="button"
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
