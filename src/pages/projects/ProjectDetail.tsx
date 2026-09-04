import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar, Check, CheckCircle2, ChevronDown, ChevronRight, ChevronUp,
  Copy, Download, ExternalLink, Pencil, Plus, Sparkles, Trash2, UserRound, X,
} from "lucide-react";
import { useStore } from "../../store/store";
import { Avatar, StateTag, StatusChip, TaskMarker, fmtDue, isOverdue, toDateInputValue, parseTimestamp, riskColor } from "../../components/ui";
import { TaskEditPanel } from "../../components/TaskEditPanel";
import { exportProjectHtml, exportProjectPdf } from "../../lib/exportHtml";
import { exportProjectHtmlV2 } from "../../lib/exportHtmlV2";
import { draftStatusUpdate, generateNextActionsSummary, suggestStatusUpdateEdits } from "../../lib/claude";
import type { Contact, ProjectMember, StatusUpdate, UpdateType } from "../../lib/types";
import { CONTACT_COLORS, lastNameOf } from "../../lib/types";
import { KpiSection } from "./KpiSection";
import { MilestoneCard } from "./MilestoneCard";
import { AddMilestone } from "./AddMilestone";
import { PasteMilestones } from "./PasteMilestones";
import { ExternalTeamSection } from "./ExternalTeamSection";
import { StakeholderSection } from "./StakeholderSection";
import { ResourcesSection } from "./ResourcesSection";
import { RiskTracker } from "./RiskTracker";
import { IssueTracker } from "./IssueTracker";
import { DecisionsTracker } from "./DecisionsTracker";
import { NextActionsSection, nextActionSubtasks } from "./NextActionsSection";
import { UpdateTypeTag, UpdateTypePicker } from "./UpdateTypeTag";
import { DraftEmailPanel } from "./DraftEmailPanel";
import { AddProjectTaskRow } from "./AddProjectTaskRow";
import { MeetingAgendasSection } from "./MeetingAgendasSection";
import { ProjectNotesSection } from "./ProjectNotesSection";
import { ProjectModal } from "./ProjectModal";

/* ================= Project detail ================= */

