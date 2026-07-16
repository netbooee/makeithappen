import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar, CheckCircle2, ChevronDown, ChevronRight, ChevronUp,
  Download, Pencil, Plus, Sparkles, Trash2, UserRound, X,
} from "lucide-react";
import { useStore } from "../../store/store";
import { Avatar, StateTag, StatusChip, TaskMarker, fmtDue, isOverdue, toDateInputValue } from "../../components/ui";
import { TaskEditPanel } from "../../components/TaskEditPanel";
import { exportProjectHtml, exportProjectPdf } from "../../lib/exportHtml";
import type { ProjectMember, StatusUpdate, Task, UpdateType } from "../../lib/types";
import { KpiSection } from "./KpiSection";
import { MilestoneCard } from "./MilestoneCard";
import { AddMilestone } from "./AddMilestone";
import { ExternalTeamSection } from "./ExternalTeamSection";
import { StakeholderSection } from "./StakeholderSection";
import { ResourcesSection } from "./ResourcesSection";
import { RiskTracker } from "./RiskTracker";
import { IssueTracker } from "./IssueTracker";
import { UpdateTypeTag, UpdateTypePicker } from "./UpdateTypeTag";
import { DraftEmailPanel } from "./DraftEmailPanel";
import { AddProjectTaskRow } from "./AddProjectTaskRow";
import { MeetingAgendasSection } from "./MeetingAgendasSection";
import { ProjectModal } from "./ProjectModal";

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
  const [teamOpen, setTeamOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberRole, setEditMemberRole] = useState("");

  const seed = useMemo(() => {
    const map: Record<string, boolean> = {};
    project?.milestones.forEach((m) => { map[m.id] = false; });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

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
            {project.clientLogo && (
              <img
                src={project.clientLogo}
                alt=""
                style={{ width: 36, height: 36, borderRadius: 6, objectFit: "contain", flexShrink: 0, background: "var(--surface-2)", padding: 4 }}
              />
            )}
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
            <span className={`chip${isOverdue(project.due) ? " overdue" : ""}`}><Calendar /> Due {project.due}</span>
            <span className="chip"><CheckCircle2 /> {done}/{total} done</span>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11.5, padding: "4px 10px", gap: 5 }}
              onClick={() => exportProjectHtml(project, data.contacts, all.user.feedbackEmail ?? "")}
              title="Download self-contained HTML report"
            >
              <Download size={12} /> Export HTML
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11.5, padding: "4px 10px", gap: 5 }}
              onClick={() => exportProjectPdf(project, data.contacts)}
              title="Print / save as PDF (landscape)"
            >
              <Download size={12} /> Export PDF
            </button>
          </div>
        </div>
        {total > 0 && (() => {
          const pct = done / total;
          const r = 28;
          const circ = 2 * Math.PI * r;
          const allDone = done === total;
          return (
            <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}>
              <svg width="72" height="72" viewBox="0 0 72 72" style={{ display: "block" }}>
                <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
                <circle
                  cx="36" cy="36" r={r}
                  fill="none"
                  stroke={allDone ? "var(--next)" : "var(--accent)"}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - pct)}
                  transform="rotate(-90 36 36)"
                  style={{ transition: "stroke-dashoffset 0.4s ease" }}
                />
                <text x="36" y="33" textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--ink-1)">{Math.round(pct * 100)}%</text>
                <text x="36" y="47" textAnchor="middle" fontSize="10" fill="var(--ink-4)">{done}/{total}</text>
              </svg>
            </div>
          );
        })()}
      </div>

      <KpiSection project={project} />

      <div className="project-cols" style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20, alignItems: "start" }}>
        {/* LEFT: milestones */}
        <div style={{ minWidth: 0 }}>
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
        <div style={{ minWidth: 0 }}>
          {/* Team */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-h" style={{ cursor: "pointer", userSelect: "none" }} onClick={() => setTeamOpen((v) => !v)}>
              Internal Team
              <ChevronRight size={13} style={{ marginLeft: "auto", color: "var(--ink-4)", transition: "transform .18s", transform: teamOpen ? "rotate(90deg)" : "none" }} />
            </div>
            {teamOpen && <div className="card" style={{ padding: "6px 10px 8px" }}>
              {(project.members ?? []).map((mem, idx, arr) => {
                const contact = data.contacts.find((c) => c.id === mem.contactId);
                if (!contact) return null;
                const who = contact.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                const moveMember = (dir: -1 | 1) => {
                  const next = [...arr];
                  const ni = idx + dir;
                  if (ni < 0 || ni >= next.length) return;
                  [next[idx], next[ni]] = [next[ni], next[idx]];
                  updateProject(project.id, { members: next });
                };
                const startEditMember = () => {
                  setEditingMemberId(mem.contactId);
                  setEditMemberRole(mem.role ?? "");
                };
                const saveEditMember = () => {
                  updateProject(project.id, {
                    members: (project.members ?? []).map((m) =>
                      m.contactId === editingMemberId ? { ...m, role: editMemberRole.trim() } : m
                    ),
                  });
                  setEditingMemberId(null);
                };
                if (editingMemberId === mem.contactId) {
                  return (
                    <div key={mem.contactId} style={{ display: "flex", flexDirection: "column", gap: 7, padding: "6px 0 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Avatar who={who} size={24} color={contact.color} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{contact.name}</span>
                      </div>
                      <input
                        className="input"
                        autoFocus
                        placeholder="Project role"
                        value={editMemberRole}
                        onChange={(e) => setEditMemberRole(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEditMember()}
                        style={{ fontSize: 13 }}
                      />
                      <div style={{ display: "flex", gap: 7 }}>
                        <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={saveEditMember}>Save</button>
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setEditingMemberId(null)}>Cancel</button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={mem.contactId} className="task-row">
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                      <button className="icon-btn" style={{ width: 16, height: 14, color: idx === 0 ? "var(--border)" : "var(--ink-4)" }} onClick={() => moveMember(-1)} disabled={idx === 0}><ChevronUp size={10} /></button>
                      <button className="icon-btn" style={{ width: 16, height: 14, color: idx === arr.length - 1 ? "var(--border)" : "var(--ink-4)" }} onClick={() => moveMember(1)} disabled={idx === arr.length - 1}><ChevronDown size={10} /></button>
                    </div>
                    <Avatar who={who} size={24} color={contact.color} />
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{contact.name}</span>
                      {mem.role && <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{mem.role}</span>}
                      {contact.company && !mem.role && <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{contact.company}</span>}
                    </div>
                    <button
                      className="icon-btn"
                      style={{ width: 24, height: 24, color: "var(--ink-4)" }}
                      onClick={startEditMember}
                    >
                      <Pencil size={12} />
                    </button>
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

          <ExternalTeamSection project={project} />

          <StakeholderSection project={project} />

          <ResourcesSection project={project} />

          <div className="section-h" style={{ marginTop: 20, cursor: "pointer" }} onClick={() => setUpdatesOpen((v) => !v)}>
            <ChevronDown size={13} style={{ transition: "transform 0.2s", transform: updatesOpen ? "rotate(0deg)" : "rotate(-90deg)", color: "var(--ink-4)", flexShrink: 0 }} />
            Status Updates
            {updatesOpen && (
              <button
                onClick={(e) => { e.stopPropagation(); setAdding((v) => !v); }}
                style={{ marginLeft: "auto", color: "var(--accent-ink)", fontSize: 12, fontWeight: 550, display: "flex", alignItems: "center", gap: 5 }}
              >
                <Plus size={12} /> Add update
              </button>
            )}
          </div>
          {updatesOpen && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
          </div>}
        </div>
      </div>

      <RiskTracker project={project} />
      <IssueTracker project={project} />

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
              {t.due && (
                <span style={{ fontSize: 11.5, color: isOverdue(t.due, t.done) ? "var(--danger)" : "var(--ink-4)", whiteSpace: "nowrap" }}>
                  {fmtDue(t.due)}
                </span>
              )}
            </div>
          ))}
          <AddProjectTaskRow projectTitle={project.title} />
        </div>
      </div>

      <MeetingAgendasSection project={project} />

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
