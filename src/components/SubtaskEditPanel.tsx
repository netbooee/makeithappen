import { useEffect, useRef } from "react";
import { ListTodo, Trash2, X } from "lucide-react";
import { useStore } from "../store/store";
import { DateInput } from "./ui";
import type { Subtask } from "../lib/types";

export function SubtaskEditPanel({
  projectId,
  milestoneId,
  subtask,
  close,
}: {
  projectId: string;
  milestoneId: string;
  subtask: Subtask;
  close: () => void;
}) {
  const { updateSubtask, deleteSubtask } = useStore();
  const bodyRef = useRef<HTMLDivElement>(null);
  const set = (patch: Partial<Subtask>) => updateSubtask(projectId, milestoneId, subtask.id, patch);

  useEffect(() => { bodyRef.current?.scrollTo(0, 0); }, []);

  const flow = subtask.state ?? "normal";

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

        <div className="side-panel-body" ref={bodyRef}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Task</label>
            <input
              className="input"
              value={subtask.t}
              onChange={(e) => set({ t: e.target.value })}
              style={{ fontWeight: 500 }}
            />
          </div>

          <div className="row">
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="field-label">Assigned to</label>
              <input
                className="input"
                placeholder="Initials or name"
                value={subtask.who}
                onChange={(e) => set({ who: e.target.value })}
              />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="field-label">Due</label>
              <DateInput value={subtask.due} onChange={(v) => set({ due: v || undefined })} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Reminder</label>
            <input
              className="input"
              placeholder="e.g. 9:00 AM"
              value={subtask.reminder ?? ""}
              onChange={(e) => set({ reminder: e.target.value || undefined })}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Notes</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Add notes…"
              value={subtask.notes ?? ""}
              onChange={(e) => set({ notes: e.target.value || undefined })}
              style={{ resize: "vertical", lineHeight: 1.55 }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Status</label>
            <div className="segmented" style={{ display: "flex" }}>
              {(["normal", "delegated", "waiting"] as const).map((f) => (
                <button
                  key={f}
                  className={flow === f ? "active" : ""}
                  style={{ flex: 1, textTransform: "capitalize" }}
                  onClick={() => setFlow(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            {subtask.state === "delegated" && (
              <input
                className="input"
                placeholder="Delegated to…"
                value={subtask.to ?? ""}
                onChange={(e) => set({ to: e.target.value })}
              />
            )}
            {subtask.state === "waiting" && (
              <input
                className="input"
                placeholder="Waiting for…"
                value={subtask.waitFor ?? ""}
                onChange={(e) => set({ waitFor: e.target.value })}
              />
            )}
          </div>

          <div className="tweak-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 550, color: "var(--ink)" }}>Next action</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Flags this as the next step</div>
            </div>
            <button
              className={"switch" + (subtask.next ? " on" : "")}
              role="switch"
              aria-checked={!!subtask.next}
              onClick={() => set({
                next: !subtask.next,
                ...(subtask.next ? {} : { state: undefined, to: undefined, waitFor: undefined }),
              })}
            />
          </div>

          <div className="tweak-row">
            <div style={{ fontSize: 13.5, fontWeight: 550, color: "var(--ink)" }}>Completed</div>
            <button
              className={"switch" + (subtask.done ? " on" : "")}
              role="switch"
              aria-checked={subtask.done}
              onClick={() => set({ done: !subtask.done })}
            />
          </div>
        </div>

        <div className="side-panel-foot">
          <button
            className="btn btn-ghost"
            style={{ color: "var(--danger)", borderColor: "color-mix(in oklab, var(--danger) 30%, transparent)" }}
            onClick={() => { deleteSubtask(projectId, milestoneId, subtask.id); close(); }}
          >
            <Trash2 /> Delete
          </button>
          <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={close}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
