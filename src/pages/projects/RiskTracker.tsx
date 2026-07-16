import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useStore } from "../../store/store";
import type { Project, ProjectIssue, ProjectRisk, RiskImpact, RiskProbability, RiskSeverity, RiskStatus } from "../../lib/types";

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

const SEV_WEIGHT = { low: 0, medium: 1, high: 2, critical: 3 };
const RSTATUS_WEIGHT: Record<RiskStatus, number> = { open: 0, mitigated: 1, closed: 2 };

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

export function RiskTracker({ project }: { project: Project }) {
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
