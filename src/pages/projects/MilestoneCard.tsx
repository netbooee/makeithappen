import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useStore } from "../../store/store";
import { Avatar, DateInput, DueChip, StateTag, StatusChip, TaskMarker, fmtDue, isOverdue } from "../../components/ui";
import { SubtaskEditPanel } from "../../components/SubtaskEditPanel";
import type { Milestone, Project, Status, Subtask } from "../../lib/types";

function AddSubtaskRow({ projectId, milestoneId }: { projectId: string; milestoneId: string }) {
  const { addSubtask } = useStore();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  const submit = () => {
    if (text.trim()) addSubtask(projectId, milestoneId, text.trim());
    setText("");
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        className="task-row"
        style={{ width: "100%", color: "var(--ink-4)", fontSize: 13, gap: 11 }}
        onClick={() => setEditing(true)}
      >
        <span style={{ width: 18, display: "grid", placeItems: "center", flexShrink: 0 }}><Plus size={13} /></span>
        Add task
      </button>
    );
  }
  return (
    <div className="task-row" style={{ gap: 8 }}>
      <input
        className="input"
        autoFocus
        placeholder="Task name…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setText(""); setEditing(false); }
        }}
        style={{ padding: "5px 9px", fontSize: 13 }}
      />
      <button className="btn btn-primary" style={{ padding: "5px 11px", fontSize: 12 }} onClick={submit}>Add</button>
      <button className="btn btn-ghost" style={{ padding: "5px 11px", fontSize: 12 }} onClick={() => { setText(""); setEditing(false); }}>Cancel</button>
    </div>
  );
}

/* ================= Subtask row (click-to-edit + delete) ================= */

function SubtaskRow({ projectId, milestoneId, s }: { projectId: string; milestoneId: string; s: Subtask }) {
  const { toggleSubtask, deleteSubtask, updateSubtask } = useStore();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(s.t);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingDue, setEditingDue] = useState(false);
  const [editingWho, setEditingWho] = useState(false);
  const [whoDraft, setWhoDraft] = useState(s.who);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editingTitle) setTitleDraft(s.t);
  }, [s.t, editingTitle]);

  useEffect(() => {
    if (!editingWho) setWhoDraft(s.who);
  }, [s.who, editingWho]);

  useEffect(() => () => { if (clickTimer.current) clearTimeout(clickTimer.current); }, []);

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== s.t) updateSubtask(projectId, milestoneId, s.id, { t: trimmed });
    setEditingTitle(false);
  };

  const commitWho = () => {
    const trimmed = whoDraft.trim();
    if (trimmed && trimmed !== s.who) updateSubtask(projectId, milestoneId, s.id, { who: trimmed });
    setEditingWho(false);
  };

  return (
    <>
      <div className="task-row" style={{ gap: 8, alignItems: "flex-start" }}>
        <TaskMarker task={s} onClick={() => toggleSubtask(projectId, milestoneId, s.id)} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {editingTitle ? (
              <input
                className="input"
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitle();
                  if (e.key === "Escape") { setTitleDraft(s.t); setEditingTitle(false); }
                }}
                style={{ flex: 1, fontSize: 13, padding: "3px 6px" }}
              />
            ) : (
              <button
                style={{ flex: 1, fontSize: 13, textAlign: "left", cursor: "text" }}
                onClick={() => {
                  if (clickTimer.current) clearTimeout(clickTimer.current);
                  clickTimer.current = setTimeout(() => setEditingTitle(true), 200);
                }}
                title="Click to edit, or double-click for full task details"
                onDoubleClick={() => {
                  if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
                  setPanelOpen(true);
                }}
              >
                {s.t}
              </button>
            )}
            {s.state === "delegated" || s.state === "waiting" ? (
              <StateTag task={s} />
            ) : editingStatus ? (
              <select
                className="input"
                autoFocus
                value={s.taskStatus ?? ""}
                onChange={(e) => {
                  updateSubtask(projectId, milestoneId, s.id, { taskStatus: (e.target.value as Subtask["taskStatus"]) || undefined });
                  setEditingStatus(false);
                }}
                onBlur={() => setEditingStatus(false)}
                style={{ fontSize: 11, padding: "2px 4px", width: 106 }}
              >
                <option value="">— None —</option>
                <option value="not-started">Not started</option>
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            ) : (
              <span onClick={() => setEditingStatus(true)} style={{ cursor: "pointer" }} title="Click to edit status">
                {s.taskStatus || s.next ? <StateTag task={s} /> : <span style={{ fontSize: 11, color: "var(--ink-4)" }}>+ Status</span>}
              </span>
            )}
            {editingDue ? (
              <DateInput
                value={s.due}
                onChange={(v) => {
                  updateSubtask(projectId, milestoneId, s.id, { due: v || undefined });
                  setEditingDue(false);
                }}
                style={{ width: 118, fontSize: 11, padding: "2px 4px" }}
              />
            ) : (
              <span onClick={() => setEditingDue(true)} style={{ cursor: "pointer" }} title="Click to edit due date">
                {s.due ? <DueChip due={s.due} done={s.done} /> : <span style={{ fontSize: 11, color: "var(--ink-4)" }}>+ Due</span>}
              </span>
            )}
            {editingWho ? (
              <input
                className="input"
                autoFocus
                value={whoDraft}
                onChange={(e) => setWhoDraft(e.target.value)}
                onBlur={commitWho}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitWho();
                  if (e.key === "Escape") { setWhoDraft(s.who); setEditingWho(false); }
                }}
                style={{ width: 56, fontSize: 11, padding: "2px 4px" }}
              />
            ) : (
              <span onClick={() => setEditingWho(true)} style={{ cursor: "pointer" }} title="Click to edit assignee">
                <Avatar who={s.who} size={20} color="var(--ink-3)" />
              </span>
            )}
            <button
              className="icon-btn"
              style={{ color: "var(--ink-4)" }}
              onClick={() => deleteSubtask(projectId, milestoneId, s.id)}
              title="Delete task"
            >
              <Trash2 size={12} />
            </button>
          </div>
          {s.notes && !s.done && (
            <span
              style={{ fontSize: 11.5, color: "var(--ink-4)", fontWeight: 400, cursor: "pointer" }}
              onClick={() => setPanelOpen(true)}
            >
              {s.notes}
            </span>
          )}
        </div>
      </div>
      {panelOpen && (
        <SubtaskEditPanel
          projectId={projectId}
          milestoneId={milestoneId}
          subtaskId={s.id}
          close={() => setPanelOpen(false)}
        />
      )}
    </>
  );
}

