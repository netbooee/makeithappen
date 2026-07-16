import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useStore } from "../../store/store";
import type { IssueSeverity, IssueStatus, Project, ProjectIssue } from "../../lib/types";

const SEV_STYLE: Record<IssueSeverity, React.CSSProperties> = {
  low:      { background: "color-mix(in oklab,#10B981 14%,transparent)", color: "#059669", border: "1px solid color-mix(in oklab,#10B981 28%,transparent)" },
  medium:   { background: "color-mix(in oklab,#F59E0B 14%,transparent)", color: "#B45309", border: "1px solid color-mix(in oklab,#F59E0B 28%,transparent)" },
  high:     { background: "color-mix(in oklab,#F97316 14%,transparent)", color: "#C2410C", border: "1px solid color-mix(in oklab,#F97316 28%,transparent)" },
  critical: { background: "color-mix(in oklab,#EF4444 14%,transparent)", color: "#DC2626", border: "1px solid color-mix(in oklab,#EF4444 28%,transparent)" },
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

const riskPill: React.CSSProperties = {
  display: "inline-block", fontSize: 11, fontWeight: 600,
  padding: "2px 7px", borderRadius: 99, textTransform: "capitalize", whiteSpace: "nowrap",
};

const SEV_WEIGHT = { low: 0, medium: 1, high: 2, critical: 3 };
const ISTATUS_WEIGHT: Record<IssueStatus, number> = { open: 0, "in-progress": 1, resolved: 2 };

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

export function IssueTracker({ project }: { project: Project }) {
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
