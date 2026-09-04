import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { useStore } from "../../store/store";
import { parseMilestonePaste } from "../../lib/parseMilestonePaste";

const PLACEHOLDER = `Discovery & Planning
- Interview stakeholders
- Draft requirements doc
Design & Build
- Wireframes
- Build v1`;

export function PasteMilestones({ projectId, onAdded }: { projectId: string; onAdded: (ids: string[]) => void }) {
  const { addMilestone, addSubtask } = useStore();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  const parsed = useMemo(() => parseMilestonePaste(text), [text]);
  const taskCount = useMemo(() => parsed.reduce((n, m) => n + m.tasks.length, 0), [parsed]);

  const submit = () => {
    if (parsed.length === 0) return;
    const ids = parsed.map((_, i) => "m" + Date.now() + "-" + i);
    parsed.forEach((m, i) => {
      const id = ids[i];
      addMilestone(projectId, { id, title: m.title, due: "No date", status: "active", subtasks: [] });
      for (const task of m.tasks) addSubtask(projectId, id, task);
    });
    onAdded(ids);
    setText("");
    setEditing(false);
  };

  const cancel = () => {
    setText("");
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        className="card"
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "13px 16px",
          color: "var(--ink-3)", fontSize: 13.5, fontWeight: 500, width: "100%",
          borderStyle: "dashed", boxShadow: "none", background: "transparent", cursor: "pointer",
        }}
        onClick={() => setEditing(true)}
      >
        <ClipboardList size={14} /> Paste milestones
      </button>
    );
  }

  return (
    <div className="card" style={{ padding: "13px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
      <textarea
        className="input mono"
        autoFocus
        rows={10}
        placeholder={PLACEHOLDER}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
        }}
        style={{ resize: "vertical", fontSize: 12.5, lineHeight: 1.5 }}
      />

      {parsed.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--ink-4)" }}>Nothing detected yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            {parsed.length} milestone{parsed.length === 1 ? "" : "s"}, {taskCount} task{taskCount === 1 ? "" : "s"} detected
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
            {parsed.map((m, i) => (
              <div key={i}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
                {m.tasks.map((t, j) => (
                  <div key={j} style={{ fontSize: 12, color: "var(--ink-3)", marginLeft: 14 }}>{t}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-primary" style={{ fontSize: 12.5 }} disabled={parsed.length === 0} onClick={submit}>
          Add {parsed.length} milestone{parsed.length === 1 ? "" : "s"}
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={cancel}>Cancel</button>
      </div>
    </div>
  );
}
