import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useStore } from "../../store/store";
import type { DecisionStatus, Project, ProjectDecision } from "../../lib/types";

const DSTATUS_STYLE: Record<DecisionStatus, React.CSSProperties> = {
  proposed: { background: "color-mix(in oklab,#F59E0B 12%,transparent)", color: "#B45309" },
  decided:  { background: "color-mix(in oklab,#10B981 12%,transparent)", color: "#059669" },
  reversed: { background: "color-mix(in oklab,#EF4444 12%,transparent)", color: "#DC2626" },
};

const decisionPill: React.CSSProperties = {
  display: "inline-block", fontSize: 11, fontWeight: 600,
  padding: "2px 7px", borderRadius: 99, textTransform: "capitalize", whiteSpace: "nowrap",
};

function DecisionForm({
  initial, onSave, onCancel,
}: {
  initial?: ProjectDecision;
  onSave: (d: Omit<ProjectDecision, "id">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<DecisionStatus>(initial?.status ?? "proposed");
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [decidedDate, setDecidedDate] = useState(initial?.decidedDate ?? new Date().toLocaleDateString("en-CA"));

  const save = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(), status, decidedDate,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(owner.trim() ? { owner: owner.trim() } : {}),
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0 4px" }}>
      <input
        className="input"
        autoFocus
        placeholder="Decision…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select className="input" style={{ flex: 1, minWidth: 110, fontSize: 12.5 }} value={status} onChange={(e) => setStatus(e.target.value as DecisionStatus)}>
          <option value="proposed">Proposed</option>
          <option value="decided">Decided</option>
          <option value="reversed">Reversed</option>
        </select>
        <input type="date" className="input" style={{ flex: 1, minWidth: 110, fontSize: 12.5 }} value={decidedDate} onChange={(e) => setDecidedDate(e.target.value)} />
        <input className="input" style={{ flex: 1, minWidth: 110, fontSize: 12.5 }} placeholder="Owner (optional)" value={owner} onChange={(e) => setOwner(e.target.value)} />
      </div>
      <input
        className="input"
        style={{ fontSize: 12.5 }}
        placeholder="Context / rationale (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div style={{ display: "flex", gap: 7 }}>
        <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={save}>Save</button>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function DecisionsTracker({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const decisions = project.decisions ?? [];
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | DecisionStatus>("all");

  const saveNew = (data: Omit<ProjectDecision, "id">) => {
    updateProject(project.id, { decisions: [...decisions, { id: "decision" + Date.now(), ...data }] });
    setAdding(false);
  };

  const saveEdit = (id: string, data: Omit<ProjectDecision, "id">) => {
    updateProject(project.id, { decisions: decisions.map((d) => d.id === id ? { id, ...data } : d) });
    setEditingId(null);
  };

  const remove = (id: string) =>
    updateProject(project.id, { decisions: decisions.filter((d) => d.id !== id) });

  const toggleSort = () => setSortDir((d) => (d === "desc" ? "asc" : "desc"));

  const displayed = decisions
    .filter((d) => filterStatus === "all" || d.status === filterStatus)
    .sort((a, b) => {
      const cmp = a.decidedDate.localeCompare(b.decidedDate);
      return sortDir === "desc" ? -cmp : cmp;
    });

  const proposedCount = decisions.filter((d) => d.status === "proposed").length;

  return (
    <div style={{ marginTop: 28 }}>
      <div className="section-h">
        Decisions Log
        {proposedCount > 0 && (
          <span style={{ ...decisionPill, ...DSTATUS_STYLE.proposed, marginLeft: 8, fontSize: 10.5 }}>{proposedCount} proposed</span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <select
            className="input"
            style={{ fontSize: 11, padding: "2px 6px", height: 24 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          >
            <option value="all">All statuses</option>
            <option value="proposed">Proposed</option>
            <option value="decided">Decided</option>
            <option value="reversed">Reversed</option>
          </select>
          <button
            onClick={() => { setAdding((v) => !v); setEditingId(null); }}
            style={{ color: "var(--accent-ink)", fontSize: 12, fontWeight: 550, display: "flex", alignItems: "center", gap: 5 }}
          >
            <Plus size={12} /> Add decision
          </button>
        </div>
      </div>
      <div className="card" style={{ padding: "6px 10px 8px" }}>
        {adding && (
          <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 4, paddingBottom: 8 }}>
            <DecisionForm onSave={saveNew} onCancel={() => setAdding(false)} />
          </div>
        )}
        {decisions.length === 0 && !adding && (
          <div style={{ padding: "10px 4px", fontSize: 13, color: "var(--ink-4)" }}>No decisions logged yet.</div>
        )}
        {decisions.length > 0 && displayed.length === 0 && (
          <div style={{ padding: "10px 4px", fontSize: 13, color: "var(--ink-4)" }}>No decisions match the current filters.</div>
        )}
        {displayed.length > 0 && (
          <div style={{ display: "flex", gap: 10, padding: "4px 4px 6px", borderBottom: "1px solid var(--border)", marginBottom: 2 }}>
            <span style={{ flex: 1, fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Decision</span>
            <span style={{ width: 80, flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</span>
            <button
              onClick={toggleSort}
              style={{
                display: "flex", alignItems: "center", gap: 2,
                fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                color: "var(--accent-ink)",
                background: "none", border: "none", padding: 0, cursor: "pointer",
                width: 80, flexShrink: 0,
              }}
            >
              Date
              {sortDir === "desc" ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
            </button>
            <span style={{ width: 60, flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Owner</span>
            <span style={{ width: 52, flexShrink: 0 }} />
          </div>
        )}
        {displayed.map((d) => {
          if (editingId === d.id) {
            return (
              <div key={d.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 4 }}>
                <DecisionForm initial={d} onSave={(data) => saveEdit(d.id, data)} onCancel={() => setEditingId(null)} />
              </div>
            );
          }
          return (
            <div key={d.id} style={{ display: "flex", gap: 10, padding: "7px 4px", borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: d.status === "decided" ? "var(--ink-3)" : undefined }}>{d.title}</div>
                {d.description && (
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.4 }}>↳ {d.description}</div>
                )}
              </div>
              <span style={{ width: 80, flexShrink: 0 }}>
                <span style={{ ...decisionPill, ...DSTATUS_STYLE[d.status] }}>{d.status}</span>
              </span>
              <span style={{ width: 80, flexShrink: 0, fontSize: 12, color: "var(--ink-3)" }}>{d.decidedDate}</span>
              <span style={{ width: 60, flexShrink: 0, fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.owner ?? "—"}
              </span>
              <div style={{ width: 52, flexShrink: 0, display: "flex", gap: 2 }}>
                <button
                  className="icon-btn"
                  style={{ width: 22, height: 22, color: "var(--ink-4)" }}
                  onClick={() => { setEditingId(d.id); setAdding(false); }}
                  title="Edit decision"
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="icon-btn"
                  style={{ width: 22, height: 22, color: "var(--ink-4)" }}
                  onClick={() => remove(d.id)}
                  title="Delete decision"
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