/* ================= Milestone card ================= */

export function MilestoneCard({
  project, m, isOpen, onToggle, onEditTask,
}: {
  project: Project; m: Milestone; isOpen: boolean; onToggle: () => void; onEditTask: (id: string) => void;
}) {
  const { tweaks, updateMilestone, deleteMilestone, data, toggleTask } = useStore();

  // Tasks from the task lists that have been assigned to this milestone
  const linkedTasks = [
    ...data.todayTasks.map((t) => ({ task: t, list: "Today" })),
    ...data.upcoming.map((t) => ({ task: t, list: "Upcoming" })),
    ...data.someday.map((t) => ({ task: t, list: "Someday" })),
  ].filter(({ task }) => task.milestoneId === m.id);
  const { collapsible, showCount } = tweaks;
  const total = m.subtasks.length;
  const done = m.subtasks.filter((s) => s.done).length;
  const shown = collapsible ? isOpen : true;

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(m.title);
  const [editDesc, setEditDesc] = useState(m.desc ?? "");
  const [editStart, setEditStart] = useState(m.start ?? "");
  const [editDue, setEditDue] = useState(m.due === "No date" ? "" : m.due);
  const [editStatus, setEditStatus] = useState<Status>(m.status);

  useEffect(() => {
    setEditTitle(m.title);
    setEditDesc(m.desc ?? "");
    setEditStart(m.start ?? "");
    setEditDue(m.due === "No date" ? "" : m.due);
    setEditStatus(m.status);
  }, [m.title, m.desc, m.start, m.due, m.status]);

  const commitEdit = () => {
    updateMilestone(project.id, m.id, {
      title: editTitle.trim() || m.title,
      desc: editDesc.trim() || undefined,
      start: editStart.trim() || undefined,
      due: editDue.trim() || "No date",
      status: editStatus,
    });
    setEditing(false);
  };

  const statusDotColor =
    m.status === "complete" ? "var(--next)"
    : m.status === "active" ? "var(--accent)"
    : m.status === "waiting" ? "var(--ink-4)"
    : "var(--ink-4)";

  if (editing) {
    return (
      <div className="card">
        <div style={{ padding: "13px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            className="input"
            autoFocus
            placeholder="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
            style={{ fontWeight: 600, fontSize: 14 }}
          />
          <textarea
            className="input"
            placeholder="Description (optional)"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={2}
            style={{ fontSize: 12.5, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <DateInput value={editStart} onChange={setEditStart} style={{ width: 140, fontSize: 12.5 }} />
            <span style={{ fontSize: 12, color: "var(--ink-4)" }}>→</span>
            <DateInput value={editDue} onChange={setEditDue} style={{ width: 140, fontSize: 12.5 }} />
          </div>
          <div className="segmented" style={{ display: "flex" }}>
            {(["active", "waiting", "hold", "complete"] as Status[]).map((s) => (
              <button
                key={s}
                className={editStatus === s ? "active" : ""}
                style={{ flex: 1, fontSize: 12 }}
                onClick={() => setEditStatus(s)}
              >
                {s === "hold" ? "Hold" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={commitEdit}>Save</button>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setEditing(false)}>Cancel</button>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: "5px 12px", color: "var(--danger)", marginLeft: "auto", borderColor: "color-mix(in oklab, var(--danger) 30%, transparent)" }}
              onClick={() => deleteMilestone(project.id, m.id)}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div
        style={{
          padding: "13px 16px", display: "flex", alignItems: "center", gap: 10,
          background: "var(--surface-3)",
          borderBottom: shown ? "1px solid var(--border)" : "1px solid transparent",
          transition: "border-color .18s",
        }}
      >
        {collapsible ? (
          <button
            onClick={onToggle}
            style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer", minWidth: 0 }}
          >
            <ChevronRight
              size={14}
              style={{ color: "var(--ink-4)", flexShrink: 0, transition: "transform .18s ease", transform: shown ? "rotate(90deg)" : "none" }}
            />
            <div style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: statusDotColor }} />
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: m.status === "complete" ? "var(--ink-3)" : undefined }}>{m.title}</div>
              {m.desc && <div style={{ fontSize: 11.5, color: "var(--ink-4)", fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.desc}</div>}
            </div>
            {showCount && !shown && (
              <span className="chip" style={{ color: total > 0 && done === total ? "var(--next)" : "var(--ink-3)" }}>
                <CheckCircle2 /> {done}/{total}
              </span>
            )}
            {m.start && <span style={{ fontSize: 11.5, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{m.start} →</span>}
            <DueChip due={m.due} done={m.status === "complete"} />
            <StatusChip status={m.status} />
          </button>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: statusDotColor }} />
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: m.status === "complete" ? "var(--ink-3)" : undefined }}>{m.title}</div>
              {m.desc && <div style={{ fontSize: 11.5, color: "var(--ink-4)", fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.desc}</div>}
            </div>
            {m.start && <span style={{ fontSize: 11.5, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{m.start} →</span>}
            <DueChip due={m.due} done={m.status === "complete"} />
            <StatusChip status={m.status} />
          </div>
        )}
        <button
          className="icon-btn"
          style={{ color: "var(--ink-4)", flexShrink: 0 }}
          onClick={() => setEditing(true)}
          title="Edit milestone / workstream"
        >
          <Pencil size={13} />
        </button>
      </div>
      {shown && (
        <div style={{ padding: "6px 10px 8px" }}>
          {[...m.subtasks]
            .sort((a, b) => {
              if (a.done !== b.done) return a.done ? 1 : -1;
              if (!a.due && !b.due) return 0;
              if (!a.due) return 1;
              if (!b.due) return -1;
              return new Date(a.due).getTime() - new Date(b.due).getTime();
            })
            .map((s) => (
              <SubtaskRow key={s.id} projectId={project.id} milestoneId={m.id} s={s} />
            ))}
          {linkedTasks.map(({ task: t, list }) => (
            <div key={t.id} className="task-row" style={{ gap: 8, alignItems: "flex-start" }}>
              <TaskMarker task={t} onClick={() => toggleTask(t.id)} />
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    style={{ flex: 1, fontSize: 13, textAlign: "left", cursor: "pointer" }}
                    onClick={() => onEditTask(t.id)}
                    title="Edit task"
                  >
                    {t.text}
                  </button>
                  <StateTag task={t} />
                  <span className="chip" style={{ fontSize: 11, color: "var(--ink-3)" }}>{list}</span>
                  {t.due && <span style={{ fontSize: 11.5, color: isOverdue(t.due, t.done) ? "var(--danger)" : "var(--ink-4)", whiteSpace: "nowrap" }}>{fmtDue(t.due)}</span>}
                </div>
                {t.notes && !t.done && (
                  <span
                    style={{ fontSize: 11.5, color: "var(--ink-4)", fontWeight: 400, cursor: "pointer" }}
                    onClick={() => onEditTask(t.id)}
                  >
                    {t.notes}
                  </span>
                )}
              </div>
            </div>
          ))}
          <AddSubtaskRow projectId={project.id} milestoneId={m.id} />
        </div>
      )}
    </div>
  );
}
