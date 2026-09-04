import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "../../store/store";
import { DateInput } from "../../components/ui";
import { CONTEXTS } from "../../lib/constants";

export function AddProjectTaskRow({ projectTitle }: { projectTitle: string }) {
  const { addTask, workspace } = useStore();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [due, setDue] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    addTask({
      id: "t" + Date.now(),
      text: text.trim(),
      done: false,
      next: false,
      context: CONTEXTS[workspace][0],
      project: projectTitle,
      ...(due ? { due } : {}),
    });
    setText("");
    setDue("");
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        className="task-row"
        style={{ width: "100%", color: "var(--ink-4)", fontSize: 13, gap: 11 }}
        onClick={() => setEditing(true)}
      >
        <span style={{ width: 18, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Plus size={13} />
        </span>
        Add task to project
      </button>
    );
  }

  return (
    <div className="task-row" style={{ gap: 8, flexWrap: "wrap" }}>
      <input
        className="input"
        autoFocus
        placeholder="Task…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setEditing(false);
        }}
        style={{ flex: 1, padding: "5px 9px", fontSize: 13, minWidth: 160 }}
      />
      <DateInput value={due} onChange={setDue} style={{ width: 90, fontSize: 12.5 }} />
      <button className="btn btn-primary" style={{ padding: "5px 11px", fontSize: 12 }} onClick={submit}>Add</button>
      <button className="btn btn-ghost" style={{ padding: "5px 11px", fontSize: 12 }} onClick={() => setEditing(false)}>Cancel</button>
    </div>
  );
}
