import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, ListTodo, Mail, Pencil, Trash2, X } from "lucide-react";
import { useStore } from "../store/store";
import { DateInput, fmtDue, isOverdue } from "./ui";
import { MarkdownPreview } from "./MarkdownPreview";
import { TaskStatusEmailPanel } from "./TaskStatusEmailPanel";
import type { Task } from "../lib/types";
import type { TaskEmailInfo } from "../lib/taskStatusEmail";
import { assigneeAvatar, assigneeEmail, contactLabel, contactRefValue, parseContactRef, projectContactPool } from "../lib/projectContacts";
import { progressStatusLabel } from "../lib/tasks";

export function TaskEditPanel({ taskId, close }: { taskId: string; close: () => void }) {
  const { data, all, updateTask, deleteTask } = useStore();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [notesPreview, setNotesPreview] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const task = data.tasks.find((t) => t.id === taskId);

  useEffect(() => { if (!task) close(); }, [task, close]);
  useEffect(() => { bodyRef.current?.scrollTo(0, 0); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  if (!task) return null;

  const set = (patch: Partial<Task>) => updateTask(task!.id, patch);
  const taskProject = task.project ? data.projects.find((p) => p.title === task!.project) : null;
  const contactPool = projectContactPool(taskProject, data.contacts);
  const milestone = taskProject && task.milestoneId ? taskProject.milestones.find((m) => m.id === task.milestoneId) : undefined;
  const flow = task.state ?? "normal";

  const ownerAvatar = assigneeAvatar(contactPool, task.assignee, task.who);
  const ownerLabel = ownerAvatar.title || "Unassigned";
  const ownerEmail = assigneeEmail(taskProject, data.contacts, task.assignee);
  const emailInfo: TaskEmailInfo = {
    taskName: task.text,
    projectLabel: taskProject ? (milestone ? `${taskProject.title} · ${milestone.title}` : taskProject.title) : "No project",
    ownerLabel,
    dueLabel: task.due ? fmtDue(task.due) : "No due date",
    isLate: Boolean(task.late) || isOverdue(task.due, task.done),
    progressLabel: progressStatusLabel(task),
    notes: task.notes ?? "",
  };
  const setFlow = (f: "normal" | "delegated" | "waiting") => {
    if (f === "normal") set({ state: undefined, to: undefined, waitFor: undefined });
    else if (f === "delegated") set({ state: "delegated", waitFor: undefined, next: false });
    else set({ state: "waiting", to: undefined, next: false });
  };

  return createPortal(
    <div className="overlay-center" role="dialog" aria-modal="true" aria-label="Edit task">
      <div className="overlay-bg" onClick={close} />
      <div className="popup-card">
        <div className="popup-card-head">
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
            <ListTodo size={15} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Edit task</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Changes save automatically</div>
          </div>
          <button className="icon-btn" onClick={close}><X /></button>
        </div>

        <div className="popup-card-body" ref={bodyRef}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Task</label>
            <input className="input" value={task.text} onChange={(e) => set({ text: e.target.value })} style={{ fontWeight: 500 }} />
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

          <div className="row">
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="field-label">Assigned to</label>
              <input
                className="input"
                placeholder="Initials or name"
                value={task.who ?? ""}
                onChange={(e) => set({ who: e.target.value || undefined })}
              />
              <select
                className="input"
                value={contactRefValue(task.assignee)}
                onChange={(e) => set({ assignee: parseContactRef(e.target.value) })}
              >
                <option value="">— No project contact —</option>
                {contactPool.map((p) => (
                  <option key={contactRefValue(p)} value={contactRefValue(p)}>
                    {contactLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="field-label">Due</label>
              <DateInput value={task.due} onChange={(v) => set({ due: v || undefined })} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Reminder</label>
            <input className="input" placeholder="e.g. 9:00 AM" value={task.reminder ?? ""} onChange={(e) => set({ reminder: e.target.value || undefined })} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="field-label" style={{ display: "flex", alignItems: "center" }}>
              Notes
              <button
                type="button"
                onClick={() => setNotesPreview((v) => !v)}
                style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, color: "var(--accent-ink)", fontSize: 11, fontWeight: 550, textTransform: "none", letterSpacing: 0, background: "none", border: "none", cursor: "pointer" }}
              >
                {notesPreview ? <><Pencil size={11} /> Edit</> : <><Eye size={11} /> Preview</>}
              </button>
            </div>
            {notesPreview ? (
              <div style={{ border: "1px solid var(--border)", borderRadius: 7, padding: "8px 10px", minHeight: 62 }}>
                <MarkdownPreview text={task.notes ?? ""} />
              </div>
            ) : (
              <textarea
                className="input"
                rows={3}
                placeholder="Add notes… (Markdown supported: **bold**, _italic_, [links](https://…), - lists)"
                value={task.notes ?? ""}
                onChange={(e) => set({ notes: e.target.value || undefined })}
                style={{ resize: "vertical", lineHeight: 1.55 }}
              />
            )}
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

          <div className="tweak-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 550, color: "var(--ink)" }}>Late</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Flags this as late</div>
            </div>
            <button
              className={"switch" + (task.late ? " on" : "")}
              role="switch"
              aria-checked={!!task.late}
              onClick={() => set({ late: !task!.late })}
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

          <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            <button
              className="btn btn-ghost"
              style={{ color: "var(--danger)", borderColor: "color-mix(in oklab, var(--danger) 30%, transparent)" }}
              onClick={() => { deleteTask(task!.id); close(); }}
            >
              <Trash2 /> Delete
            </button>
            <button className="btn btn-ghost" onClick={() => setEmailOpen(true)}>
              <Mail /> Email status
            </button>
            <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={close}>Done</button>
          </div>
        </div>
      </div>

      {emailOpen && (
        <TaskStatusEmailPanel
          info={emailInfo}
          ownerEmail={ownerEmail}
          pmEmail={all.user.email}
          close={() => setEmailOpen(false)}
        />
      )}
    </div>,
    document.body,
  );
}
