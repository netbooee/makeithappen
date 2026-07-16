import { useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { useStore } from "../../store/store";
import type { Project, ProjectStakeholder, StakeholderSatisfaction } from "../../lib/types";

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

export function StakeholderSection({ project }: { project: Project }) {
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
