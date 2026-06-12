import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar, Check, CheckCircle2, ChevronRight, Copy, Mail, Pencil, Plus, Sparkles, Trash2, UserRound, X,
} from "lucide-react";
import { useStore } from "../store/store";
import { Avatar, Bar, DateInput, DueChip, StateTag, StatusChip, TaskMarker } from "../components/ui";
import { TaskEditPanel } from "../components/TaskEditPanel";
import { SubtaskEditPanel } from "../components/SubtaskEditPanel";
import { draftStatusEmail } from "../lib/claude";
import { CONTEXTS } from "../lib/constants";
import type { Milestone, Project, ProjectMember, Status, StatusUpdate, Subtask, Task, TaskGroup } from "../lib/types";

/* ================= Shared Project Modal (create + edit) ================= */

function ProjectModal({
  initial,
  heading,
  onSave,
  onDelete,
  close,
}: {
  initial: Partial<Project>;
  heading: string;
  onSave: (patch: Partial<Project>) => void;
  onDelete?: () => void;
  close: () => void;
}) {
  const { all } = useStore();
  const [title, setTitle] = useState(initial.title ?? "");
  const [desc, setDesc] = useState(initial.desc ?? "");
  const [due, setDue] = useState(initial.due && initial.due !== "No date" ? initial.due : "");
  const [status, setStatus] = useState<Status>(initial.status ?? "active");
  const [owner, setOwner] = useState(initial.owner ?? all.user.initials);

  const submit = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      desc: desc.trim(),
      due: due.trim() || "No date",
      status,
      owner: owner.trim() || all.user.initials,
      active: status === "active",
    });
    close();
  };

  return (
    <div className="modal-center">
      <div className="overlay-bg" onClick={close} style={{ position: "fixed" }} />
      <div className="modal-card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{heading}</div>
        <input
          className="input"
          autoFocus
          placeholder="Project title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <textarea
          className="input"
          rows={2}
          placeholder="Description (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="row">
          <DateInput value={due} onChange={setDue} style={{ flex: 1 }} />
          <input
            className="input"
            placeholder="Owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
        <div>
          <div className="field-label" style={{ marginBottom: 7 }}>Status</div>
          <div className="segmented" style={{ display: "flex" }}>
            {(["active", "hold", "complete"] as Status[]).map((s) => (
              <button
                key={s}
                className={status === s ? "active" : ""}
                style={{ flex: 1 }}
                onClick={() => setStatus(s)}
              >
                {s === "hold" ? "On Hold" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={submit}>
            {initial.id ? "Save changes" : "Create project"}
          </button>
          <button className="btn btn-ghost" onClick={close}>Cancel</button>
          {onDelete && (
            <button
              className="btn btn-ghost"
              style={{ color: "var(--danger)", marginLeft: "auto", borderColor: "color-mix(in oklab, var(--danger) 30%, transparent)" }}
              onClick={onDelete}
            >
              <Trash2 size={14} /> Delete project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= Project list ================= */

export function ProjectList() {
  const { data, addProject } = useStore();
  const navigate = useNavigate();
  const projects = data.projects;
  const [adding, setAdding] = useState(false);

  return (
    <div className="page fade">
      <div className="page-head" style={{ display: "flex", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div className="page-title">Projects</div>
          <div className="page-sub">
            {projects.filter((p) => p.status === "active").length} active · {projects.length} total
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus /> New project</button>
      </div>

      <div className="grid-2">
        {projects.map((p) => {
          const total = p.milestones.reduce((a, m) => a + m.subtasks.length, 0);
          const done = p.milestones.reduce((a, m) => a + m.subtasks.filter((s) => s.done).length, 0);
          return (
            <button
              key={p.id}
              className="card card-pad"
              onClick={() => navigate(`/projects/${p.id}`)}
              style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 12, cursor: "pointer", transition: "border-color .14s, box-shadow .14s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", flex: 1 }}>{p.title}</div>
                <StatusChip status={p.status} />
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5, minHeight: 38 }}>{p.desc}</div>
              <Bar value={p.progress} />
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--ink-3)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <CheckCircle2 size={13} /> {done}/{total} subtasks
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar size={13} /> {p.due}
                </span>
                <span style={{ marginLeft: "auto" }}>
                  <Avatar who={p.owner} size={22} />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {adding && (
        <ProjectModal
          initial={{}}
          heading="New project"
          onSave={(patch) =>
            addProject({
              id: "p" + Date.now(),
              title: patch.title ?? "",
              desc: patch.desc ?? "",
              due: patch.due ?? "No date",
              status: patch.status ?? "active",
              owner: patch.owner ?? "",
              active: patch.active ?? true,
              progress: 0,
              milestones: [],
              updates: [],
            })
          }
          close={() => setAdding(false)}
        />
      )}
    </div>
  );
}

/* ================= Add subtask / milestone forms ================= */

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

function AddMilestone({ projectId, onAdded }: { projectId: string; onAdded: (id: string) => void }) {
  const { addMilestone } = useStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    const id = "m" + Date.now();
    addMilestone(projectId, { id, title: title.trim(), due: due.trim() || "No date", status: "active", subtasks: [] });
    onAdded(id);
    setTitle("");
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
      <div style={{ display: "flex", gap: 8 }}>
        <DateInput value={due} onChange={setDue} style={{ width: 150, fontSize: 12.5 }} />
        <button className="btn btn-primary" style={{ fontSize: 12.5 }} onClick={submit}>Add</button>
        <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </div>
  );
}

/* ================= Subtask row (click-to-edit + delete) ================= */

function SubtaskRow({ projectId, milestoneId, s }: { projectId: string; milestoneId: string; s: Subtask }) {
  const { toggleSubtask, deleteSubtask } = useStore();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      <div className="task-row" style={{ gap: 8 }}>
        <TaskMarker task={s} onClick={() => toggleSubtask(projectId, milestoneId, s.id)} />
        <button
          style={{ flex: 1, fontSize: 13, textAlign: "left", cursor: "pointer" }}
          className={s.done ? "strike" : ""}
          onClick={() => setPanelOpen(true)}
          title="Edit task"
        >
          {s.t}
        </button>
        <StateTag task={s} />
        <Avatar who={s.who} size={20} color="var(--ink-3)" />
        <button
          className="icon-btn"
          style={{ color: "var(--ink-4)" }}
          onClick={() => deleteSubtask(projectId, milestoneId, s.id)}
          title="Delete task"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {panelOpen && (
        <SubtaskEditPanel
          projectId={projectId}
          milestoneId={milestoneId}
          subtask={s}
          close={() => setPanelOpen(false)}
        />
      )}
    </>
  );
}

/* ================= Milestone card ================= */

function MilestoneCard({
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
  const [editDue, setEditDue] = useState(m.due === "No date" ? "" : m.due);
  const [editStatus, setEditStatus] = useState<Status>(m.status);

  useEffect(() => {
    setEditTitle(m.title);
    setEditDue(m.due === "No date" ? "" : m.due);
    setEditStatus(m.status);
  }, [m.title, m.due, m.status]);

  const commitEdit = () => {
    updateMilestone(project.id, m.id, {
      title: editTitle.trim() || m.title,
      due: editDue.trim() || "No date",
      status: editStatus,
    });
    setEditing(false);
  };

  const statusDotColor =
    m.status === "complete" ? "var(--next)" : m.status === "active" ? "var(--accent)" : "var(--ink-4)";

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
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <DateInput value={editDue} onChange={setEditDue} style={{ width: 150, fontSize: 12.5 }} />
            <div className="segmented" style={{ display: "flex", flex: 1, minWidth: 190 }}>
              {(["active", "hold", "complete"] as Status[]).map((s) => (
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
            <div style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
            {showCount && !shown && (
              <span className="chip" style={{ color: total > 0 && done === total ? "var(--next)" : "var(--ink-3)" }}>
                <CheckCircle2 /> {done}/{total}
              </span>
            )}
            <DueChip due={m.due} />
            <StatusChip status={m.status} />
          </button>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: statusDotColor }} />
            <div style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
            <DueChip due={m.due} />
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
          {m.subtasks.map((s) => (
            <SubtaskRow key={s.id} projectId={project.id} milestoneId={m.id} s={s} />
          ))}
          {linkedTasks.map(({ task: t, list }) => (
            <div key={t.id} className="task-row" style={{ gap: 8 }}>
              <TaskMarker task={t} onClick={() => toggleTask(t.id)} />
              <button
                style={{ flex: 1, fontSize: 13, textAlign: "left", cursor: "pointer" }}
                className={t.done ? "strike" : ""}
                onClick={() => onEditTask(t.id)}
                title="Edit task"
              >
                {t.text}
              </button>
              <StateTag task={t} />
              <span className="chip" style={{ fontSize: 11, color: "var(--ink-3)" }}>{list}</span>
              {t.due && <span style={{ fontSize: 11.5, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{t.due}</span>}
            </div>
          ))}
          <AddSubtaskRow projectId={project.id} milestoneId={m.id} />
        </div>
      )}
    </div>
  );
}

/* ================= KPI bar ================= */

const RAG = { green: "#10B981", amber: "#F59E0B", red: "#EF4444" } as const;

function KpiSection({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const set = (patch: Partial<Project>) => updateProject(project.id, patch);

  const riskColor = project.risk ? RAG[project.risk] : "var(--ink-3)";
  const budgetOk = project.onBudget !== false;

  const kpiCard: React.CSSProperties = {
    padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
  };
  const kpiLabel: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)",
    textTransform: "uppercase", letterSpacing: "0.07em",
  };
  const kpiInput: React.CSSProperties = {
    border: "none", boxShadow: "none", padding: 0, background: "transparent",
    fontSize: 15, fontWeight: 650, color: "var(--ink)", width: "100%",
    fontFamily: "inherit",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
      {/* Start */}
      <div className="card" style={kpiCard}>
        <div style={kpiLabel}>Start</div>
        <DateInput
          value={project.start}
          onChange={(v) => set({ start: v || undefined })}
          style={{ ...kpiInput, padding: "2px 0" }}
          className=""
        />
      </div>

      {/* End */}
      <div className="card" style={kpiCard}>
        <div style={kpiLabel}>End</div>
        <DateInput
          value={project.due}
          onChange={(v) => set({ due: v || "No date" })}
          style={{ ...kpiInput, padding: "2px 0" }}
          className=""
        />
      </div>

      {/* Budget */}
      <div className="card" style={kpiCard}>
        <div style={kpiLabel}>Budget</div>
        <input
          style={kpiInput}
          placeholder="e.g. $50,000"
          value={project.budget ?? ""}
          onChange={(e) => set({ budget: e.target.value || undefined })}
        />
        <button
          onClick={() => set({ onBudget: !budgetOk })}
          style={{
            alignSelf: "flex-start", fontSize: 11.5, fontWeight: 600,
            padding: "2px 8px", borderRadius: 99, cursor: "pointer",
            border: `1px solid ${budgetOk ? "color-mix(in oklab, #10B981 35%, transparent)" : "color-mix(in oklab, #EF4444 35%, transparent)"}`,
            background: budgetOk ? "color-mix(in oklab, #10B981 12%, transparent)" : "color-mix(in oklab, #EF4444 12%, transparent)",
            color: budgetOk ? "#10B981" : "#EF4444",
          }}
        >
          {budgetOk ? "✓ On budget" : "⚠ Over budget"}
        </button>
      </div>

      {/* Risk */}
      <div className="card" style={kpiCard}>
        <div style={kpiLabel}>Risk</div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {(["green", "amber", "red"] as const).map((r) => (
            <button
              key={r}
              title={r.charAt(0).toUpperCase() + r.slice(1)}
              onClick={() => set({ risk: project.risk === r ? undefined : r })}
              style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                background: RAG[r],
                opacity: project.risk && project.risk !== r ? 0.3 : 1,
                border: project.risk === r ? "2px solid var(--ink)" : "2px solid transparent",
                transition: "opacity .15s, border .15s",
              }}
            />
          ))}
        </div>
        <input
          style={{ ...kpiInput, fontSize: 13, fontWeight: 550, color: riskColor }}
          placeholder="e.g. On track"
          value={project.riskNote ?? ""}
          onChange={(e) => set({ riskNote: e.target.value || undefined })}
          maxLength={40}
        />
      </div>
    </div>
  );
}

/* ================= Project task quick-add ================= */

function AddProjectTaskRow({ projectTitle }: { projectTitle: string }) {
  const { addTask, workspace } = useStore();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [group, setGroup] = useState<TaskGroup>("today");

  const submit = () => {
    if (!text.trim()) return;
    addTask(
      {
        id: "t" + Date.now(),
        text: text.trim(),
        done: false,
        next: false,
        context: CONTEXTS[workspace][0],
        project: projectTitle,
        ...(due ? { due } : {}),
      },
      group,
    );
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
      <select
        className="input"
        value={group}
        onChange={(e) => setGroup(e.target.value as TaskGroup)}
        style={{ width: 105, fontSize: 12.5 }}
      >
        <option value="today">Today</option>
        <option value="upcoming">Upcoming</option>
        <option value="someday">Someday</option>
      </select>
      <button className="btn btn-primary" style={{ padding: "5px 11px", fontSize: 12 }} onClick={submit}>Add</button>
      <button className="btn btn-ghost" style={{ padding: "5px 11px", fontSize: 12 }} onClick={() => setEditing(false)}>Cancel</button>
    </div>
  );
}

/* ================= Project detail ================= */

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    data, tweaks, all,
    addUpdate, updateProject, deleteProject, updateStatusUpdate, deleteStatusUpdate,
    toggleTask,
  } = useStore();
  const project = data.projects.find((p) => p.id === id);

  const [draftFor, setDraftFor] = useState<StatusUpdate | null>(null);
  const [adding, setAdding] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [editingProject, setEditingProject] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editUpdateText, setEditUpdateText] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");

  const seed = useMemo(() => {
    const map: Record<string, boolean> = {};
    project?.milestones.forEach((m) => {
      map[m.id] =
        tweaks.defaultState === "all" ? true
        : tweaks.defaultState === "none" ? false
        : m.status === "active";
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, tweaks.defaultState]);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(seed);
  useEffect(() => setOpenMap(seed), [seed]);

  if (!project) {
    return (
      <div className="page fade">
        <div className="page-title">Project not found</div>
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate("/projects")}>
          Back to projects
        </button>
      </div>
    );
  }

  const total = project.milestones.reduce((a, m) => a + m.subtasks.length, 0);
  const done = project.milestones.reduce((a, m) => a + m.subtasks.filter((s) => s.done).length, 0);

  // Tasks from the task lists that are tagged to this project
  const allTasks: { task: Task; list: string }[] = [
    ...data.todayTasks.map((t) => ({ task: t, list: "Today" })),
    ...data.upcoming.map((t) => ({ task: t, list: "Upcoming" })),
    ...data.someday.map((t) => ({ task: t, list: "Someday" })),
  ];
  // Only unassigned project tasks (assigned ones show under their milestone)
  const projectTasks = allTasks.filter(
    ({ task }) => task.project === project.title && !task.milestoneId,
  );

  const toggleOne = (mid: string) => setOpenMap((o) => ({ ...o, [mid]: !o[mid] }));
  const toggleAll = () =>
    setOpenMap(() => {
      const anyOpen = project.milestones.some((m) => openMap[m.id]);
      const next: Record<string, boolean> = {};
      project.milestones.forEach((m) => { next[m.id] = !anyOpen; });
      return next;
    });

  const submitUpdate = () => {
    if (!updateText.trim()) return;
    addUpdate(project.id, updateText.trim());
    setUpdateText("");
    setAdding(false);
  };

  const startEditUpdate = (u: StatusUpdate) => {
    setEditingUpdateId(u.id);
    setEditUpdateText(u.text);
  };

  const saveEditUpdate = () => {
    if (editingUpdateId && editUpdateText.trim()) {
      updateStatusUpdate(project.id, editingUpdateId, editUpdateText.trim());
    }
    setEditingUpdateId(null);
  };

  return (
    <div className="page fade" style={{ maxWidth: 1100 }}>
      <button
        onClick={() => navigate("/projects")}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-3)", marginBottom: 16, fontWeight: 500 }}
      >
        <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /> All projects
      </button>

      <div className="page-head" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div
            className="page-title"
            style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
          >
            {project.title}
            <StatusChip status={project.status} />
            <button
              className="icon-btn"
              style={{ color: "var(--ink-4)" }}
              onClick={() => setEditingProject(true)}
              title="Edit project"
            >
              <Pencil size={15} />
            </button>
          </div>
          <div className="page-sub" style={{ maxWidth: 620 }}>{project.desc}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span className="chip"><UserRound /> {project.owner}</span>
            <span className="chip"><Calendar /> Due {project.due}</span>
            <span className="chip"><CheckCircle2 /> {done}/{total} done</span>
          </div>
        </div>
      </div>

      <KpiSection project={project} />

      <div className="project-cols" style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 20, alignItems: "start" }}>
        {/* LEFT: milestones */}
        <div>
          <div className="section-h">
            Milestones / Workstreams
            {tweaks.collapsible && (
              <button
                onClick={toggleAll}
                style={{ marginLeft: "auto", color: "var(--ink-3)", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}
              >
                <ChevronRight size={11} /> Toggle all
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {project.milestones.map((m) => (
              <MilestoneCard
                key={m.id}
                project={project}
                m={m}
                isOpen={!!openMap[m.id]}
                onToggle={() => toggleOne(m.id)}
                onEditTask={(id) => setEditingTaskId(id)}
              />
            ))}
            <AddMilestone projectId={project.id} onAdded={(newId) => setOpenMap((o) => ({ ...o, [newId]: true }))} />
          </div>
        </div>

        {/* RIGHT: team + status updates */}
        <div>
          {/* Team */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-h">Team</div>
            <div className="card" style={{ padding: "6px 10px 8px" }}>
              {(project.members ?? []).map((mem) => {
                const contact = data.contacts.find((c) => c.id === mem.contactId);
                if (!contact) return null;
                const who = contact.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={mem.contactId} className="task-row">
                    <Avatar who={who} size={24} color={contact.color} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{contact.name}</span>
                    {mem.role && <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{mem.role}</span>}
                    {contact.company && !mem.role && <span style={{ fontSize: 12, color: "var(--ink-4)" }}>{contact.company}</span>}
                    <button
                      className="icon-btn"
                      style={{ width: 24, height: 24, color: "var(--ink-4)" }}
                      onClick={() => updateProject(project.id, {
                        members: (project.members ?? []).filter((x) => x.contactId !== mem.contactId),
                      })}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
              {addingMember ? (
                <div className="task-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <select
                    className="input"
                    style={{ flex: 1, minWidth: 160, fontSize: 13 }}
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                  >
                    <option value="">Pick a contact…</option>
                    {data.contacts
                      .filter((c) => !(project.members ?? []).some((m) => m.contactId === c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.company ? ` — ${c.company}` : ""}
                        </option>
                      ))}
                  </select>
                  <input
                    className="input"
                    style={{ flex: 1, minWidth: 120, fontSize: 13 }}
                    placeholder="Project role (optional)"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newMemberId) {
                        updateProject(project.id, {
                          members: [...(project.members ?? []), { contactId: newMemberId, role: newMemberRole.trim() } as ProjectMember],
                        });
                        setNewMemberId(""); setNewMemberRole(""); setAddingMember(false);
                      }
                    }}
                  />
                  <button
                    className="btn btn-primary"
                    style={{ padding: "5px 11px", fontSize: 12 }}
                    onClick={() => {
                      if (!newMemberId) return;
                      updateProject(project.id, {
                        members: [...(project.members ?? []), { contactId: newMemberId, role: newMemberRole.trim() } as ProjectMember],
                      });
                      setNewMemberId(""); setNewMemberRole(""); setAddingMember(false);
                    }}
                  >
                    Add
                  </button>
                  <button className="btn btn-ghost" style={{ padding: "5px 11px", fontSize: 12 }} onClick={() => setAddingMember(false)}>Cancel</button>
                </div>
              ) : (
                <button
                  className="task-row"
                  style={{ width: "100%", color: "var(--ink-4)", fontSize: 13, gap: 11 }}
                  onClick={() => setAddingMember(true)}
                >
                  <span style={{ width: 18, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Plus size={13} />
                  </span>
                  Add team member
                </button>
              )}
            </div>
          </div>

          <div className="section-h">
            Status Updates
            <button
              onClick={() => setAdding((v) => !v)}
              style={{ marginLeft: "auto", color: "var(--accent-ink)", fontSize: 12, fontWeight: 550, display: "flex", alignItems: "center", gap: 5 }}
            >
              <Plus size={12} /> Add update
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {adding && (
              <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <textarea
                  className="input"
                  rows={3}
                  autoFocus
                  placeholder="What's the latest on this project?"
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={submitUpdate}>
                    Post update
                  </button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setAdding(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {project.updates.map((u) => (
              <div key={u.id} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Avatar who={u.who} size={24} />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                    {u.who === all.user.initials ? all.user.name : u.who}
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--ink-4)", marginLeft: "auto" }}>{u.when}</span>
                  <button
                    className="icon-btn"
                    style={{ color: "var(--ink-4)" }}
                    onClick={() => startEditUpdate(u)}
                    title="Edit update"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    className="icon-btn"
                    style={{ color: "var(--ink-4)" }}
                    onClick={() => deleteStatusUpdate(project.id, u.id)}
                    title="Delete update"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {editingUpdateId === u.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <textarea
                      className="input"
                      rows={3}
                      autoFocus
                      value={editUpdateText}
                      onChange={(e) => setEditUpdateText(e.target.value)}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={saveEditUpdate}>
                        Save
                      </button>
                      <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setEditingUpdateId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{u.text}</div>
                )}
                <button
                  className="btn btn-soft"
                  style={{ alignSelf: "flex-start", fontSize: 12, padding: "5px 10px" }}
                  onClick={() => setDraftFor(u)}
                >
                  <Sparkles size={13} /> Draft email
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project tasks (from the task lists, tagged to this project) */}
      <div style={{ marginTop: 28 }}>
        <div className="section-h">
          Project Tasks
          <span style={{ fontWeight: 400, color: "var(--ink-4)", marginLeft: 6 }}>
            — {projectTasks.filter(({ task }) => !task.done).length} open
          </span>
        </div>
        <div className="card" style={{ padding: "6px 10px 8px" }}>
          {projectTasks.length === 0 && (
            <div style={{ padding: "8px 4px", fontSize: 13, color: "var(--ink-4)" }}>
              No tasks yet. Add one below or tag this project on any task.
            </div>
          )}
          {projectTasks.map(({ task: t, list }) => (
            <div key={t.id} className="task-row">
              <TaskMarker task={t} onClick={() => toggleTask(t.id)} />
              <button
                style={{ flex: 1, fontSize: 13, textAlign: "left", cursor: "pointer" }}
                className={t.done ? "strike" : ""}
                onClick={() => setEditingTaskId(t.id)}
                title="Edit task"
              >
                {t.text}
              </button>
              <StateTag task={t} />
              <span className="chip" style={{ fontSize: 11, color: "var(--ink-3)" }}>{list}</span>
              <span className="chip context">{t.context}</span>
              {t.due && <span style={{ fontSize: 11.5, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{t.due}</span>}
            </div>
          ))}
          <AddProjectTaskRow projectTitle={project.title} />
        </div>
      </div>

      {draftFor && <DraftEmailPanel project={project} update={draftFor} close={() => setDraftFor(null)} />}
      {editingTaskId && <TaskEditPanel taskId={editingTaskId} close={() => setEditingTaskId(null)} />}

      {editingProject && (
        <ProjectModal
          initial={project}
          heading="Edit project"
          onSave={(patch) => updateProject(project.id, patch)}
          onDelete={() => { deleteProject(project.id); navigate("/projects"); }}
          close={() => setEditingProject(false)}
        />
      )}
    </div>
  );
}

/* ================= AI Draft Email side panel ================= */

function DraftEmailPanel({ project, update, close }: { project: Project; update: StatusUpdate; close: () => void }) {
  const { all } = useStore();
  const [stage, setStage] = useState<"loading" | "ready" | "error">("loading");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState(`${project.title} — status update`);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    draftStatusEmail(project, update, all.user)
      .then((draft) => { if (!cancelled) { setBody(draft); setStage("ready"); } })
      .catch(() => { if (!cancelled) setStage("error"); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doCopy = async () => {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const sendViaGmail = () => {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="overlay">
      <div className="overlay-bg" onClick={close} />
      <div className="side-panel">
        <div className="side-panel-head">
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
            <Sparkles size={15} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>AI Draft — Status Email</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{project.title}</div>
          </div>
          <button className="icon-btn" onClick={close}><X /></button>
        </div>

        <div className="side-panel-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">To</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="chip">priya@makeithappen.app</span>
              <span className="chip">team@makeithappen.app</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Subject</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ fontWeight: 500 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <label className="field-label" style={{ display: "flex", alignItems: "center" }}>
              Body
              {stage === "ready" && (
                <span style={{ marginLeft: "auto", color: "var(--accent-ink)", display: "flex", alignItems: "center", gap: 4, textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>
                  <Sparkles size={11} /> Generated by Claude
                </span>
              )}
            </label>
            {stage === "loading" ? (
              <div style={{ border: "1px solid var(--border)", borderRadius: 7, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {[100, 92, 78, 88, 60, 95, 40].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      height: 9, width: `${w}%`, borderRadius: 5,
                      background: "linear-gradient(90deg,var(--surface-2),var(--border),var(--surface-2))",
                      backgroundSize: "200% 100%",
                      animation: `shimmer 1.3s ${i * 0.08}s infinite linear`,
                    }}
                  />
                ))}
                <div style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
                  <Sparkles size={13} /> Claude is drafting from project context…
                </div>
              </div>
            ) : stage === "error" ? (
              <div style={{ border: "1px solid var(--border)", borderRadius: 7, padding: 16, fontSize: 13, color: "var(--danger)" }}>
                Couldn't reach the AI. Check your connection and retry, or add your Anthropic API key in Settings (⚙).
              </div>
            ) : (
              <textarea
                className="input"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ flex: 1, minHeight: 280, fontSize: 13 }}
              />
            )}
          </div>
        </div>

        <div className="side-panel-foot">
          <button className="btn btn-primary" disabled={stage !== "ready"} onClick={sendViaGmail}>
            <Mail /> Send via Gmail
          </button>
          <button className="btn btn-ghost" disabled={stage !== "ready"} onClick={doCopy}>
            {copied ? <><Check /> Copied</> : <><Copy /> Copy</>}
          </button>
          <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={close}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
