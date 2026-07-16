import type { UpdateType } from "../../lib/types";

const UPDATE_TYPE_META: Record<UpdateType, { label: string; bg: string; color: string }> = {
  "update":    { label: "Update",    bg: "var(--surface-2)",        color: "var(--ink-3)"  },
  "heads-up":  { label: "Heads up",  bg: "rgba(245,158,11,.13)",    color: "#B45309"       },
  "blocked":   { label: "Blocked",   bg: "rgba(239,68,68,.13)",     color: "#DC2626"       },
  "win":       { label: "Win",       bg: "rgba(16,185,129,.13)",    color: "#059669"       },
  "executive": { label: "Executive", bg: "rgba(99,102,241,.13)",    color: "#4338CA"       },
};

export function UpdateTypeTag({ type }: { type: UpdateType }) {
  const m = UPDATE_TYPE_META[type];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 99,
      background: m.bg, color: m.color, flexShrink: 0,
    }}>
      {m.label}
    </span>
  );
}

export function UpdateTypePicker({ value, onChange }: { value: UpdateType; onChange: (t: UpdateType) => void }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {(Object.keys(UPDATE_TYPE_META) as UpdateType[]).map((t) => {
        const m = UPDATE_TYPE_META[t];
        const active = value === t;
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            style={{
              fontSize: 11, fontWeight: active ? 600 : 400, padding: "3px 10px", borderRadius: 99,
              border: active ? "none" : "1px solid var(--border)",
              background: active ? m.bg : "transparent",
              color: active ? m.color : "var(--ink-4)",
              cursor: "pointer",
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