// Mirrors the (module-private) severity matrix in RiskTracker.tsx
const RISK_SEVERITY: Record<string, Record<string, string>> = {
  low:    { low: "low",    medium: "low",    high: "medium" },
  medium: { low: "low",    medium: "medium", high: "high" },
  high:   { low: "medium", medium: "high",   high: "critical" },
};
const RISK_SEV_ORDER = ["low", "medium", "high", "critical"];

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    data, tweaks, all, sidebarCollapsed, workspace,
    addUpdate, updateProject, deleteProject, updateStatusUpdate, deleteStatusUpdate,
    toggleTask, addContact,
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
  const [openRegister, setOpenRegister] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [pendingJump, setPendingJump] = useState<string | null>(null);
  const jumpbarRef = useRef<HTMLDivElement | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [memberMode, setMemberMode] = useState<"existing" | "new">("existing");
  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactCompany, setNewContactCompany] = useState("");
  const [newContactLinkedin, setNewContactLinkedin] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberRole, setEditMemberRole] = useState("");
  const [urlCopied, setUrlCopied] = useState(false);
  const [spUrlCopied, setSpUrlCopied] = useState(false);
  const [aiBusy, setAiBusy] = useState<"draft" | "suggest" | "nextActionsSummary" | null>(null);
  const [nextActionsAiSummary, setNextActionsAiSummary] = useState<string | null>(project?.nextActionsAiSummary ?? null);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState("");

  const seed = useMemo(() => {
    const map: Record<string, boolean> = {};
    project?.milestones.forEach((m) => { map[m.id] = false; });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(seed);
  useEffect(() => setOpenMap(seed), [seed]);
  useEffect(() => setNextActionsAiSummary(project?.nextActionsAiSummary ?? null), [project?.id]);

  // Jumpbar: measured scroll inside the app's `.scroll` container (the page scrolls there, not on window)
  const doScroll = (secId: string) => {
    const sc = jumpbarRef.current?.closest(".scroll");
    const el = document.getElementById(secId);
    if (!sc || !el) return;
    const barH = jumpbarRef.current?.offsetHeight ?? 0;
    const y = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - barH - 14;
    sc.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  };

  const jumpTo = (secId: string) => {
    if (secId === "overview") { doScroll("sec-overview"); return; }
    setOpenRegister(secId);
    setPendingJump(secId);
  };

  // Registers render their body only when open — scroll after the open register has rendered
  useEffect(() => {
    if (!pendingJump) return;
    doScroll(`sec-${pendingJump}`);
    setPendingJump(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingJump]);

  useEffect(() => {
    const sc = document.querySelector(".scroll");
    if (!sc) return;
    const ids = ["overview", "next-actions", "decisions", "issues", "risks", "tasks", "agendas", "notes"];
    const syncActive = () => {
      const barH = jumpbarRef.current?.offsetHeight ?? 0;
      const line = sc.getBoundingClientRect().top + barH + 24;
      let current = "overview";
      for (const secId of ids) {
        const el = document.getElementById(`sec-${secId}`);
        if (el && el.getBoundingClientRect().top <= line) current = secId;
      }
      setActiveSection(current);
    };
    sc.addEventListener("scroll", syncActive, { passive: true });
    return () => sc.removeEventListener("scroll", syncActive);
  }, []);

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

  // Only unassigned project tasks (assigned ones show under their milestone)
  const projectTasks = data.tasks.filter(
    (task) => task.project === project.title && !task.milestoneId,
  );

  // Registers & records: counts and summary lines for the accordion heads
  const decisionsList = project.decisions ?? [];
  const issuesList = project.issues ?? [];
  const openIssues = issuesList.filter((i) => i.status !== "resolved").length;
  const critIssues = issuesList.filter((i) => i.status !== "resolved" && i.severity === "critical").length;
  const issueParts: string[] = [];
  if (critIssues > 0) issueParts.push(`${critIssues} critical`);
  if (openIssues > 0) issueParts.push(`${openIssues} open`);
  else if (issuesList.length > 0) issueParts.push("resolved");
  const issueSummary = issueParts.length ? issueParts.join(" · ") : "No issues logged";

  const risksList = project.risks ?? [];
  const openRisks = risksList.filter((r) => r.status === "open");
  const topRiskSev = openRisks.reduce((top, r) => {
    const sev = RISK_SEVERITY[r.probability]?.[r.impact] ?? "low";
    return RISK_SEV_ORDER.indexOf(sev) > RISK_SEV_ORDER.indexOf(top) ? sev : top;
  }, "low");
  const riskSummary = openRisks.length
    ? `${openRisks.length} ${topRiskSev} risk${openRisks.length > 1 ? "s" : ""} open`
    : risksList.length
      ? "All risks mitigated or closed"
      : "No risks logged";

  // Next Actions register: subtasks flagged as next action across all milestones (not the loose
  // `projectTasks` — this is deliberately scoped to milestone subtasks only, unlike `nextActionItems` above).
  const nextActionRows = nextActionSubtasks(project);
  const nextActionsOverdue = nextActionRows.some(({ subtask }) => isOverdue(subtask.due));

  const registers: { id: string; label: string; sub: string; chip: string; amber?: boolean }[] = [
    { id: "next-actions", label: "Next Actions", sub: "Subtasks flagged as next action, across all milestones", chip: String(nextActionRows.length), amber: nextActionsOverdue },
    { id: "decisions", label: "Decisions", sub: "Log of what was decided, when, and by whom", chip: String(decisionsList.length) },
    { id: "issues", label: "Issues", sub: issueSummary, chip: String(issuesList.length), amber: openIssues > 0 },
    { id: "risks", label: "Risks", sub: riskSummary, chip: openRisks.length > 0 ? `${openRisks.length} open` : String(risksList.length), amber: openRisks.length > 0 },
    { id: "tasks", label: "Project Tasks", sub: "Loose tasks tagged to this project", chip: String(projectTasks.length) },
    { id: "agendas", label: "Meeting Agendas", sub: "Meeting agendas, notes & exports", chip: String((project.agendas ?? []).length) },
    { id: "notes", label: "Project Notes", sub: "Freeform markdown notes & links", chip: String((project.notes ?? []).length) },
  ];

  const jumpItems: { id: string; label: string; n?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "next-actions", label: "Next Actions", n: nextActionRows.length },
    { id: "decisions", label: "Decisions", n: decisionsList.length },
    { id: "issues", label: "Issues", n: openIssues },
    { id: "risks", label: "Risks", n: openRisks.length },
    { id: "tasks", label: "Tasks", n: projectTasks.length },
    { id: "agendas", label: "Agendas", n: (project.agendas ?? []).length },
    { id: "notes", label: "Notes", n: (project.notes ?? []).length },
  ];

  const nextActionItems = [
    ...project.milestones.flatMap((m) =>
      m.subtasks.filter((s) => s.next && !s.done).map((s) => ({ text: s.t, source: m.title })),
    ),
    ...projectTasks
      .filter((task) => task.next && !task.done)
      .map((task) => ({ text: task.text, source: task.context })),
  ];
  const handleGenerateNextActionsSummary = async () => {
    const executiveUpdates = project.updates.filter((u) => u.type === "executive");
    const latestUpdate = executiveUpdates.length
      ? executiveUpdates.reduce((a, b) => (parseTimestamp(b.when) > parseTimestamp(a.when) ? b : a))
      : undefined;
    setAiBusy("nextActionsSummary");
    try {
      const summary = await generateNextActionsSummary(project, nextActionItems, latestUpdate);
      setNextActionsAiSummary(summary);
      updateProject(project.id, { nextActionsAiSummary: summary });
      setEditingSummary(false);
    } finally {
      setAiBusy(null);
    }
  };

  const handleEditSummary = () => {
    setSummaryDraft(nextActionsAiSummary ?? "");
    setEditingSummary(true);
  };

  const handleSaveSummary = () => {
    const trimmed = summaryDraft.trim();
    setNextActionsAiSummary(trimmed);
    updateProject(project.id, { nextActionsAiSummary: trimmed });
    setEditingSummary(false);
  };

  const handleCancelEditSummary = () => {
    setEditingSummary(false);
  };

  const resetMemberForm = () => {
    setNewMemberId(""); setNewMemberRole("");
    setNewContactName(""); setNewContactCompany(""); setNewContactLinkedin("");
    setMemberMode("existing");
    setAddingMember(false);
  };

  const addExistingMember = () => {
    if (!newMemberId) return;
    updateProject(project.id, {
      members: [...(project.members ?? []), { contactId: newMemberId, role: newMemberRole.trim() } as ProjectMember],
    });
    resetMemberForm();
  };

  const createAndAddMember = () => {
    const name = newContactName.trim();
    if (!name) return;
    const contact: Contact = {
      id: "c" + Date.now(),
      name,
      company: newContactCompany.trim(),
      role: "",
      rel: "Colleague",
      email: "",
      phone: "",
      color: CONTACT_COLORS[Math.floor(Math.random() * CONTACT_COLORS.length)],
      lastNote: "",
      lastDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      followUp: false,
      remember: "",
      e6w: false,
      touchpoints: [],
      linkedin: newContactLinkedin.trim(),
    };
    addContact(contact);
    updateProject(project.id, {
      members: [...(project.members ?? []), { contactId: contact.id, role: newMemberRole.trim() } as ProjectMember],
    });
    resetMemberForm();
  };

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

  const handleDraftFresh = async () => {
    if (!project) return;
    setAiBusy("draft");
    try {
      setUpdateText(await draftStatusUpdate(project));
    } finally {
      setAiBusy(null);
    }
  };

  const handleSuggestEdits = async () => {
    if (!project || !updateText.trim()) return;
    setAiBusy("suggest");
    try {
      setUpdateText(await suggestStatusUpdateEdits(project, updateText));
    } finally {
      setAiBusy(null);
    }
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

  const copyProjectUrl = () => {
    if (!project.webUrl) return;
    navigator.clipboard.writeText(project.webUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 1600);
  };

  const copySharepointUrl = () => {
    if (!project.sharepointUrl) return;
    navigator.clipboard.writeText(project.sharepointUrl);
    setSpUrlCopied(true);
    setTimeout(() => setSpUrlCopied(false), 1600);
  };

  const openWebServerFolderUrl = () => {
    if (!project.webServerFolderUrl) return;
    window.open(project.webServerFolderUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="page fade" style={{ maxWidth: sidebarCollapsed ? 1284 : 1100, transition: "max-width .18s ease" }}>
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
            {project.webUrl && (
              <button
                className="icon-btn"
                style={{ color: urlCopied ? "var(--next)" : "var(--ink-4)" }}
                onClick={copyProjectUrl}
                title="Copy project URL"
              >
                {urlCopied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            )}
            {project.sharepointUrl && (
              <button
                className="icon-btn"
                style={{ color: spUrlCopied ? "var(--next)" : "var(--ink-4)" }}
                onClick={copySharepointUrl}
                title="Copy SharePoint URL"
              >
                {spUrlCopied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            )}
            {project.webServerFolderUrl && (
              <button
                className="icon-btn"
                style={{ color: "var(--ink-4)" }}
                onClick={openWebServerFolderUrl}
                title="Open Web Server Folder"
              >
                <ExternalLink size={15} />
              </button>
            )}
          </div>
          <div className="page-sub" style={{ maxWidth: 620 }}>{project.desc}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span className="chip"><UserRound /> {project.owner}</span>
            <span className={`chip${isOverdue(project.due) ? " overdue" : ""}`}><Calendar /> Due {project.due}</span>
            <span className="chip"><CheckCircle2 /> {done}/{total} done</span>
            {project.sharepointProjectId && (
              <span className="chip" title="SharePoint Project ID">SP ID: {project.sharepointProjectId}</span>
            )}
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11.5, padding: "4px 10px", gap: 5 }}
              onClick={() => exportProjectHtml(project, data.contacts, all.user.feedbackEmail ?? "", nextActionItems, nextActionsAiSummary)}
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
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11.5, padding: "4px 10px", gap: 5 }}
              onClick={() => exportProjectHtmlV2(project, data.contacts, all.user.feedbackEmail ?? "", workspace === "work" ? "Work" : "Personal")}
              title="Download self-contained HTML report (v2.0 design)"
            >
              <Download size={12} /> Export v2.0
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
                  stroke={project.risk ? riskColor(project.risk) : allDone ? "var(--next)" : "var(--accent)"}
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

      <div className="jumpbar" ref={jumpbarRef}>
        {jumpItems.map((j) => (
          <button
            key={j.id}
            className={`jump${activeSection === j.id ? " active" : ""}`}
            onClick={() => jumpTo(j.id)}
          >
            {j.label}
            {j.n !== undefined && <span className={`n${j.n === 0 ? " zero" : ""}`}>{j.n}</span>}
          </button>
        ))}
      </div>

      <section id="sec-overview">
      <KpiSection project={project} />

      <div className="project-cols" style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20, alignItems: "start" }}>
        {/* LEFT: milestones */}
        <div style={{ minWidth: 0 }}>
          {nextActionItems.length > 0 && (
            <div className="card card-pad" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                Coming up next
              </div>
              {aiBusy === "nextActionsSummary" ? (
                <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-4)" }}>Generating summary...</div>
              ) : editingSummary ? (
                <>
                  <textarea
                    value={summaryDraft}
                    onChange={(e) => setSummaryDraft(e.target.value)}
                    rows={4}
                    style={{ width: "100%", fontSize: 13.5, lineHeight: 1.5, fontFamily: "inherit", resize: "vertical" }}
                  />
                  <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      onClick={handleSaveSummary}
                    >
                      <Check size={13} /> Save
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      onClick={handleCancelEditSummary}
                    >
                      <X size={13} /> Cancel
                    </button>
                  </div>
                </>
              ) : nextActionsAiSummary ? (
                <>
                  <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-1)" }}>{nextActionsAiSummary}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      onClick={handleGenerateNextActionsSummary}
                    >
                      <Sparkles size={13} /> Regenerate
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      onClick={handleEditSummary}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-4)", marginBottom: 8 }}>
                    Generate an AI summary of this project's next actions.
                  </div>
                  <button
                    className="btn btn-ghost"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    onClick={handleGenerateNextActionsSummary}
                  >
                    <Sparkles size={13} /> Generate Summary
                  </button>
                </>
              )}
            </div>
          )}
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
            <PasteMilestones
              projectId={project.id}
              onAdded={(newIds) => setOpenMap((o) => ({ ...o, ...Object.fromEntries(newIds.map((id) => [id, true])) }))}
            />
          </div>
        </div>

        {/* RIGHT: status updates + stakeholders + team + resources */}
        <div style={{ minWidth: 0 }}>
          <div className="card rail-card">
          <div className={"rail-head" + (updatesOpen ? " is-open" : "")} onClick={() => setUpdatesOpen((v) => !v)}>
            <ChevronRight size={13} className="ic" />
            <h3>Status Updates</h3>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              {updatesOpen && (
                <button
                  onClick={(e) => { e.stopPropagation(); setAdding((v) => !v); }}
                  style={{ color: "var(--accent-ink)", fontSize: 12, fontWeight: 550, display: "flex", alignItems: "center", gap: 5 }}
                >
                  <Plus size={12} /> Add update
                </button>
              )}
              {project.updates.length > 0 && (
                <span className="count" style={{ marginLeft: 0 }}>{project.updates.length}</span>
              )}
            </span>
          </div>
          {updatesOpen && <div className="rail-body" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 10 }}>
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
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}
                    disabled={!!aiBusy}
                    onClick={handleDraftFresh}
                  >
                    <Sparkles size={12} /> {aiBusy === "draft" ? "Drafting…" : "Draft with AI"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}
                    disabled={!!aiBusy || !updateText.trim()}
                    onClick={handleSuggestEdits}
                  >
                    <Sparkles size={12} /> {aiBusy === "suggest" ? "Improving…" : "Suggest corrections"}
                  </button>
                </div>
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

          <StakeholderSection project={project} />

          {/* Team */}
          <div className="card rail-card" style={{ marginTop: 12 }}>
            <div className={"rail-head" + (teamOpen ? " is-open" : "")} onClick={() => setTeamOpen((v) => !v)}>
              <ChevronRight size={13} className="ic" />
              <h3>Internal Team</h3>
              {(project.members ?? []).length > 0 && (
                <span className="count">{(project.members ?? []).length}</span>
              )}
            </div>
            {teamOpen && <div className="rail-body">
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
                  <div style={{ width: "100%", display: "flex", gap: 6 }}>
                    <button
                      className={memberMode === "existing" ? "btn btn-primary" : "btn btn-ghost"}
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => setMemberMode("existing")}
                    >
                      From contacts
                    </button>
                    <button
                      className={memberMode === "new" ? "btn btn-primary" : "btn btn-ghost"}
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => setMemberMode("new")}
                    >
                      New contact
                    </button>
                  </div>
                  {memberMode === "existing" ? (
                    <>
                      <select
                        className="input"
                        style={{ flex: 1, minWidth: 160, fontSize: 13 }}
                        value={newMemberId}
                        onChange={(e) => setNewMemberId(e.target.value)}
                      >
                        <option value="">Pick a contact…</option>
                        {data.contacts
                          .filter((c) => !(project.members ?? []).some((m) => m.contactId === c.id))
                          .slice()
                          .sort((a, b) => lastNameOf(a.name).localeCompare(lastNameOf(b.name)))
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
                        onKeyDown={(e) => e.key === "Enter" && addExistingMember()}
                      />
                      <button
                        className="btn btn-primary"
                        style={{ padding: "5px 11px", fontSize: 12 }}
                        onClick={addExistingMember}
                      >
                        Add
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        className="input"
                        style={{ flex: 1, minWidth: 140, fontSize: 13 }}
                        placeholder="Name"
                        autoFocus
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && createAndAddMember()}
                      />
                      <input
                        className="input"
                        style={{ flex: 1, minWidth: 120, fontSize: 13 }}
                        placeholder="Company (optional)"
                        value={newContactCompany}
                        onChange={(e) => setNewContactCompany(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && createAndAddMember()}
                      />
                      <input
                        className="input"
                        style={{ flex: 1, minWidth: 160, fontSize: 13 }}
                        placeholder="LinkedIn profile URL (optional)"
                        type="url"
                        value={newContactLinkedin}
                        onChange={(e) => setNewContactLinkedin(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && createAndAddMember()}
                      />
                      <input
                        className="input"
                        style={{ flex: 1, minWidth: 120, fontSize: 13 }}
                        placeholder="Project role (optional)"
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && createAndAddMember()}
                      />
                      <button
                        className="btn btn-primary"
                        style={{ padding: "5px 11px", fontSize: 12 }}
                        disabled={!newContactName.trim()}
                        onClick={createAndAddMember}
                      >
                        Create & add
                      </button>
                    </>
                  )}
                  <button className="btn btn-ghost" style={{ padding: "5px 11px", fontSize: 12 }} onClick={resetMemberForm}>Cancel</button>
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

          <ResourcesSection project={project} />
        </div>
      </div>
      </section>

      {/* Registers & records accordion */}
      <div style={{ marginTop: 28 }}>
        <div className="section-h">Registers &amp; records</div>
        <div className="card rg-card">
          {registers.map((r) => (
            <section key={r.id} id={`sec-${r.id}`} className="rg-row">
              <button
                className={`rg-head${openRegister === r.id ? " is-open" : ""}`}
                onClick={() => setOpenRegister((v) => (v === r.id ? null : r.id))}
              >
                <ChevronRight size={14} className="ic" />
                <b>{r.label}</b>
                <span className="rg-sub">{r.sub}</span>
                <span className={`chip${r.amber ? " status-hold" : ""}`} style={{ marginLeft: "auto" }}>{r.chip}</span>
              </button>
              {openRegister === r.id && (
                <div className="rg-body">
                  {r.id === "next-actions" && <NextActionsSection project={project} />}
                  {r.id === "decisions" && <DecisionsTracker project={project} />}
                  {r.id === "issues" && <IssueTracker project={project} />}
                  {r.id === "risks" && <RiskTracker project={project} />}
                  {r.id === "tasks" && (
                    /* Project tasks (from the task lists, tagged to this project) */
                    <div style={{ marginTop: 28 }}>
                      <div className="section-h">
                        Project Tasks
                        <span style={{ fontWeight: 400, color: "var(--ink-4)", marginLeft: 6 }}>
                          — {projectTasks.filter((task) => !task.done).length} open
                        </span>
                      </div>
                      <div className="card" style={{ padding: "6px 10px 8px" }}>
                        {projectTasks.length === 0 && (
                          <div style={{ padding: "8px 4px", fontSize: 13, color: "var(--ink-4)" }}>
                            No tasks yet. Add one below or tag this project on any task.
                          </div>
                        )}
                        {projectTasks.map((t) => (
                          <div key={t.id} className="task-row">
                            <TaskMarker task={t} onClick={() => toggleTask(t.id)} />
                            <button
                              style={{ flex: 1, fontSize: 13, textAlign: "left", cursor: "pointer" }}
                              className={t.done ? "done-t" : ""}
                              onClick={() => setEditingTaskId(t.id)}
                              title="Edit task"
                            >
                              {t.text}
                            </button>
                            <StateTag task={t} />
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
                  )}
                  {r.id === "agendas" && <MeetingAgendasSection project={project} />}
                  {r.id === "notes" && <ProjectNotesSection project={project} />}
                </div>
              )}
            </section>
          ))}
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
