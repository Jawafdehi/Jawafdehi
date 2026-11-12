// DEV ONLY — the icon-library switch. Plain chrome on purpose, like the /search
// stress switch: it is not part of the design under test.
import { ICON_LIBS, setIconLib, useIconLib } from "@/dev/icon-lib-store";

export default function IconLibToggle() {
  const current = useIconLib();
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: "#e5e7eb",
        font: "12px system-ui, sans-serif",
        boxShadow: "0 1px 3px rgba(0,0,0,.15)",
      }}
    >
      <span style={{ padding: "4px 8px", color: "#6b7280" }}>Icons</span>
      {ICON_LIBS.map((lib) => (
        <button
          key={lib.value}
          type="button"
          onClick={() => setIconLib(lib.value)}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "4px 10px",
            cursor: "pointer",
            background: current === lib.value ? "#fff" : "transparent",
            color: current === lib.value ? "#111827" : "#4b5563",
          }}
        >
          {lib.label}
        </button>
      ))}
    </div>
  );
}
