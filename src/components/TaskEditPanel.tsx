import { useEffect } from "react";
import { ListTodo, Trash2, X } from "lucide-react";
import { useStore } from "../store/store";
import { DateInput } from "./ui";
import type { Task, TaskGroup } from "../lib/types";

const GROUPS: { key: TaskGroup; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "someday", label: "Someday" },
];

export function TaskEditPanel({ taskId, close }: { taskId: string; close: () => void }) {
  const { data, updateTask, moveTask, deleteTask } = useStore();

  let task: Task | undefined;
  let group: TaskGroup = "today";
  for (const [g, list] of [
    ["today", data.todayTasks], ["upcoming", data.upcoming], ["someday", data.someday],
  ] as [TaskGroup, Task[]][]) {
    const found = list.find((t) => t.id === taskId);
    if (found) { task = found; group = g; break; }
  }

  useEffect(() => { if (!task) close(); }, [task, close]);
  if (!task) return null;

  const set = (patch: Partial<Task>) => updateTask(task!.id, patch);
  const flow = task.state ?? "normal";
  const setFlow = (f: "normal" | "delegated" | "waiting") => {
    if (f === "normal") set({ state: undefined, to: undefined, waitFor: undefined });
    else if (f === "delegated") set({ state: "delegated", waitFor: undefined, next: false });
    else set({ state: "waiting", to: undefined, next: false });
  };

  return (
    <div className="overlay">
      <div className="overlay-bg" onClick={close} />
      <div className="side-panel">
        <div className="side-panel-head">
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
            <ListTodo size={15} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Edit task</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Changes save automatically</div>
          </div>
          <button className="icon-btn" onClick={close}><X /></button>
        </div>

        <div className="side-panel-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Task</label>
            <input className="input" value={task.text} onChange={(e) => set({ text: e.target.value })} style={{ fontWeight: 500 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">List</label>
            <div className="segmented" style={{ display: "flex" }}>
              {GROUPS.map((g) => (
                <button
                  key={g.key}
                  className={group === g.key ? "active" : ""}
                  style={{ flex: 1 }}
                  onClick={() => moveTask(task!.id, g.key)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Project</label>
            <select
              className="input"
              value={task.project ?? ""}
              onChange={(e) => set({ project: e.target.value || null, milestoneId: undefined })}
            >
              <option value="">No project</option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.title}>{p.title}</option>
              ))}
            </select>
          </div>

          {(() => {
            const proj = task.project
              ? data.projects.find((p) => p.title === task.project)
              : null;
            if (!proj || proj.milestones.length === 0) return null;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="field-label">Milestone / Workstream</label>
                <select
                  className="input"
                  value={task.milestoneId ?? ""}
                  onChange={(e) => set({ milestoneId: e.target.value || undefined })}
                >
                  <option value="">No milestone</option>
                  {proj.milestones.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
            );
          })()}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Due</label>
            <DateInput value={task.due} onChange={(v) => set({ due: v || undefined })} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Reminder</label>
            <input className="input" placeholder="e.g. 9:00 AM" value={task.reminder ?? ""} onChange={(e) => set({ reminder: e.target.value || undefined })} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Status</label>
            <div className="segmented" style={{ display: "flex" }}>
              {(["normal", "delegated", "waiting"] as const).map((f) => (
                <button key={f} className={flow === f ? "active" : ""} style={{ flex: 1, textTransform: "capitalize" }} onClick={() => setFlow(f)}>
                  {f}
                </button>
              ))}
            </div>
            {task.state === "delegated" && (
              <input className="input" placeholder="Delegated to…" value={task.to ?? ""} onChange={(e) => set({ to: e.target.value })} />
            )}
            {task.state === "waiting" && (
              <input className="input" placeholder="Waiting for…" value={task.waitFor ?? ""} onChange={(e) => set({ waitFor: e.target.value })} />
            )}
          </div>

          <div className="tweak-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 550, color: "var(--ink)" }}>Next action</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Flags this as the next step</div>
            </div>
            <button
              className={"switch" + (task.next ? " on" : "")}
              role="switch"
              aria-checked={!!task.next}
              onClick={() => set({ next: !task!.next, ...(task!.next ? {} : { state: undefined, to: undefined, waitFor: undefined }) })}
            />
          </div>

          <div className="tweak-row">
            <div style={{ fontSize: 13.5, fontWeight: 550, color: "var(--ink)" }}>Completed</div>
            <button
              className={"switch" + (task.done ? " on" : "")}
              role="switch"
              aria-checked={task.done}
              onClick={() => set({ done: !task!.done })}
            />
          </div>
        </div>

        <div className="side-panel-foot">
          <button
            className="btn btn-ghost"
            style={{ color: "var(--danger)", borderColor: "color-mix(in oklab, var(--danger) 30%, transparent)" }}
            onClick={() => { deleteTask(task!.id); close(); }}
          >
            <Trash2 /> Delete
          </button>
          <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={close}>Done</button>
        </div>
      </div>
    </div>
  );
}
