import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar, Check, CheckCircle2, ChevronRight, Copy, Download, ExternalLink, Link2, Mail, Pencil, Plus, Sparkles, Trash2, UserRound, X,
} from "lucide-react";
import { useStore } from "../store/store";
import { Avatar, Bar, DateInput, DueChip, StateTag, StatusChip, TaskMarker, toDateInputValue } from "../components/ui";
import { TaskEditPanel } from "../components/TaskEditPanel";
import { SubtaskEditPanel } from "../components/SubtaskEditPanel";
import { draftStatusEmail } from "../lib/claude";
import { exportProjectHtml } from "../lib/exportHtml";
import { CONTEXTS } from "../lib/constants";
import type { Milestone, Project, ProjectMember, ProjectResource, ProjectRisk, RiskImpact, RiskProbability, RiskSeverity, RiskStatus, Status, StatusUpdate, Subtask, Task, TaskGroup, UpdateType } from "../lib/types";

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
  const [heroImage, setHeroImage] = useState(initial.heroImage ?? "");

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setHeroImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      desc: desc.trim(),
      due: due.trim() || "No date",
      status,
      owner: owner.trim() || all.user.initials,
      active: status === "active",
      heroImage: heroImage || undefined,
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
        <div>
          <div className="field-label" style={{ marginBottom: 7 }}>Cover image</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {heroImage && (
              <img src={heroImage} alt="" style={{ width: 52, height: 52, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
            )}
            <label style={{ cursor: "pointer" }}>
              <span className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px", pointerEvents: "none" }}>
                {heroImage ? "Replace image" : "Upload image"}
              </span>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageFile} />
            </label>
            {heroImage && (
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px", color: "var(--ink-4)" }} onClick={() => setHeroImage("")}>
                Remove
              </button>
            )}
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
              style={{ textAlign: "left", display: "flex", flexDirection: "row", gap: 14, cursor: "pointer", transition: "border-color .14s, box-shadow .14s", alignItems: "stretch" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
            >
              {p.heroImage && (
                <img
                  src={p.heroImage}
                  alt=""
                  style={{ width: 72, height: 72, borderRadius: 7, objectFit: "cover", flexShrink: 0, alignSelf: "center" }}
                />
              )}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
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
        {s.due && <DueChip due={s.due} />}
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
  const [editStart, setEditStart] = useState(m.start ?? "");
  const [editDue, setEditDue] = useState(m.due === "No date" ? "" : m.due);
  const [editStatus, setEditStatus] = useState<Status>(m.status);

  useEffect(() => {
    setEditTitle(m.title);
    setEditStart(m.start ?? "");
    setEditDue(m.due === "No date" ? "" : m.due);
    setEditStatus(m.status);
  }, [m.title, m.start, m.due, m.status]);

  const commitEdit = () => {
    updateMilestone(project.id, m.id, {
      title: editTitle.trim() || m.title,
      start: editStart.trim() || undefined,
      due: editDue.trim() || "No date",
      status: editStatus,
    });
    setEditing(false);
  };

  const statusDotColor =
    m.status === "complete" ? "var(--next)"
    : m.status === "active" ? "var(--accent)"
    : m.status === "waiting" ? "#8B5CF6"
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
            <div style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
            {showCount && !shown && (
              <span className="chip" style={{ color: total > 0 && done === total ? "var(--next)" : "var(--ink-3)" }}>
                <CheckCircle2 /> {done}/{total}
              </span>
            )}
            {m.start && <span style={{ fontSize: 11.5, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{m.start} →</span>}
            <DueChip due={m.due} />
            <StatusChip status={m.status} />
          </button>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: statusDotColor }} />
            <div style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
            {m.start && <span style={{ fontSize: 11.5, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{m.start} →</span>}
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
  const budgetStatus = project.onBudget === true ? "on" : project.onBudget === false ? "over" : "tbd";
  const BUDGET_META = {
    on:  { label: "✓ On budget",    color: "#10B981", bg: "color-mix(in oklab, #10B981 12%, transparent)", border: "color-mix(in oklab, #10B981 35%, transparent)" },
    over: { label: "⚠ Over budget", color: "#EF4444", bg: "color-mix(in oklab, #EF4444 12%, transparent)", border: "color-mix(in oklab, #EF4444 35%, transparent)" },
    tbd:  { label: "TBD",           color: "var(--ink-3)", bg: "var(--surface-2)", border: "var(--border)" },
  };

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

  const latestExec = project.updates.find((u) => u.type === "executive") ?? null;

  return (
    <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "auto 1fr 2fr 1fr", gap: 12, marginBottom: 24 }}>
      {/* Timeline (start → end) */}
      <div className="card" style={kpiCard}>
        <div style={kpiLabel}>Timeline</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <DateInput
            value={project.start}
            onChange={(v) => set({ start: v || undefined })}
            style={{ ...kpiInput, padding: "2px 0", width: 130 }}
            className=""
          />
          <span style={{ color: "var(--ink-4)", fontSize: 11, lineHeight: 1, paddingLeft: 2 }}>↓</span>
          <DateInput
            value={project.due}
            onChange={(v) => set({ due: v || "No date" })}
            style={{ ...kpiInput, padding: "2px 0", width: 130 }}
            className=""
          />
        </div>
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
          onClick={() => set({ onBudget: budgetStatus === "tbd" ? true : budgetStatus === "on" ? false : undefined })}
          style={{
            alignSelf: "flex-start", fontSize: 11.5, fontWeight: 600,
            padding: "2px 8px", borderRadius: 99, cursor: "pointer",
            border: `1px solid ${BUDGET_META[budgetStatus].border}`,
            background: BUDGET_META[budgetStatus].bg,
            color: BUDGET_META[budgetStatus].color,
          }}
        >
          {BUDGET_META[budgetStatus].label}
        </button>
      </div>

      {/* Executive update */}
      <div className="card" style={{ ...kpiCard, justifyContent: "space-between" }}>
        <div style={kpiLabel}>Executive Update</div>
        {latestExec ? (
          <>
            <div style={{
              fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, flex: 1,
              display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {latestExec.text}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>{latestExec.when}</div>
          </>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--ink-4)", fontStyle: "italic" }}>No executive updates yet.</div>
        )}
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
        <textarea
          style={{ ...kpiInput, fontSize: 13, fontWeight: 550, color: riskColor, flex: 1, resize: "none", lineHeight: 1.5, minHeight: 40 }}
          placeholder="e.g. On track"
          value={project.riskNote ?? ""}
          onChange={(e) => set({ riskNote: e.target.value || undefined })}
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
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const [adding, setAdding] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [editingProject, setEditingProject] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editUpdateText, setEditUpdateText] = useState("");
  const [updateType, setUpdateType] = useState<UpdateType>("update");
  const [editUpdateType, setEditUpdateType] = useState<UpdateType>("update");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [teamOpen, setTeamOpen] = useState(true);
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
    addUpdate(project.id, updateText.trim(), updateType);
    setUpdateText("");
    setUpdateType("update");
    setAdding(false);
  };

  const startEditUpdate = (u: StatusUpdate) => {
    setEditingUpdateId(u.id);
    setEditUpdateText(u.text);
    setEditUpdateType(u.type ?? "update");
  };

  const saveEditUpdate = () => {
    if (editingUpdateId && editUpdateText.trim()) {
      updateStatusUpdate(project.id, editingUpdateId, editUpdateText.trim(), editUpdateType);
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
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11.5, padding: "4px 10px", gap: 5 }}
              onClick={() => exportProjectHtml(project, data.contacts)}
              title="Download self-contained HTML report"
            >
              <Download size={12} /> Export HTML
            </button>
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
            {[...project.milestones]
              .sort((a, b) => {
                const da = toDateInputValue(a.due);
                const db = toDateInputValue(b.due);
                if (!da && !db) return 0;
                if (!da) return 1;
                if (!db) return -1;
                return da.localeCompare(db);
              })
              .map((m) => (
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
            <div className="section-h" style={{ cursor: "pointer", userSelect: "none" }} onClick={() => setTeamOpen((v) => !v)}>
              Team
              <ChevronRight size={13} style={{ marginLeft: "auto", color: "var(--ink-4)", transition: "transform .18s", transform: teamOpen ? "rotate(90deg)" : "none" }} />
            </div>
            {teamOpen && <div className="card" style={{ padding: "6px 10px 8px" }}>
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
            </div>}
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
                <UpdateTypePicker value={updateType} onChange={setUpdateType} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={submitUpdate}>
                    Post update
                  </button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => { setAdding(false); setUpdateType("update"); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {(showAllUpdates ? project.updates : project.updates.slice(0, 3)).map((u) => (
              <div key={u.id} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <UpdateTypeTag type={u.type ?? "update"} />
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
                    <UpdateTypePicker value={editUpdateType} onChange={setEditUpdateType} />
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
            {project.updates.length > 3 && (
              <button
                className="btn btn-ghost"
                style={{ alignSelf: "flex-start", fontSize: 12, padding: "5px 10px" }}
                onClick={() => setShowAllUpdates((v) => !v)}
              >
                {showAllUpdates ? "Show less" : `Show ${project.updates.length - 3} older`}
              </button>
            )}
          </div>

          {/* Resources */}
          <ResourcesSection project={project} />
        </div>
      </div>

      <RiskTracker project={project} />

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

/* ================= Resources section ================= */

function ResourcesSection({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const resources = project.resources ?? [];

  const normalizeUrl = (raw: string) =>
    raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;

  const add = () => {
    if (!url.trim()) return;
    const normalized = normalizeUrl(url.trim());
    const entry: ProjectResource = {
      id: "r" + Date.now(),
      label: label.trim() || new URL(normalized).hostname.replace(/^www\./, ""),
      url: normalized,
    };
    updateProject(project.id, { resources: [...resources, entry] });
    setLabel(""); setUrl(""); setAdding(false);
  };

  const remove = (id: string) =>
    updateProject(project.id, { resources: resources.filter((r) => r.id !== id) });

  const startEdit = (r: ProjectResource) => {
    setEditingId(r.id); setEditLabel(r.label); setEditUrl(r.url);
  };

  const saveEdit = () => {
    if (!editUrl.trim() || !editingId) return;
    const normalized = normalizeUrl(editUrl.trim());
    updateProject(project.id, {
      resources: resources.map((r) =>
        r.id === editingId
          ? { ...r, label: editLabel.trim() || new URL(normalized).hostname.replace(/^www\./, ""), url: normalized }
          : r
      ),
    });
    setEditingId(null);
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div className="section-h">
        Resources
        <button
          onClick={() => setAdding((v) => !v)}
          style={{ marginLeft: "auto", color: "var(--accent-ink)", fontSize: 12, fontWeight: 550, display: "flex", alignItems: "center", gap: 5 }}
        >
          <Plus size={12} /> Add link
        </button>
      </div>
      <div className="card" style={{ padding: "6px 10px 8px" }}>
        {adding && (
          <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "6px 0 8px" }}>
            <input
              className="input"
              placeholder="URL (e.g. notion.so/…)"
              value={url}
              autoFocus
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              style={{ fontSize: 13 }}
            />
            <input
              className="input"
              placeholder="Label (optional — defaults to domain)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              style={{ fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 7 }}>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={add}>Add</button>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => { setAdding(false); setLabel(""); setUrl(""); }}>Cancel</button>
            </div>
          </div>
        )}
        {resources.length === 0 && !adding && (
          <div style={{ padding: "10px 4px", fontSize: 13, color: "var(--ink-4)" }}>No resources yet.</div>
        )}
        {resources.map((r) =>
          editingId === r.id ? (
            <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 7, padding: "6px 0 8px" }}>
              <input className="input" autoFocus placeholder="URL" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} style={{ fontSize: 13 }} />
              <input className="input" placeholder="Label (optional)" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} style={{ fontSize: 13 }} />
              <div style={{ display: "flex", gap: 7 }}>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={saveEdit}>Save</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div key={r.id} className="task-row">
              <Link2 size={13} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
              <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 13, color: "var(--accent-ink)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.label}
              </a>
              <ExternalLink size={11} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
              <button className="icon-btn" style={{ width: 24, height: 24, color: "var(--ink-4)" }} onClick={() => startEdit(r)} title="Edit link"><Pencil size={12} /></button>
              <button className="icon-btn" style={{ width: 24, height: 24, color: "var(--ink-4)" }} onClick={() => remove(r.id)}><X size={13} /></button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ================= Risk tracker ================= */

const SEVERITY_MATRIX: Record<RiskProbability, Record<RiskImpact, RiskSeverity>> = {
  low:    { low: "low",    medium: "low",    high: "medium"   },
  medium: { low: "low",    medium: "medium", high: "high"     },
  high:   { low: "medium", medium: "high",   high: "critical" },
};

const SEV_STYLE: Record<RiskSeverity, React.CSSProperties> = {
  low:      { background: "color-mix(in oklab,#10B981 14%,transparent)", color: "#059669", border: "1px solid color-mix(in oklab,#10B981 28%,transparent)" },
  medium:   { background: "color-mix(in oklab,#F59E0B 14%,transparent)", color: "#B45309", border: "1px solid color-mix(in oklab,#F59E0B 28%,transparent)" },
  high:     { background: "color-mix(in oklab,#F97316 14%,transparent)", color: "#C2410C", border: "1px solid color-mix(in oklab,#F97316 28%,transparent)" },
  critical: { background: "color-mix(in oklab,#EF4444 14%,transparent)", color: "#DC2626", border: "1px solid color-mix(in oklab,#EF4444 28%,transparent)" },
};

const RSTATUS_STYLE: Record<RiskStatus, React.CSSProperties> = {
  open:      { background: "color-mix(in oklab,#EF4444 12%,transparent)", color: "#DC2626" },
  mitigated: { background: "color-mix(in oklab,#F59E0B 12%,transparent)", color: "#B45309" },
  closed:    { background: "color-mix(in oklab,#10B981 12%,transparent)", color: "#059669" },
};

const RISK_CATEGORIES = ["Technical", "Resource", "Schedule", "Budget", "External", "Other"];

const riskPill: React.CSSProperties = {
  display: "inline-block", fontSize: 11, fontWeight: 600,
  padding: "2px 7px", borderRadius: 99, textTransform: "capitalize", whiteSpace: "nowrap",
};

function calcSeverity(prob: RiskProbability, imp: RiskImpact): RiskSeverity {
  return SEVERITY_MATRIX[prob][imp];
}

function RiskForm({
  initial, onSave, onCancel,
}: {
  initial?: ProjectRisk;
  onSave: (r: Omit<ProjectRisk, "id">) => void;
  onCancel: () => void;
}) {
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [cat, setCat] = useState(initial?.category ?? "Technical");
  const [prob, setProb] = useState<RiskProbability>(initial?.probability ?? "medium");
  const [impact, setImpact] = useState<RiskImpact>(initial?.impact ?? "medium");
  const [status, setStatus] = useState<RiskStatus>(initial?.status ?? "open");
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [mitigation, setMitigation] = useState(initial?.mitigation ?? "");

  const save = () => {
    if (!desc.trim()) return;
    onSave({
      description: desc.trim(), category: cat, probability: prob, impact, status,
      ...(owner.trim() ? { owner: owner.trim() } : {}),
      ...(mitigation.trim() ? { mitigation: mitigation.trim() } : {}),
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0 4px" }}>
      <input
        className="input"
        autoFocus
        placeholder="Risk description…"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select className="input" style={{ flex: 1, minWidth: 110, fontSize: 12.5 }} value={cat} onChange={(e) => setCat(e.target.value)}>
          {RISK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input" style={{ flex: 1, minWidth: 110, fontSize: 12.5 }} value={prob} onChange={(e) => setProb(e.target.value as RiskProbability)}>
          <option value="low">Prob: Low</option>
          <option value="medium">Prob: Medium</option>
          <option value="high">Prob: High</option>
        </select>
        <select className="input" style={{ flex: 1, minWidth: 110, fontSize: 12.5 }} value={impact} onChange={(e) => setImpact(e.target.value as RiskImpact)}>
          <option value="low">Impact: Low</option>
          <option value="medium">Impact: Medium</option>
          <option value="high">Impact: High</option>
        </select>
        <select className="input" style={{ flex: 1, minWidth: 110, fontSize: 12.5 }} value={status} onChange={(e) => setStatus(e.target.value as RiskStatus)}>
          <option value="open">Open</option>
          <option value="mitigated">Mitigated</option>
          <option value="closed">Closed</option>
        </select>
        <input className="input" style={{ flex: 1, minWidth: 110, fontSize: 12.5 }} placeholder="Owner (optional)" value={owner} onChange={(e) => setOwner(e.target.value)} />
      </div>
      <input
        className="input"
        style={{ fontSize: 12.5 }}
        placeholder="Mitigation / response plan (optional)"
        value={mitigation}
        onChange={(e) => setMitigation(e.target.value)}
      />
      <div style={{ display: "flex", gap: 7 }}>
        <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={save}>Save</button>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function RiskTracker({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const risks = project.risks ?? [];
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const saveNew = (data: Omit<ProjectRisk, "id">) => {
    updateProject(project.id, { risks: [...risks, { id: "risk" + Date.now(), ...data }] });
    setAdding(false);
  };

  const saveEdit = (id: string, data: Omit<ProjectRisk, "id">) => {
    updateProject(project.id, { risks: risks.map((r) => r.id === id ? { id, ...data } : r) });
    setEditingId(null);
  };

  const remove = (id: string) =>
    updateProject(project.id, { risks: risks.filter((r) => r.id !== id) });

  const openCount = risks.filter((r) => r.status === "open").length;

  return (
    <div style={{ marginTop: 28 }}>
      <div className="section-h">
        Risk Register
        {openCount > 0 && (
          <span style={{ ...riskPill, ...SEV_STYLE.high, marginLeft: 8, fontSize: 10.5 }}>{openCount} open</span>
        )}
        <button
          onClick={() => { setAdding((v) => !v); setEditingId(null); }}
          style={{ marginLeft: "auto", color: "var(--accent-ink)", fontSize: 12, fontWeight: 550, display: "flex", alignItems: "center", gap: 5 }}
        >
          <Plus size={12} /> Add risk
        </button>
      </div>
      <div className="card" style={{ padding: "6px 10px 8px" }}>
        {adding && (
          <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 4, paddingBottom: 8 }}>
            <RiskForm onSave={saveNew} onCancel={() => setAdding(false)} />
          </div>
        )}
        {risks.length === 0 && !adding && (
          <div style={{ padding: "10px 4px", fontSize: 13, color: "var(--ink-4)" }}>No risks logged yet.</div>
        )}
        {risks.length > 0 && (
          <div style={{ display: "flex", gap: 10, padding: "4px 4px 6px", borderBottom: "1px solid var(--border)", marginBottom: 2 }}>
            {(["Severity", "Risk", "Category", "P", "I", "Status", "Owner", ""] as const).map((h, i) => (
              <span
                key={i}
                style={{
                  fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  width: h === "Risk" ? undefined : h === "" ? 48 : h === "P" || h === "I" ? 36 : h === "Severity" ? 68 : h === "Owner" ? 60 : 80,
                  flex: h === "Risk" ? 1 : undefined,
                  flexShrink: h === "Risk" ? undefined : 0,
                  textAlign: h === "P" || h === "I" ? "center" : undefined,
                }}
              >
                {h}
              </span>
            ))}
          </div>
        )}
        {risks.map((r) => {
          const sev = calcSeverity(r.probability, r.impact);
          if (editingId === r.id) {
            return (
              <div key={r.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 4 }}>
                <RiskForm initial={r} onSave={(d) => saveEdit(r.id, d)} onCancel={() => setEditingId(null)} />
              </div>
            );
          }
          return (
            <div key={r.id} style={{ display: "flex", gap: 10, padding: "7px 4px", borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
              <span style={{ width: 68, flexShrink: 0 }}>
                <span style={{ ...riskPill, ...SEV_STYLE[sev] }}>{sev}</span>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{r.description}</div>
                {r.mitigation && (
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.4 }}>↳ {r.mitigation}</div>
                )}
              </div>
              <span style={{ width: 80, flexShrink: 0 }}>
                <span className="chip" style={{ fontSize: 11 }}>{r.category}</span>
              </span>
              <span style={{ width: 36, flexShrink: 0, textAlign: "center" as const }}>
                <span style={{ ...riskPill, fontSize: 10.5, padding: "2px 5px", background: "var(--surface-2)", color: "var(--ink-3)", border: "none" }}>
                  {r.probability[0].toUpperCase()}
                </span>
              </span>
              <span style={{ width: 36, flexShrink: 0, textAlign: "center" as const }}>
                <span style={{ ...riskPill, fontSize: 10.5, padding: "2px 5px", background: "var(--surface-2)", color: "var(--ink-3)", border: "none" }}>
                  {r.impact[0].toUpperCase()}
                </span>
              </span>
              <span style={{ width: 80, flexShrink: 0 }}>
                <span style={{ ...riskPill, ...RSTATUS_STYLE[r.status] }}>{r.status}</span>
              </span>
              <span style={{ width: 60, flexShrink: 0, fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.owner ?? "—"}
              </span>
              <div style={{ width: 48, flexShrink: 0, display: "flex", gap: 2 }}>
                <button
                  className="icon-btn"
                  style={{ width: 22, height: 22, color: "var(--ink-4)" }}
                  onClick={() => { setEditingId(r.id); setAdding(false); }}
                  title="Edit risk"
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="icon-btn"
                  style={{ width: 22, height: 22, color: "var(--ink-4)" }}
                  onClick={() => remove(r.id)}
                  title="Delete risk"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= Update type label ================= */

const UPDATE_TYPE_META: Record<UpdateType, { label: string; bg: string; color: string }> = {
  "update":    { label: "Update",    bg: "var(--surface-2)",        color: "var(--ink-3)"  },
  "heads-up":  { label: "Heads up",  bg: "rgba(245,158,11,.13)",    color: "#B45309"       },
  "blocked":   { label: "Blocked",   bg: "rgba(239,68,68,.13)",     color: "#DC2626"       },
  "win":       { label: "Win",       bg: "rgba(16,185,129,.13)",    color: "#059669"       },
  "executive": { label: "Executive", bg: "rgba(99,102,241,.13)",    color: "#4338CA"       },
};

function UpdateTypeTag({ type }: { type: UpdateType }) {
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

function UpdateTypePicker({ value, onChange }: { value: UpdateType; onChange: (t: UpdateType) => void }) {
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

/* ================= AI Draft Email side panel ================= */

function DraftEmailPanel({ project, update, close }: { project: Project; update: StatusUpdate; close: () => void }) {
  const { all } = useStore();
  const [stage, setStage] = useState<"loading" | "ready" | "error">("loading");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState(`${project.title} — status update`);
  const [copied, setCopied] = useState(false);

  const allContacts = [...all.work.contacts, ...all.personal.contacts];
  const toEmails = (project.members ?? [])
    .map((m) => allContacts.find((c) => c.id === m.contactId))
    .filter((c): c is NonNullable<typeof c> => !!c && !!c.email)
    .map((c) => c.email);

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

  const toParam = toEmails.join(",");

  const sendViaGmail = () => {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toParam)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
  };

  const sendViaOutlook = () => {
    const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(toParam)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
              {toEmails.length > 0
                ? toEmails.map((email) => <span key={email} className="chip">{email}</span>)
                : <span style={{ fontSize: 12.5, color: "var(--ink-4)", fontStyle: "italic" }}>No team member emails on file</span>
              }
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
            <Mail /> Gmail
          </button>
          <button className="btn btn-primary" disabled={stage !== "ready"} onClick={sendViaOutlook}>
            <Mail /> Outlook
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
