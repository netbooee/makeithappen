import { useState } from "react";
import { ChevronRight, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { useStore } from "../../store/store";
import type { ExternalTeamMember, Project } from "../../lib/types";

const AVATAR_COLORS = [
  ["#EEF2FF", "#4F46E5"], ["#FEF3C7", "#B45309"], ["#ECFDF5", "#059669"],
  ["#FEE2E2", "#DC2626"], ["#F3E8FF", "#7C3AED"], ["#E0F2FE", "#0369A1"],
];

function extInitials(name: string) {
  return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

export function ExternalTeamSection({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState("");
  const [addCompany, setAddCompany] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const team = project.externalTeam ?? [];

  const add = () => {
    if (!addName.trim()) return;
    const entry: ExternalTeamMember = {
      id: "ext" + Date.now(),
      name: addName.trim(),
      role: addRole.trim(),
      company: addCompany.trim(),
      email: addEmail.trim(),
    };
    updateProject(project.id, { externalTeam: [...team, entry] });
    setAddName(""); setAddRole(""); setAddCompany(""); setAddEmail(""); setAdding(false);
  };

  const remove = (id: string) =>
    updateProject(project.id, { externalTeam: team.filter((m) => m.id !== id) });

  const startEdit = (m: ExternalTeamMember) => {
    setEditingId(m.id); setEditName(m.name); setEditRole(m.role); setEditCompany(m.company); setEditEmail(m.email ?? "");
  };

  const saveEdit = () => {
    if (!editName.trim() || !editingId) return;
    updateProject(project.id, {
      externalTeam: team.map((m) =>
        m.id === editingId ? { ...m, name: editName.trim(), role: editRole.trim(), company: editCompany.trim(), email: editEmail.trim() } : m
      ),
    });
    setEditingId(null);
  };

  return (
    <div className="card rail-card" style={{ marginTop: 12 }}>
      <div
        className={"rail-head" + (open ? " is-open" : "")}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight size={13} className="ic" />
        <h3>External Team</h3>
        {team.length > 0 && (
          <span className="count">{team.length}</span>
        )}
      </div>
      {open && (
        <div className="rail-body">
          {adding && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "6px 0 8px", borderBottom: "1px solid var(--border)" }}>
              <input className="input" autoFocus placeholder="Name" value={addName} onChange={(e) => setAddName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ fontSize: 13 }} />
              <div style={{ display: "flex", gap: 7 }}>
                <input className="input" placeholder="Role" value={addRole} onChange={(e) => setAddRole(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ fontSize: 13, flex: 1 }} />
                <input className="input" placeholder="Company" value={addCompany} onChange={(e) => setAddCompany(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ fontSize: 13, flex: 1 }} />
              </div>
              <input className="input" placeholder="Email" type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ fontSize: 13 }} />
              <div style={{ display: "flex", gap: 7 }}>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={add}>Add</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => { setAdding(false); setAddName(""); setAddRole(""); setAddCompany(""); setAddEmail(""); }}>Cancel</button>
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
                <div style={{ display: "flex", gap: 7 }}>
                  <input className="input" placeholder="Role" value={editRole} onChange={(e) => setEditRole(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} style={{ fontSize: 13, flex: 1 }} />
                  <input className="input" placeholder="Company" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} style={{ fontSize: 13, flex: 1 }} />
                </div>
                <input className="input" placeholder="Email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} style={{ fontSize: 13 }} />
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
                {m.email && (
                  <a className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} href={`mailto:${m.email}`} title={m.email}><Mail size={12} /></a>
                )}
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
