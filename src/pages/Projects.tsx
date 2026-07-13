import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlignLeft, AlertCircle, Calendar, Check, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Copy, Download, ExternalLink, LayoutGrid, Link2, List, Mail, Pencil, Plus, Sparkles, Trash2, UserRound, X,
} from "lucide-react";
import { useStore } from "../store/store";
import { Avatar, Bar, DateInput, DueChip, StateTag, StatusChip, TaskMarker, fmtDue, isOverdue, toDateInputValue } from "../components/ui";
import { TaskEditPanel } from "../components/TaskEditPanel";
import { SubtaskEditPanel } from "../components/SubtaskEditPanel";
import { draftStatusEmail } from "../lib/claude";
import { exportAgendaHtml, exportProjectHtml, exportProjectPdf } from "../lib/exportHtml";
import { CONTEXTS } from "../lib/constants";
import type { AgendaAttendee, AgendaItem, ExternalTeamMember, IssueSeverity, IssueStatus, MeetingAgenda, Milestone, Project, ProjectIssue, ProjectMember, ProjectResource, ProjectRisk, ProjectStakeholder, RiskImpact, RiskProbability, RiskSeverity, RiskStatus, StakeholderSatisfaction, Status, StatusUpdate, Subtask, Task, TaskGroup, UpdateType } from "../lib/types";

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
  const [clientLogo, setClientLogo] = useState(initial.clientLogo ?? "");
  const [webUrl, setWebUrl] = useState(initial.webUrl ?? "");

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setHeroImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setClientLogo(reader.result as string);
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
      clientLogo: clientLogo || undefined,
      webUrl: webUrl.trim() || undefined,
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
          <div className="field-label" style={{ marginBottom: 7 }}>Client logo</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {clientLogo && (
              <img src={clientLogo} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "contain", flexShrink: 0, background: "var(--surface-2)", padding: 4 }} />
            )}
            <label style={{ cursor: "pointer" }}>
              <span className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px", pointerEvents: "none" }}>
                {clientLogo ? "Replace logo" : "Upload logo"}
              </span>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoFile} />
            </label>
            {clientLogo && (
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px", color: "var(--ink-4)" }} onClick={() => setClientLogo("")}>
                Remove
              </button>
            )}
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
        <div>
          <div className="field-label" style={{ marginBottom: 7 }}>Project URL</div>
          <input
            className="input"
            type="url"
            placeholder="https://…"
            value={webUrl}
            onChange={(e) => setWebUrl(e.target.value)}
          />
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
  const { data, addProject, all } = useStore();
  const navigate = useNavigate();
  const projects = data.projects;
  const [adding, setAdding] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => (localStorage.getItem("projects-view") as "grid" | "table") ?? "grid");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const resolveOwner = (owner: string) => {
    if (owner.includes(" ")) return owner;
    if (all.user.initials === owner) return all.user.name;
    const contacts = [...all.work.contacts, ...all.personal.contacts];
    const match = contacts.find((c) => {
      const ci = c.name.split(" ").map((w) => w[0].toUpperCase()).join("");
      return ci === owner.toUpperCase();
    });
    return match?.name ?? owner;
  };

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const statusOrder: Record<string, number> = { "not-started": 0, scheduled: 1, "in-progress": 2, active: 3, "on-hold": 4, completed: 5 };
  const riskOrder: Record<string, number> = { green: 0, amber: 1, red: 2 };

  const sortedProjects = sortCol ? [...projects].sort((a, b) => {
    let av: string | number = 0, bv: string | number = 0;
    if (sortCol === "name") { av = a.title.toLowerCase(); bv = b.title.toLowerCase(); }
    else if (sortCol === "status") { av = statusOrder[a.status] ?? 99; bv = statusOrder[b.status] ?? 99; }
    else if (sortCol === "progress") { av = a.progress; bv = b.progress; }
    else if (sortCol === "risk") { av = riskOrder[a.risk ?? ""] ?? 99; bv = riskOrder[b.risk ?? ""] ?? 99; }
    else if (sortCol === "due") {
      const da = toDateInputValue(a.due) ?? "9999"; const db = toDateInputValue(b.due) ?? "9999";
      av = da; bv = db;
    }
    else if (sortCol === "owner") { av = resolveOwner(a.owner).toLowerCase(); bv = resolveOwner(b.owner).toLowerCase(); }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  }) : projects;

  return (
    <div className="page fade">
      <div className="page-head" style={{ display: "flex", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div className="page-title">Projects</div>
          <div className="page-sub">
            {projects.filter((p) => p.status === "active").length} active · {projects.length} total
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden" }}>
            <button
              className="btn"
              onClick={() => { setViewMode("grid"); localStorage.setItem("projects-view", "grid"); }}
              style={{ borderRadius: 0, border: "none", padding: "6px 10px", background: viewMode === "grid" ? "var(--surface-2)" : "transparent", color: viewMode === "grid" ? "var(--ink)" : "var(--ink-3)" }}
              title="Grid view"
            ><LayoutGrid size={15} /></button>
            <button
              className="btn"
              onClick={() => { setViewMode("table"); localStorage.setItem("projects-view", "table"); }}
              style={{ borderRadius: 0, border: "none", borderLeft: "1px solid var(--border)", padding: "6px 10px", background: viewMode === "table" ? "var(--surface-2)" : "transparent", color: viewMode === "table" ? "var(--ink)" : "var(--ink-3)" }}
              title="Table view"
            ><List size={15} /></button>
          </div>
          <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus /> New project</button>
        </div>
      </div>

      {viewMode === "grid" ? (
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
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  {p.heroImage && (
                    <img
                      src={p.heroImage}
                      alt=""
                      style={{ width: 72, height: 72, borderRadius: 7, objectFit: "cover", flexShrink: 0, alignSelf: "flex-start" }}
                    />
                  )}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", flex: 1 }}>{p.title}</div>
                      <StatusChip status={p.status} />
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>{p.desc}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  {[...p.milestones].sort((a, b) => { const da = toDateInputValue(a.due), db = toDateInputValue(b.due); if (!da && !db) return 0; if (!da) return 1; if (!db) return -1; return da.localeCompare(db); }).map((m) => {
                    const bg = m.status === "complete" ? "var(--next)" : m.status === "active" ? "var(--accent)" : m.status === "waiting" ? "var(--ink-4)" : "#F59E0B";
                    return <div key={m.id} style={{ height: 6, width: 28, borderRadius: 3, background: bg, flexShrink: 0 }} title={`${m.title} — ${m.status}`} />;
                  })}
                </div>
                <Bar value={p.progress} />
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--ink-3)" }}>
                  {p.risk ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 500, color: p.risk === "green" ? "var(--next)" : p.risk === "amber" ? "#F59E0B" : "var(--danger)" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.risk === "green" ? "#10B981" : p.risk === "amber" ? "#F59E0B" : "#EF4444", display: "inline-block", flexShrink: 0 }} />
                      {p.risk === "green" ? "On track" : p.risk === "amber" ? "At risk" : "Off track"}
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <CheckCircle2 size={13} /> {done}/{total} subtasks
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: isOverdue(p.due) ? "var(--danger)" : undefined }}>
                    <Calendar size={13} /> {p.due}
                  </span>
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                    <UserRound size={13} /> {resolveOwner(p.owner)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {(["name", "status", null, "progress", "risk", "due", "owner"] as const).map((col, i) => {
                  const labels = ["Name", "Status", "Milestones", "Progress", "Risk", "Due", "Owner"];
                  const active = col && sortCol === col;
                  return (
                    <th
                      key={i}
                      onClick={col ? () => toggleSort(col) : undefined}
                      style={{ padding: "9px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: active ? "var(--ink)" : "var(--ink-3)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", cursor: col ? "pointer" : "default", userSelect: "none" }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        {labels[i]}
                        {col && (active ? (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronUp size={11} style={{ opacity: 0.25 }} />)}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((p) => {
                const total = p.milestones.reduce((a, m) => a + m.subtasks.length, 0);
                const done = p.milestones.reduce((a, m) => a + m.subtasks.filter((s) => s.done).length, 0);
                const sortedMilestones = [...p.milestones].sort((a, b) => { const da = toDateInputValue(a.due), db = toDateInputValue(b.due); if (!da && !db) return 0; if (!da) return 1; if (!db) return -1; return da.localeCompare(db); });
                return (
                  <tr key={p.id} className="clickable" onClick={() => navigate(`/projects/${p.id}`)}>
                    <td className="td-primary" style={{ padding: "10px 12px", minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {p.heroImage ? (
                          <img
                            src={p.heroImage}
                            alt=""
                            style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: "var(--surface-2)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "var(--ink-3)" }}>
                            {p.title.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div>
                          {p.desc && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2, fontWeight: 400 }}>{p.desc}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <StatusChip status={p.status} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                        {sortedMilestones.map((m) => {
                          const bg = m.status === "complete" ? "var(--next)" : m.status === "active" ? "var(--accent)" : m.status === "waiting" ? "var(--ink-4)" : "#F59E0B";
                          return <div key={m.id} style={{ height: 6, width: 20, borderRadius: 3, background: bg, flexShrink: 0 }} title={`${m.title} — ${m.status}`} />;
                        })}
                        {sortedMilestones.length === 0 && <span style={{ color: "var(--ink-4)", fontSize: 12 }}>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", minWidth: 100 }}>
                      <Bar value={p.progress} />
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      {p.risk ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: p.risk === "green" ? "var(--next)" : p.risk === "amber" ? "#F59E0B" : "var(--danger)" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.risk === "green" ? "#10B981" : p.risk === "amber" ? "#F59E0B" : "#EF4444", display: "inline-block", flexShrink: 0 }} />
                          {p.risk === "green" ? "On track" : p.risk === "amber" ? "At risk" : "Off track"}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={12} /> {done}/{total}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap", fontSize: 12, color: isOverdue(p.due) ? "var(--danger)" : "var(--ink-3)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> {p.due}</span>
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap", fontSize: 12, color: "var(--ink-3)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><UserRound size={12} /> {resolveOwner(p.owner)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
      <div className="task-row" style={{ gap: 8, alignItems: "flex-start" }}>
        <TaskMarker task={s} onClick={() => toggleSubtask(projectId, milestoneId, s.id)} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              style={{ flex: 1, fontSize: 13, textAlign: "left", cursor: "pointer" }}
              onClick={() => setPanelOpen(true)}
              title="Edit task"
            >
              {s.t}
            </button>
            <StateTag task={s} />
            {s.due && <DueChip due={s.due} done={s.done} />}
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
          {s.notes && (
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
            <DueChip due={m.due} />
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
                {t.notes && (
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

/* ================= KPI bar ================= */

const RAG = { green: "#10B981", amber: "#F59E0B", red: "#EF4444" } as const;

function KpiSection({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const set = (patch: Partial<Project>) => updateProject(project.id, patch);

  const riskColor = project.risk ? RAG[project.risk] : "var(--ink-3)";
  const parseBudget = (s: string | undefined): number | null => {
    if (!s) return null;
    const c = s.replace(/[$,\s]/g, "");
    const k = c.match(/^([\d.]+)[kK]$/), m = c.match(/^([\d.]+)[mM]$/);
    if (k) return parseFloat(k[1]) * 1000;
    if (m) return parseFloat(m[1]) * 1_000_000;
    const n = parseFloat(c); return isNaN(n) ? null : n;
  };
  const fmtBudget = (n: number): string => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
    return `$${Math.round(n).toLocaleString()}`;
  };
  const totalVal = parseBudget(project.budget);
  const spentVal = parseBudget(project.budgetSpent);
  const remainingVal = totalVal !== null && spentVal !== null ? totalVal - spentVal : null;

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
  const [execExpanded, setExecExpanded] = useState(false);

  return (
    <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr 2fr", gap: 12, marginBottom: 24 }}>
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

      {/* Timeline */}
      <div className="card" style={kpiCard}>
        <div style={kpiLabel}>Timeline</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {([
            { sub: "Start", val: project.start, onChange: (v: string) => set({ start: v || undefined }) },
            { sub: "Due",   val: project.due,   onChange: (v: string) => set({ due: v || "No date" }) },
          ] as const).map(({ sub, val, onChange }) => (
            <div key={sub} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{sub}</span>
              <DateInput value={val} onChange={onChange} style={{ ...kpiInput, fontSize: 13, padding: "2px 0", width: 130 }} className="" />
            </div>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="card" style={kpiCard}>
        <div style={kpiLabel}>Budget</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {([
            { sub: "Total Budget", val: project.budget, onChange: (v: string) => set({ budget: v || undefined }), placeholder: "e.g. $50,000" },
            { sub: "Actual Cost",  val: project.budgetSpent, onChange: (v: string) => set({ budgetSpent: v || undefined }), placeholder: "e.g. $12,000" },
          ] as const).map(({ sub, val, onChange, placeholder }) => (
            <div key={sub} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{sub}</span>
              <input style={{ ...kpiInput, fontSize: 13 }} placeholder={placeholder} value={val ?? ""} onChange={(e) => onChange(e.target.value)} />
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Remaining</span>
            <span style={{ fontSize: 13, fontWeight: 650, color: remainingVal === null ? "var(--ink-4)" : remainingVal < 0 ? "#EF4444" : "#10B981" }}>
              {remainingVal !== null ? fmtBudget(remainingVal) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Executive update */}
      <div className="card" style={{ ...kpiCard, justifyContent: "space-between" }}>
        <div style={kpiLabel}>Executive Update</div>
        {latestExec ? (
          <>
            <div style={{
              fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, flex: 1,
              ...(!execExpanded ? { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}),
            }}>
              {latestExec.text}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: "var(--ink-4)" }}>{latestExec.when}</span>
              <button onClick={() => setExecExpanded((v) => !v)} style={{ fontSize: 11, color: "var(--accent)", fontWeight: 550, marginLeft: "auto" }}>
                {execExpanded ? "Show less" : "Read more"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--ink-4)", fontStyle: "italic" }}>No executive updates yet.</div>
        )}
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
  const [teamOpen, setTeamOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");

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

/* ================= Meeting Agendas section ================= */

function fmtAgendaDate(str: string): string {
  if (!str) return "";
  const iso = toDateInputValue(str);
  if (!iso) return str;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return str;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function MeetingAgendasSection({ project }: { project: Project }) {
  const { data, updateProject, all } = useStore();

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [nTitle, setNTitle] = useState("");
  const [nDate, setNDate] = useState("");
  const [nAttendees, setNAttendees] = useState<AgendaAttendee[]>([]);
  const [nItems, setNItems] = useState<AgendaItem[]>([]);
  const [nItemText, setNItemText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eDate, setEDate] = useState("");
  const [eAttendees, setEAttendees] = useState<AgendaAttendee[]>([]);
  const [itemInputs, setItemInputs] = useState<Record<string, string>>({});
  const [editingItemKey, setEditingItemKey] = useState<{ agendaId: string; itemId: string } | null>(null);
  const [editingItemText, setEditingItemText] = useState("");
  const [openAgendas, setOpenAgendas] = useState<Set<string>>(new Set());
  const [linkInputs, setLinkInputs] = useState<Record<string, { label: string; url: string }>>({});
  const [detailOpen, setDetailOpen] = useState<Set<string>>(new Set());

  const agendas = useMemo(
    () => [...(project.agendas ?? [])].sort((a, b) => {
      const da = toDateInputValue(a.date), db = toDateInputValue(b.date);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db.localeCompare(da);
    }),
    [project.agendas],
  );

  type AttInfo = { att: AgendaAttendee; name: string; ini: string; color?: string };
  const pool = useMemo<AttInfo[]>(() => {
    const out: AttInfo[] = [];
    for (const mem of project.members ?? []) {
      const c = data.contacts.find((x) => x.id === mem.contactId);
      if (!c) continue;
      const ini = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      out.push({ att: { kind: "internal", id: mem.contactId }, name: c.name, ini, color: c.color });
    }
    for (const ext of project.externalTeam ?? []) {
      const ini = ext.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      out.push({ att: { kind: "external", id: ext.id }, name: ext.name, ini });
    }
    for (const sh of project.stakeholders ?? []) {
      const ini = sh.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      out.push({ att: { kind: "stakeholder", id: sh.id }, name: sh.name, ini });
    }
    return out;
  }, [project.members, project.externalTeam, project.stakeholders, data.contacts]);

  const resolve = (att: AgendaAttendee) =>
    pool.find((p) => p.att.kind === att.kind && p.att.id === att.id);

  const toggleCheck = (aId: string, iId: string) => {
    const key = `${aId}:${iId}`;
    setChecked((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };

  const addNItem = () => {
    if (!nItemText.trim()) return;
    setNItems((p) => [...p, { id: "i" + Date.now(), text: nItemText.trim() }]);
    setNItemText("");
  };

  const createMeeting = () => {
    if (!nTitle.trim()) return;
    updateProject(project.id, {
      agendas: [...(project.agendas ?? []), { id: "ag" + Date.now(), title: nTitle.trim(), date: nDate, attendees: nAttendees, items: nItems }],
    });
    setAdding(false);
    setNTitle(""); setNDate(""); setNAttendees([]); setNItems([]); setNItemText("");
  };

  const deleteMeeting = (id: string) =>
    updateProject(project.id, { agendas: (project.agendas ?? []).filter((a) => a.id !== id) });

  const addItem = (agendaId: string) => {
    const text = (itemInputs[agendaId] ?? "").trim();
    if (!text) return;
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === agendaId ? { ...a, items: [...a.items, { id: "i" + Date.now(), text }] } : a
      ),
    });
    setItemInputs((p) => ({ ...p, [agendaId]: "" }));
  };

  const removeItem = (agendaId: string, itemId: string) =>
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === agendaId ? { ...a, items: a.items.filter((i) => i.id !== itemId) } : a
      ),
    });

  const saveItemEdit = () => {
    if (!editingItemKey || !editingItemText.trim()) { setEditingItemKey(null); return; }
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === editingItemKey.agendaId
          ? { ...a, items: a.items.map((i) => i.id === editingItemKey.itemId ? { ...i, text: editingItemText.trim() } : i) }
          : a
      ),
    });
    setEditingItemKey(null);
  };

  const toggleAgendaOpen = (id: string) =>
    setOpenAgendas((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const addLink = (agendaId: string) => {
    const inp = linkInputs[agendaId];
    if (!inp?.url?.trim()) return;
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === agendaId
          ? { ...a, resources: [...(a.resources ?? []), { id: "lr" + Date.now(), label: inp.label.trim() || inp.url.trim(), url: inp.url.trim() }] }
          : a
      ),
    });
    setLinkInputs((p) => ({ ...p, [agendaId]: { label: "", url: "" } }));
  };

  const removeLink = (agendaId: string, linkId: string) =>
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === agendaId ? { ...a, resources: (a.resources ?? []).filter((r) => r.id !== linkId) } : a
      ),
    });

  const toggleDetail = (key: string) =>
    setDetailOpen((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });

  const saveDetail = (agendaId: string, itemId: string, text: string) => {
    const detail = text.trim() || undefined;
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === agendaId ? { ...a, items: a.items.map((i) => i.id === itemId ? { ...i, detail } : i) } : a
      ),
    });
  };

  const moveItem = (agendaId: string, itemId: string, dir: -1 | 1) =>
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) => {
        if (a.id !== agendaId) return a;
        const items = [...a.items];
        const idx = items.findIndex((i) => i.id === itemId);
        const next = idx + dir;
        if (idx === -1 || next < 0 || next >= items.length) return a;
        [items[idx], items[next]] = [items[next], items[idx]];
        return { ...a, items };
      }),
    });

  const startEdit = (a: MeetingAgenda) => {
    setEditingId(a.id); setETitle(a.title); setEDate(a.date); setEAttendees([...a.attendees]);
  };

  const saveEdit = () => {
    if (!eTitle.trim() || !editingId) return;
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === editingId ? { ...a, title: eTitle.trim(), date: eDate, attendees: eAttendees } : a
      ),
    });
    setEditingId(null);
  };

  const attendeeRow = (attendees: AgendaAttendee[], setAtts: (v: AgendaAttendee[]) => void) => {
    const available = pool.filter((p) => !attendees.some((a) => a.kind === p.att.kind && a.id === p.att.id));
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
        {attendees.map((att) => {
          const info = resolve(att);
          if (!info) return null;
          return (
            <div key={`${att.kind}:${att.id}`} style={{ display: "flex", alignItems: "center", gap: 3, background: "var(--surface-2)", borderRadius: 99, padding: "2px 6px 2px 3px" }}>
              <Avatar who={info.ini} size={16} color={info.color ?? "var(--ink-3)"} />
              <span style={{ fontSize: 11, color: "var(--ink-2)" }}>{info.name}</span>
              <button onClick={() => setAtts(attendees.filter((a) => !(a.kind === att.kind && a.id === att.id)))} style={{ color: "var(--ink-4)", display: "flex", alignItems: "center" }}><X size={10} /></button>
            </div>
          );
        })}
        {available.length > 0 && (
          <select
            className="input"
            style={{ fontSize: 11.5, padding: "2px 6px", width: "auto" }}
            value=""
            onChange={(e) => {
              const [kind, id] = e.target.value.split(":");
              if (kind && id) setAtts([...attendees, { kind: kind as "internal" | "external" | "stakeholder", id }]);
            }}
          >
            <option value="">+ Add attendee</option>
            {available.map((p) => (
              <option key={`${p.att.kind}:${p.att.id}`} value={`${p.att.kind}:${p.att.id}`}>
                {p.name}{p.att.kind === "external" ? " (ext)" : p.att.kind === "stakeholder" ? " (stakeholder)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div className="section-h">
        Meeting Agendas
        <button
          onClick={() => setAdding(true)}
          style={{ marginLeft: "auto", color: "var(--accent-ink)", fontSize: 12, fontWeight: 550, display: "flex", alignItems: "center", gap: 5 }}
        >
          <Plus size={12} /> New meeting
        </button>
      </div>

      {adding && (
        <div className="card card-pad" style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" autoFocus placeholder="Meeting title" value={nTitle} onChange={(e) => setNTitle(e.target.value)} style={{ flex: 1, minWidth: 180, fontSize: 13 }} />
            <DateInput value={nDate} onChange={setNDate} style={{ width: 140, fontSize: 12.5 }} />
          </div>
          {pool.length > 0 && attendeeRow(nAttendees, setNAttendees)}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {nItems.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--ink-4)", width: 16, textAlign: "center" }}>☐</span>
                <span style={{ flex: 1, fontSize: 13, color: "var(--ink-2)" }}>{item.text}</span>
                <button className="icon-btn" style={{ width: 20, height: 20, color: "var(--ink-4)" }} onClick={() => setNItems((p) => p.filter((i) => i.id !== item.id))}><X size={11} /></button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 7 }}>
              <input className="input" placeholder="Add agenda item…" value={nItemText} onChange={(e) => setNItemText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNItem()} style={{ flex: 1, fontSize: 12.5 }} />
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={addNItem}>Add</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={createMeeting}>Save meeting</button>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => { setAdding(false); setNTitle(""); setNDate(""); setNAttendees([]); setNItems([]); setNItemText(""); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {agendas.length === 0 && !adding && (
          <div className="card" style={{ padding: "14px 16px", fontSize: 13, color: "var(--ink-4)" }}>No meeting agendas yet.</div>
        )}
        {agendas.map((agenda) =>
          editingId === agenda.id ? (
            <div key={agenda.id} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input className="input" autoFocus placeholder="Meeting title" value={eTitle} onChange={(e) => setETitle(e.target.value)} style={{ flex: 1, minWidth: 180, fontSize: 13 }} />
                <DateInput value={eDate} onChange={setEDate} style={{ width: 140, fontSize: 12.5 }} />
              </div>
              {pool.length > 0 && attendeeRow(eAttendees, setEAttendees)}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={saveEdit}>Save</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (() => {
            const isOpen = openAgendas.has(agenda.id);
            const li = linkInputs[agenda.id] ?? { label: "", url: "" };
            return (
              <div key={agenda.id} className="card" style={{ padding: "10px 14px 12px" }}>
                {/* Header row — always visible */}
                <div style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }} onClick={() => toggleAgendaOpen(agenda.id)}>
                  <ChevronDown size={13} style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", color: "var(--ink-4)", flexShrink: 0 }} />
                  <Calendar size={14} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 550, color: "var(--ink)", flex: 1 }}>{agenda.title}</span>
                  {agenda.date && <span style={{ fontSize: 12, color: "var(--ink-4)" }}>{fmtAgendaDate(agenda.date)}</span>}
                  <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} title="Export agenda HTML" onClick={(e) => { e.stopPropagation(); exportAgendaHtml(project, agenda, data.contacts, all.user.feedbackEmail ?? ""); }}><Download size={12} /></button>
                  <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} onClick={(e) => { e.stopPropagation(); startEdit(agenda); }}><Pencil size={12} /></button>
                  <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} onClick={(e) => { e.stopPropagation(); deleteMeeting(agenda.id); }}><Trash2 size={12} /></button>
                </div>

                {/* Body — only when open */}
                {isOpen && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* Attendees */}
                    {pool.length > 0 && (
                      <div style={{ marginBottom: 4 }}>
                        {attendeeRow(
                          agenda.attendees,
                          (next) => updateProject(project.id, {
                            agendas: (project.agendas ?? []).map((a) => a.id === agenda.id ? { ...a, attendees: next } : a),
                          }),
                        )}
                      </div>
                    )}
                    {/* Items */}
                    {agenda.items.map((item, idx) => {
                      const isChecked = checked.has(`${agenda.id}:${item.id}`);
                      const detailKey = `${agenda.id}:${item.id}`;
                      const isDetailOpen = detailOpen.has(detailKey);
                      return (
                        <div key={item.id} style={{ display: "flex", flexDirection: "column" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, color: "var(--ink-4)", minWidth: 16, textAlign: "right", flexShrink: 0 }}>{idx + 1}.</span>
                            <button
                              onClick={() => toggleCheck(agenda.id, item.id)}
                              style={{ width: 15, height: 15, borderRadius: 3, border: `1.5px solid ${isChecked ? "var(--accent)" : "var(--border)"}`, background: isChecked ? "var(--accent)" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.1s" }}
                            >
                              {isChecked && <Check size={9} style={{ color: "white" }} />}
                            </button>
                            {editingItemKey?.agendaId === agenda.id && editingItemKey?.itemId === item.id ? (
                              <input className="input" autoFocus value={editingItemText} onChange={(e) => setEditingItemText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveItemEdit(); if (e.key === "Escape") setEditingItemKey(null); }} onBlur={saveItemEdit} style={{ flex: 1, fontSize: 13, padding: "2px 6px" }} />
                            ) : (
                              <span style={{ flex: 1, fontSize: 13, color: isChecked ? "var(--ink-4)" : "var(--ink-2)", textDecoration: isChecked ? "line-through" : "none", transition: "color 0.1s", cursor: "text" }} onClick={() => { setEditingItemKey({ agendaId: agenda.id, itemId: item.id }); setEditingItemText(item.text); }}>
                                {item.text}
                              </span>
                            )}
                            <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                              <button className="icon-btn" style={{ width: 16, height: 14, color: idx === 0 ? "var(--border)" : "var(--ink-4)", cursor: idx === 0 ? "default" : "pointer" }} onClick={() => moveItem(agenda.id, item.id, -1)} disabled={idx === 0}><ChevronUp size={10} /></button>
                              <button className="icon-btn" style={{ width: 16, height: 14, color: idx === agenda.items.length - 1 ? "var(--border)" : "var(--ink-4)", cursor: idx === agenda.items.length - 1 ? "default" : "pointer" }} onClick={() => moveItem(agenda.id, item.id, 1)} disabled={idx === agenda.items.length - 1}><ChevronDown size={10} /></button>
                            </div>
                            <button className="icon-btn" title={isDetailOpen ? "Close notes" : "Add notes"} style={{ width: 20, height: 20, color: item.detail || isDetailOpen ? "var(--accent)" : "var(--ink-4)" }} onClick={() => toggleDetail(detailKey)}><AlignLeft size={11} /></button>
                            <button className="icon-btn" style={{ width: 20, height: 20, color: "var(--ink-4)" }} onClick={() => removeItem(agenda.id, item.id)}><X size={11} /></button>
                          </div>
                          {!isDetailOpen && item.detail && (
                            <div style={{ fontSize: 12, color: "var(--ink-3)", paddingLeft: 39, lineHeight: 1.45, marginTop: 2 }}>{item.detail}</div>
                          )}
                          {isDetailOpen && (
                            <textarea
                              key={detailKey}
                              autoFocus
                              defaultValue={item.detail ?? ""}
                              placeholder="Add notes for this topic…"
                              onBlur={(e) => saveDetail(agenda.id, item.id, e.target.value)}
                              rows={3}
                              style={{ marginLeft: 39, marginTop: 4, fontSize: 12, color: "var(--ink-2)", resize: "vertical", border: "1px solid var(--border)", borderRadius: 5, padding: "5px 8px", background: "transparent", outline: "none", lineHeight: 1.45, fontFamily: "inherit" }}
                            />
                          )}
                        </div>
                      );
                    })}
                    {/* Add item */}
                    <div style={{ display: "flex", gap: 7, marginTop: 2 }}>
                      <input className="input" placeholder="Add agenda item…" value={itemInputs[agenda.id] ?? ""} onChange={(e) => setItemInputs((p) => ({ ...p, [agenda.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") addItem(agenda.id); }} style={{ flex: 1, fontSize: 12.5 }} />
                      <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => addItem(agenda.id)}>Add</button>
                    </div>
                    {/* Meeting notes */}
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4, display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-4)" }}>Meeting notes</span>
                      <textarea
                        key={agenda.id + "-notes"}
                        defaultValue={agenda.notes ?? ""}
                        placeholder="Paste meeting minutes or summarize key decisions and action items…"
                        onBlur={(e) => {
                          const val = e.target.value;
                          updateProject(project.id, {
                            agendas: (project.agendas ?? []).map((a) => a.id === agenda.id ? { ...a, notes: val } : a),
                          });
                        }}
                        rows={5}
                        style={{ fontSize: 13, color: "var(--ink-2)", resize: "vertical", border: "1px solid var(--border)", borderRadius: 5, padding: "7px 10px", background: "transparent", outline: "none", lineHeight: 1.55, fontFamily: "inherit" }}
                      />
                    </div>
                    {/* Resources */}
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4, display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-4)" }}>Links</span>
                      {(agenda.resources ?? []).map((r) => (
                        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Link2 size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                          <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 12.5, color: "var(--accent)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</a>
                          <button className="icon-btn" style={{ width: 20, height: 20, color: "var(--ink-4)" }} onClick={() => removeLink(agenda.id, r.id)}><X size={11} /></button>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <input className="input" placeholder="Label" value={li.label} onChange={(e) => setLinkInputs((p) => ({ ...p, [agenda.id]: { ...li, label: e.target.value } }))} style={{ width: 110, fontSize: 12 }} />
                        <input className="input" placeholder="URL" value={li.url} onChange={(e) => setLinkInputs((p) => ({ ...p, [agenda.id]: { ...li, url: e.target.value } }))} onKeyDown={(e) => { if (e.key === "Enter") addLink(agenda.id); }} style={{ flex: 1, minWidth: 140, fontSize: 12 }} />
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => addLink(agenda.id)}>Add</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

/* ================= External Team section ================= */

const AVATAR_COLORS = [
  ["#EEF2FF", "#4F46E5"], ["#FEF3C7", "#B45309"], ["#ECFDF5", "#059669"],
  ["#FEE2E2", "#DC2626"], ["#F3E8FF", "#7C3AED"], ["#E0F2FE", "#0369A1"],
];

function extInitials(name: string) {
  return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

/* ================= Stakeholder section ================= */

const SAT_MIGRATE: Record<string, StakeholderSatisfaction> = {
  angry: "dissatisfied", unhappy: "dissatisfied", happy: "satisfied",
};
function normalizeSat(sat: string): StakeholderSatisfaction {
  return (SAT_MIGRATE[sat] ?? sat) as StakeholderSatisfaction;
}

const SAT_LEVELS: { value: StakeholderSatisfaction; label: string; icon: string; color: string; bg: string }[] = [
  { value: "dissatisfied", label: "Dissatisfied", icon: "😟", color: "#A32D2D", bg: "#FCEBEB" },
  { value: "neutral",      label: "Neutral",      icon: "😐", color: "#5F5E5A", bg: "#F1EFE8" },
  { value: "satisfied",    label: "Satisfied",    icon: "🙂", color: "#3B6D11", bg: "#EAF3DE" },
  { value: "delighted",    label: "Delighted",    icon: "😄", color: "#085041", bg: "#E1F5EE" },
];

function SatIcon({ sat, size = 16 }: { sat: StakeholderSatisfaction; size?: number }) {
  const faceMap: Record<StakeholderSatisfaction, JSX.Element> = {
    dissatisfied: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
        <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={2.5} /><line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={2.5} />
      </svg>
    ),
    neutral: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="15" x2="16" y2="15" />
        <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={2.5} /><line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={2.5} />
      </svg>
    ),
    satisfied: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={2.5} /><line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={2.5} />
      </svg>
    ),
    delighted: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M7 14.5 Q12 20.5 17 14.5" />
        <path d="M9 7.2 L9.45 8.75 L11 9.2 L9.45 9.65 L9 11.2 L8.55 9.65 L7 9.2 L8.55 8.75 Z" fill="currentColor" stroke="none"/>
        <path d="M15 7.2 L15.45 8.75 L17 9.2 L15.45 9.65 L15 11.2 L14.55 9.65 L13 9.2 L14.55 8.75 Z" fill="currentColor" stroke="none"/>
      </svg>
    ),
  };
  return faceMap[sat];
}

function StakeholderSection({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

  const list = project.stakeholders ?? [];

  const add = () => {
    if (!addName.trim()) return;
    const entry: ProjectStakeholder = {
      id: "sk" + Date.now(),
      name: addName.trim(),
      role: addRole.trim() || undefined,
      satisfaction: "neutral",
    };
    updateProject(project.id, { stakeholders: [...list, entry] });
    setAddName(""); setAddRole(""); setAdding(false);
  };

  const remove = (id: string) =>
    updateProject(project.id, { stakeholders: list.filter((s) => s.id !== id) });

  const setSat = (id: string, sat: StakeholderSatisfaction) =>
    updateProject(project.id, { stakeholders: list.map((s) => s.id === id ? { ...s, satisfaction: sat } : s) });

  const startEdit = (s: ProjectStakeholder) => {
    setEditingId(s.id); setEditName(s.name); setEditRole(s.role ?? "");
  };

  const saveEdit = () => {
    if (!editName.trim() || !editingId) return;
    updateProject(project.id, {
      stakeholders: list.map((s) =>
        s.id === editingId ? { ...s, name: editName.trim(), role: editRole.trim() || undefined } : s
      ),
    });
    setEditingId(null);
  };

  return (
    <div style={{ marginTop: 20 }}>
      <button
        className="section-h"
        style={{ width: "100%", cursor: "pointer", display: "flex", alignItems: "center" }}
        onClick={() => setOpen((v) => !v)}
      >
        Stakeholders
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          {list.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-4)" }}>{list.length}</span>
          )}
          <ChevronDown size={13} style={{ color: "var(--ink-4)", transition: "transform 0.18s", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }} />
        </span>
      </button>
      {open && (
        <div className="card" style={{ padding: "6px 10px 8px" }}>
          {adding && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "6px 0 8px", borderBottom: "1px solid var(--border)" }}>
              <input className="input" autoFocus placeholder="Name" value={addName} onChange={(e) => setAddName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ fontSize: 13 }} />
              <input className="input" placeholder="Role (optional)" value={addRole} onChange={(e) => setAddRole(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ fontSize: 13 }} />
              <div style={{ display: "flex", gap: 7 }}>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={add}>Add</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => { setAdding(false); setAddName(""); setAddRole(""); }}>Cancel</button>
              </div>
            </div>
          )}
          {list.length === 0 && !adding && (
            <div style={{ padding: "10px 4px", fontSize: 13, color: "var(--ink-4)" }}>No stakeholders yet.</div>
          )}
          {list.map((s, i) =>
            editingId === s.id ? (
              <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 7, padding: "6px 0 8px", borderBottom: i < list.length - 1 ? "1px solid var(--border)" : undefined }}>
                <input className="input" autoFocus placeholder="Name" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} style={{ fontSize: 13 }} />
                <input className="input" placeholder="Role (optional)" value={editRole} onChange={(e) => setEditRole(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} style={{ fontSize: 13 }} />
                <div style={{ display: "flex", gap: 7 }}>
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={saveEdit}>Save</button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 2, borderBottom: i < list.length - 1 ? "1px solid var(--border)" : undefined, padding: "7px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 550, color: "var(--ink)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                  {(() => {
                    const satVal = normalizeSat(s.satisfaction);
                    const lvl = SAT_LEVELS.find(l => l.value === satVal) ?? SAT_LEVELS[1];
                    const nextIdx = (SAT_LEVELS.indexOf(lvl) + 1) % SAT_LEVELS.length;
                    return (
                      <button
                        title={`${lvl.label} — click to change`}
                        onClick={() => setSat(s.id, SAT_LEVELS[nextIdx].value)}
                        style={{ display: "flex", alignItems: "center", gap: 4, border: `1.5px solid ${lvl.color}`, borderRadius: 20, background: lvl.bg, padding: "2px 8px 2px 5px", cursor: "pointer", flexShrink: 0 }}
                      >
                        <span style={{ fontSize: 13, lineHeight: 1 }}>{lvl.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: lvl.color }}>{lvl.label}</span>
                      </button>
                    );
                  })()}
                  <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} onClick={() => startEdit(s)}><Pencil size={12} /></button>
                  <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} onClick={() => remove(s.id)}><Trash2 size={12} /></button>
                </div>
                {s.role && <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{s.role}</div>}
              </div>
            )
          )}
          <button
            style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 12, color: "var(--accent-ink)", fontWeight: 550, cursor: "pointer" }}
            onClick={() => setAdding(true)}
          >
            <Plus size={13} /> Add stakeholder
          </button>
        </div>
      )}
    </div>
  );
}

function ExternalTeamSection({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState("");
  const [addCompany, setAddCompany] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editCompany, setEditCompany] = useState("");

  const team = project.externalTeam ?? [];

  const add = () => {
    if (!addName.trim()) return;
    const entry: ExternalTeamMember = {
      id: "ext" + Date.now(),
      name: addName.trim(),
      role: addRole.trim(),
      company: addCompany.trim(),
    };
    updateProject(project.id, { externalTeam: [...team, entry] });
    setAddName(""); setAddRole(""); setAddCompany(""); setAdding(false);
  };

  const remove = (id: string) =>
    updateProject(project.id, { externalTeam: team.filter((m) => m.id !== id) });

  const startEdit = (m: ExternalTeamMember) => {
    setEditingId(m.id); setEditName(m.name); setEditRole(m.role); setEditCompany(m.company);
  };

  const saveEdit = () => {
    if (!editName.trim() || !editingId) return;
    updateProject(project.id, {
      externalTeam: team.map((m) =>
        m.id === editingId ? { ...m, name: editName.trim(), role: editRole.trim(), company: editCompany.trim() } : m
      ),
    });
    setEditingId(null);
  };

  return (
    <div style={{ marginTop: 20 }}>
      <button
        className="section-h"
        style={{ width: "100%", cursor: "pointer", display: "flex", alignItems: "center" }}
        onClick={() => setOpen((v) => !v)}
      >
        External Team
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          {team.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-4)" }}>{team.length}</span>
          )}
          <ChevronDown size={13} style={{ color: "var(--ink-4)", transition: "transform 0.18s", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }} />
        </span>
      </button>
      {open && (
        <div className="card" style={{ padding: "6px 10px 8px" }}>
          {adding && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "6px 0 8px", borderBottom: "1px solid var(--border)" }}>
              <input className="input" autoFocus placeholder="Name" value={addName} onChange={(e) => setAddName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ fontSize: 13 }} />
              <input className="input" placeholder="Role" value={addRole} onChange={(e) => setAddRole(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ fontSize: 13 }} />
              <input className="input" placeholder="Company" value={addCompany} onChange={(e) => setAddCompany(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ fontSize: 13 }} />
              <div style={{ display: "flex", gap: 7 }}>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={add}>Add</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => { setAdding(false); setAddName(""); setAddRole(""); setAddCompany(""); }}>Cancel</button>
              </div>
            </div>
          )}
          {team.length === 0 && !adding && (
            <div style={{ padding: "10px 4px", fontSize: 13, color: "var(--ink-4)" }}>No external team members yet.</div>
          )}
          {team.map((m, i) =>
            editingId === m.id ? (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 7, padding: "6px 0 8px" }}>
                <input className="input" autoFocus placeholder="Name" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} style={{ fontSize: 13 }} />
                <input className="input" placeholder="Role" value={editRole} onChange={(e) => setEditRole(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} style={{ fontSize: 13 }} />
                <input className="input" placeholder="Company" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} style={{ fontSize: 13 }} />
                <div style={{ display: "flex", gap: 7 }}>
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={saveEdit}>Save</button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div key={m.id} className="task-row" style={{ gap: 9 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: AVATAR_COLORS[i % AVATAR_COLORS.length][0], color: AVATAR_COLORS[i % AVATAR_COLORS.length][1] }}>
                  {extInitials(m.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 550, color: "var(--ink)" }}>{m.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 1 }}>{m.role}{m.role && m.company ? " · " : ""}{m.company}</div>
                </div>
                <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} onClick={() => startEdit(m)}><Pencil size={12} /></button>
                <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} onClick={() => remove(m.id)}><Trash2 size={12} /></button>
              </div>
            )
          )}
          <button
            style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 12, color: "var(--accent-ink)", fontWeight: 550, cursor: "pointer" }}
            onClick={() => setAdding(true)}
          >
            <Plus size={13} /> Add member
          </button>
        </div>
      )}
    </div>
  );
}

