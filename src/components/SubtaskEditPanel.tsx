import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, ListTodo, Mail, Pencil, Trash2, X } from "lucide-react";
import { useStore } from "../store/store";
import { DateInput, fmtDue, isOverdue } from "./ui";
import { MarkdownPreview } from "./MarkdownPreview";
import { TaskStatusEmailPanel } from "./TaskStatusEmailPanel";
import type { Subtask, SubtaskStatus } from "../lib/types";
import type { TaskEmailInfo } from "../lib/taskStatusEmail";
import { assigneeAvatar, assigneeEmail, contactLabel, contactRefValue, parseContactRef, projectContactPool } from "../lib/projectContacts";
import { progressStatusLabel } from "../lib/tasks";

export function SubtaskEditPanel({
  projectId,
  milestoneId,
  subtaskId,
  close,
}: {
  projectId: string;
  milestoneId: string;
  subtaskId: string;
  close: () => void;
}) {
  const { data, all, updateSubtask, deleteSubtask, moveSubtask } = useStore();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [notesPreview, setNotesPreview] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const proj = data.projects.find((p) => p.id === projectId);
  const mile = proj?.milestones.find((m) => m.id === milestoneId);
  const subtask = mile?.subtasks.find((s) => s.id === subtaskId);
  const contactPool = projectContactPool(proj, data.contacts);

  useEffect(() => { if (!subtask) close(); }, [subtask, close]);
  useEffect(() => { bodyRef.current?.scrollTo(0, 0); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  if (!subtask) return null;

  const set = (patch: Partial<Subtask>) => updateSubtask(projectId, milestoneId, subtaskId, patch);

  const flow = subtask.state ?? "normal";

  const ownerAvatar = assigneeAvatar(contactPool, subtask.assignee, subtask.who);
  const ownerLabel = ownerAvatar.title || "Unassigned";
  const ownerEmail = assigneeEmail(proj, data.contacts, subtask.assignee);
  const emailInfo: TaskEmailInfo = {
    taskName: subtask.t,
    projectLabel: proj ? (mile ? `${proj.title} · ${mile.title}` : proj.title) : "No project",
    ownerLabel,
    dueLabel: subtask.due ? fmtDue(subtask.due) : "No due date",
    isLate: Boolean(subtask.late) || isOverdue(subtask.due, subtask.done),
    progressLabel: progressStatusLabel(subtask),
    notes: subtask.notes ?? "",
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
            <input
              className="input"
              value={subtask.t}
              onChange={(e) => set({ t: e.target.value })}
              style={{ fontWeight: 500 }}
            />
          </div>

          {proj && proj.milestones.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="field-label">Milestone / Workstream</label>
              <select
                className="input"
                value={milestoneId}
                onChange={(e) => moveSubtask(projectId, milestoneId, subtaskId, e.target.value)}
              >
                {proj.milestones.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="row">
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="field-label">Assigned to</label>
              <input
                className="input"
                placeholder="Initials or name"
                value={subtask.who}
                onChange={(e) => set({ who: e.target.value })}
              />
              <select
                className="input"
                value={contactRefValue(subtask.assignee)}
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
                <MarkdownPreview text={subtask.notes ?? ""} />
              </div>
            ) : (
              <textarea
                className="input"
                rows={3}
                placeholder="Add notes… (Markdown supported: **bold**, _italic_, [links](https://…), - lists)"
                value={subtask.notes ?? ""}
                onChange={(e) => set({ notes: e.target.value || undefined })}
                style={{ resize: "vertical", lineHeight: 1.55 }}
              />
            )}
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

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Progress</label>
            <select
              className="input"
              value={subtask.taskStatus ?? ""}
              onChange={(e) => set({ taskStatus: (e.target.value as SubtaskStatus) || undefined })}
            >
              <option value="">— None —</option>
              <option value="not-started">Not started</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In progress</option>
              <option value="ongoing">Ongoing</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>
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

          <div className="tweak-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 550, color: "var(--ink)" }}>Late</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Flags this as late</div>
            </div>
            <button
              className={"switch" + (subtask.late ? " on" : "")}
              role="switch"
              aria-checked={!!subtask.late}
              onClick={() => set({ late: !subtask.late })}
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

          <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            <button
              className="btn btn-ghost"
              style={{ color: "var(--danger)", borderColor: "color-mix(in oklab, var(--danger) 30%, transparent)" }}
              onClick={() => { deleteSubtask(projectId, milestoneId, subtask.id); close(); }}
            >
              <Trash2 /> Delete
            </button>
            <button className="btn btn-ghost" onClick={() => setEmailOpen(true)}>
              <Mail /> Email status
            </button>
            <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={close}>
              Done
            </button>
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
