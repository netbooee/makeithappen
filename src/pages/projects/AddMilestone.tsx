import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "../../store/store";
import { DateInput } from "../../components/ui";

export function AddMilestone({ projectId, onAdded }: { projectId: string; onAdded: (id: string) => void }) {
  const { addMilestone } = useStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    const id = "m" + Date.now();
    addMilestone(projectId, { id, title: title.trim(), start: start.trim() || undefined, due: due.trim() || "No date", status: "active", subtasks: [] });
    onAdded(id);
    setTitle("");
    setStart("");
    setDue("");
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
        <Plus size={14} /> Add milestone / workstream
      </button>
    );
  }
  return (
    <div className="card" style={{ padding: "13px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
      <input
        className="input"
        autoFocus
        placeholder="Title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <DateInput value={start} onChange={setStart} style={{ width: 140, fontSize: 12.5 }} />
        <span style={{ fontSize: 12, color: "var(--ink-4)" }}>→</span>
        <DateInput value={due} onChange={setDue} style={{ width: 140, fontSize: 12.5 }} />
        <button className="btn btn-primary" style={{ fontSize: 12.5 }} onClick={submit}>Add</button>
        <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </div>
  );
}