/* ================= Resources section ================= */

function ResourcesSection({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const [open, setOpen] = useState(false);
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
      <div className="section-h" style={{ marginTop: 0, cursor: "pointer" }} onClick={() => setOpen((v) => !v)}>
        <ChevronDown size={13} style={{ transition: "transform 0.2s", transform: open ? "rotate(0deg)" : "rotate(-90deg)", color: "var(--ink-4)", flexShrink: 0 }} />
        Resources
        {open && (
          <button
            onClick={(e) => { e.stopPropagation(); setAdding((v) => !v); }}
            style={{ marginLeft: "auto", color: "var(--accent-ink)", fontSize: 12, fontWeight: 550, display: "flex", alignItems: "center", gap: 5 }}
          >
            <Plus size={12} /> Add link
          </button>
        )}
      </div>
      {open && <div className="card" style={{ padding: "6px 10px 8px" }}>
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
        {resources.map((r, idx) =>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                <button className="icon-btn" style={{ width: 16, height: 14, color: idx === 0 ? "var(--border)" : "var(--ink-4)" }} disabled={idx === 0} onClick={() => {
                  const next = [...resources]; [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
                  updateProject(project.id, { resources: next });
                }}><ChevronUp size={10} /></button>
                <button className="icon-btn" style={{ width: 16, height: 14, color: idx === resources.length - 1 ? "var(--border)" : "var(--ink-4)" }} disabled={idx === resources.length - 1} onClick={() => {
                  const next = [...resources]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                  updateProject(project.id, { resources: next });
                }}><ChevronDown size={10} /></button>
              </div>
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
      </div>}
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

const ISTATUS_STYLE: Record<IssueStatus, React.CSSProperties> = {
  "open":        { background: "color-mix(in oklab,#EF4444 12%,transparent)", color: "#DC2626" },
  "in-progress": { background: "color-mix(in oklab,#F59E0B 12%,transparent)", color: "#B45309" },
  "resolved":    { background: "color-mix(in oklab,#10B981 12%,transparent)", color: "#059669" },
};

const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  "open": "Open",
  "in-progress": "In Progress",
  "resolved": "Resolved",
};

const RISK_CATEGORIES = ["Technical", "Resource", "Schedule", "Budget", "External", "Other"];

const riskPill: React.CSSProperties = {
  display: "inline-block", fontSize: 11, fontWeight: 600,
  padding: "2px 7px", borderRadius: 99, textTransform: "capitalize", whiteSpace: "nowrap",
};

const SEV_WEIGHT = { low: 0, medium: 1, high: 2, critical: 3 };
const RSTATUS_WEIGHT: Record<RiskStatus, number> = { open: 0, mitigated: 1, closed: 2 };
const ISTATUS_WEIGHT: Record<IssueStatus, number> = { open: 0, "in-progress": 1, resolved: 2 };

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
  const [sortCol, setSortCol] = useState<"severity" | "status">("severity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | RiskStatus>("all");
  const [filterSev, setFilterSev] = useState<"all" | RiskSeverity>("all");

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

  const escalate = (r: ProjectRisk) => {
    const sev = calcSeverity(r.probability, r.impact);
    const newIssue: ProjectIssue = {
      id: "issue" + Date.now(),
      title: r.description,
      severity: sev,
      status: "open",
      reportedDate: new Date().toLocaleDateString("en-CA"),
      ...(r.owner ? { owner: r.owner } : {}),
      ...(r.mitigation ? { description: r.mitigation } : {}),
    };
    updateProject(project.id, {
      risks: risks.filter((x) => x.id !== r.id),
      issues: [...(project.issues ?? []), newIssue],
    });
  };

  const toggleSort = (col: "severity" | "status") => {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const displayed = risks
    .filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterSev !== "all" && calcSeverity(r.probability, r.impact) !== filterSev) return false;
      return true;
    })
    .sort((a, b) => {
      const sevA = SEV_WEIGHT[calcSeverity(a.probability, a.impact)];
      const sevB = SEV_WEIGHT[calcSeverity(b.probability, b.impact)];
      if (sortCol === "severity") {
        const termA = a.status === "closed" ? 1 : 0;
        const termB = b.status === "closed" ? 1 : 0;
        if (termA !== termB) return termA - termB;
        return sortDir === "desc" ? sevB - sevA : sevA - sevB;
      } else {
        const wa = RSTATUS_WEIGHT[a.status];
        const wb = RSTATUS_WEIGHT[b.status];
        if (wa !== wb) return sortDir === "asc" ? wa - wb : wb - wa;
        return sevB - sevA;
      }
    });

  const openCount = risks.filter((r) => r.status === "open").length;

  const SortBtn = ({ col, label }: { col: "severity" | "status"; label: string }) => (
    <button
      onClick={() => toggleSort(col)}
      style={{
        display: "flex", alignItems: "center", gap: 2,
        fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
        color: sortCol === col ? "var(--accent-ink)" : "var(--ink-4)",
        background: "none", border: "none", padding: 0, cursor: "pointer",
        width: col === "severity" ? 68 : 80, flexShrink: 0,
      }}
    >
      {label}
      {sortCol === col && (sortDir === "desc" ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}
    </button>
  );

  return (
    <div style={{ marginTop: 28 }}>
      <div className="section-h">
        Risk Register
        {openCount > 0 && (
          <span style={{ ...riskPill, ...SEV_STYLE.high, marginLeft: 8, fontSize: 10.5 }}>{openCount} open</span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <select
            className="input"
            style={{ fontSize: 11, padding: "2px 6px", height: 24 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="mitigated">Mitigated</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="input"
            style={{ fontSize: 11, padding: "2px 6px", height: 24 }}
            value={filterSev}
            onChange={(e) => setFilterSev(e.target.value as typeof filterSev)}
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={() => { setAdding((v) => !v); setEditingId(null); }}
            style={{ color: "var(--accent-ink)", fontSize: 12, fontWeight: 550, display: "flex", alignItems: "center", gap: 5 }}
          >
            <Plus size={12} /> Add risk
          </button>
        </div>
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
        {risks.length > 0 && displayed.length === 0 && (
          <div style={{ padding: "10px 4px", fontSize: 13, color: "var(--ink-4)" }}>No risks match the current filters.</div>
        )}
        {displayed.length > 0 && (
          <div style={{ display: "flex", gap: 10, padding: "4px 4px 6px", borderBottom: "1px solid var(--border)", marginBottom: 2 }}>
            <SortBtn col="severity" label="Severity" />
            <span style={{ flex: 1, fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Risk</span>
            <span style={{ width: 80, flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Category</span>
            <span style={{ width: 36, flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>P</span>
            <span style={{ width: 36, flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>I</span>
            <SortBtn col="status" label="Status" />
            <span style={{ width: 60, flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Owner</span>
            <span style={{ width: 72, flexShrink: 0 }} />
          </div>
        )}
        {displayed.map((r) => {
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
              <div style={{ width: 72, flexShrink: 0, display: "flex", gap: 2 }}>
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
                <button
                  className="icon-btn"
                  style={{ width: 22, height: 22, color: "var(--ink-4)" }}
                  onClick={() => escalate(r)}
                  title="Escalate to issue"
                >
                  <AlertCircle size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= Issue tracker ================= */

function IssueForm({
  initial, onSave, onCancel,
}: {
  initial?: ProjectIssue;
  onSave: (i: Omit<ProjectIssue, "id" | "reportedDate">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [severity, setSeverity] = useState<IssueSeverity>(initial?.severity ?? "medium");
  const [status, setStatus] = useState<IssueStatus>(initial?.status ?? "open");
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [resolution, setResolution] = useState(initial?.resolution ?? "");

  const save = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      severity, status,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(owner.trim() ? { owner: owner.trim() } : {}),
      ...(resolution.trim() ? { resolution: resolution.trim() } : {}),
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0 4px" }}>
      <input
        className="input"
        autoFocus
        placeholder="Issue title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select className="input" style={{ flex: 1, minWidth: 110, fontSize: 12.5 }} value={severity} onChange={(e) => setSeverity(e.target.value as IssueSeverity)}>
          <option value="low">Severity: Low</option>
          <option value="medium">Severity: Medium</option>
          <option value="high">Severity: High</option>
          <option value="critical">Severity: Critical</option>
        </select>
        <select className="input" style={{ flex: 1, minWidth: 110, fontSize: 12.5 }} value={status} onChange={(e) => setStatus(e.target.value as IssueStatus)}>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <input className="input" style={{ flex: 1, minWidth: 110, fontSize: 12.5 }} placeholder="Owner (optional)" value={owner} onChange={(e) => setOwner(e.target.value)} />
      </div>
      <input
        className="input"
        style={{ fontSize: 12.5 }}
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {status === "resolved" && (
        <input
          className="input"
          style={{ fontSize: 12.5 }}
          placeholder="Resolution notes (optional)"
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
        />
      )}
      <div style={{ display: "flex", gap: 7 }}>
        <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={save}>Save</button>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function IssueTracker({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const issues = project.issues ?? [];
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<"severity" | "status">("severity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | IssueStatus>("all");
  const [filterSev, setFilterSev] = useState<"all" | IssueSeverity>("all");

  const saveNew = (data: Omit<ProjectIssue, "id" | "reportedDate">) => {
    updateProject(project.id, {
      issues: [...issues, { id: "issue" + Date.now(), reportedDate: new Date().toLocaleDateString("en-CA"), ...data }],
    });
    setAdding(false);
  };

  const saveEdit = (id: string, data: Omit<ProjectIssue, "id" | "reportedDate">) => {
    updateProject(project.id, {
      issues: issues.map((i) => i.id === id ? { ...i, ...data } : i),
    });
    setEditingId(null);
  };

  const remove = (id: string) =>
    updateProject(project.id, { issues: issues.filter((i) => i.id !== id) });

  const toggleSort = (col: "severity" | "status") => {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const displayed = issues
    .filter((iss) => {
      if (filterStatus !== "all" && iss.status !== filterStatus) return false;
      if (filterSev !== "all" && iss.severity !== filterSev) return false;
      return true;
    })
    .sort((a, b) => {
      const sevA = SEV_WEIGHT[a.severity];
      const sevB = SEV_WEIGHT[b.severity];
      if (sortCol === "severity") {
        const termA = a.status === "resolved" ? 1 : 0;
        const termB = b.status === "resolved" ? 1 : 0;
        if (termA !== termB) return termA - termB;
        return sortDir === "desc" ? sevB - sevA : sevA - sevB;
      } else {
        const wa = ISTATUS_WEIGHT[a.status];
        const wb = ISTATUS_WEIGHT[b.status];
        if (wa !== wb) return sortDir === "asc" ? wa - wb : wb - wa;
        return sevB - sevA;
      }
    });

  const openCount = issues.filter((i) => i.status !== "resolved").length;

  const SortBtn = ({ col, label, width }: { col: "severity" | "status"; label: string; width: number }) => (
    <button
      onClick={() => toggleSort(col)}
      style={{
        display: "flex", alignItems: "center", gap: 2,
        fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
        color: sortCol === col ? "var(--accent-ink)" : "var(--ink-4)",
        background: "none", border: "none", padding: 0, cursor: "pointer",
        width, flexShrink: 0,
      }}
    >
      {label}
      {sortCol === col && (sortDir === "desc" ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}
    </button>
  );

  return (
    <div style={{ marginTop: 28 }}>
      <div className="section-h">
        Issue Tracker
        {openCount > 0 && (
          <span style={{ ...riskPill, ...SEV_STYLE.high, marginLeft: 8, fontSize: 10.5 }}>{openCount} open</span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <select
            className="input"
            style={{ fontSize: 11, padding: "2px 6px", height: 24 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            className="input"
            style={{ fontSize: 11, padding: "2px 6px", height: 24 }}
            value={filterSev}
            onChange={(e) => setFilterSev(e.target.value as typeof filterSev)}
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={() => { setAdding((v) => !v); setEditingId(null); }}
            style={{ color: "var(--accent-ink)", fontSize: 12, fontWeight: 550, display: "flex", alignItems: "center", gap: 5 }}
          >
            <Plus size={12} /> Add issue
          </button>
        </div>
      </div>
      <div className="card" style={{ padding: "6px 10px 8px" }}>
        {adding && (
          <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 4, paddingBottom: 8 }}>
            <IssueForm onSave={saveNew} onCancel={() => setAdding(false)} />
          </div>
        )}
        {issues.length === 0 && !adding && (
          <div style={{ padding: "10px 4px", fontSize: 13, color: "var(--ink-4)" }}>No issues logged yet.</div>
        )}
        {issues.length > 0 && displayed.length === 0 && (
          <div style={{ padding: "10px 4px", fontSize: 13, color: "var(--ink-4)" }}>No issues match the current filters.</div>
        )}
        {displayed.length > 0 && (
          <div style={{ display: "flex", gap: 10, padding: "4px 4px 6px", borderBottom: "1px solid var(--border)", marginBottom: 2 }}>
            <SortBtn col="severity" label="Severity" width={68} />
            <span style={{ flex: 1, fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Title</span>
            <SortBtn col="status" label="Status" width={90} />
            <span style={{ width: 60, flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Owner</span>
            <span style={{ width: 48, flexShrink: 0 }} />
          </div>
        )}
        {displayed.map((issue) => {
          if (editingId === issue.id) {
            return (
              <div key={issue.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 4 }}>
                <IssueForm initial={issue} onSave={(d) => saveEdit(issue.id, d)} onCancel={() => setEditingId(null)} />
              </div>
            );
          }
          return (
            <div key={issue.id} style={{ display: "flex", gap: 10, padding: "7px 4px", borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
              <span style={{ width: 68, flexShrink: 0 }}>
                <span style={{ ...riskPill, ...SEV_STYLE[issue.severity] }}>{issue.severity}</span>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{issue.title}</div>
                {issue.description && (
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.4 }}>{issue.description}</div>
                )}
                {issue.status === "resolved" && issue.resolution && (
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.4 }}>↳ {issue.resolution}</div>
                )}
              </div>
              <span style={{ width: 90, flexShrink: 0 }}>
                <span style={{ ...riskPill, ...ISTATUS_STYLE[issue.status] }}>{ISSUE_STATUS_LABEL[issue.status]}</span>
              </span>
              <span style={{ width: 60, flexShrink: 0, fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {issue.owner ?? "—"}
              </span>
              <div style={{ width: 48, flexShrink: 0, display: "flex", gap: 2 }}>
                <button
                  className="icon-btn"
                  style={{ width: 22, height: 22, color: "var(--ink-4)" }}
                  onClick={() => { setEditingId(issue.id); setAdding(false); }}
                  title="Edit issue"
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="icon-btn"
                  style={{ width: 22, height: 22, color: "var(--ink-4)" }}
                  onClick={() => remove(issue.id)}
                  title="Delete issue"
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
