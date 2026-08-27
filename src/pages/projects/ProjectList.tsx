import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, List, Plus, ChevronUp, ChevronDown, CheckCircle2, Calendar, UserRound, Rows3 } from "lucide-react";
import { useStore } from "../../store/store";
import { Bar, ProgressDial, StatusChip, isOverdue, toDateInputValue, parseTimestamp, riskColor } from "../../components/ui";
import { ProjectModal } from "./ProjectModal";

export function ProjectList() {
  const { data, addProject, all, sidebarCollapsed } = useStore();
  const navigate = useNavigate();
  const projects = data.projects;
  const [adding, setAdding] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => (localStorage.getItem("projects-view") as "grid" | "table") ?? "grid");
  const [compact, setCompact] = useState(() => localStorage.getItem("projects-compact") === "1");
  const [sortCol, setSortCol] = useState<string | null>("activity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  const statusOrder: Record<string, number> = { active: 0, waiting: 1, hold: 2, complete: 3 };
  const riskOrder: Record<string, number> = { green: 0, amber: 1, red: 2 };

  // Prefer the store-stamped updatedAt (moves on any edit); fall back to the
  // updates log for projects not touched since updatedAt was introduced.
  const lastActivity = (p: (typeof projects)[number]) => {
    const stamped = p.updatedAt ? Date.parse(p.updatedAt) : NaN;
    if (!Number.isNaN(stamped)) return stamped;
    return p.updates.reduce((max, u) => {
      const t = parseTimestamp(u.when);
      return Number.isNaN(t) ? max : Math.max(max, t);
    }, -Infinity);
  };

  const sortedProjects = sortCol ? [...projects].sort((a, b) => {
    let av: string | number = 0, bv: string | number = 0;
    if (sortCol === "name") { av = a.title.toLowerCase(); bv = b.title.toLowerCase(); }
    else if (sortCol === "status") { av = statusOrder[a.status] ?? 99; bv = statusOrder[b.status] ?? 99; }
    else if (sortCol === "progress") { av = a.progress; bv = b.progress; }
    else if (sortCol === "risk") { av = riskOrder[a.risk ?? ""] ?? 99; bv = riskOrder[b.risk ?? ""] ?? 99; }
    else if (sortCol === "due") {
      const da = toDateInputValue(a.due) || "9999"; const db = toDateInputValue(b.due) || "9999";
      av = da; bv = db;
    }
    else if (sortCol === "owner") { av = resolveOwner(a.owner).toLowerCase(); bv = resolveOwner(b.owner).toLowerCase(); }
    else if (sortCol === "activity") { av = lastActivity(a); bv = lastActivity(b); }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  }) : projects;

  // Grid view always shows most-recently-updated first; projects with no updates sort last
  const gridProjects = [...projects].sort((a, b) => {
    const ta = lastActivity(a), tb = lastActivity(b);
    return ta < tb ? 1 : ta > tb ? -1 : 0;
  });

  return (
    <div className="page fade" style={{ maxWidth: sidebarCollapsed ? 1224 : undefined, transition: "max-width .18s ease" }}>
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
          <button
            className="btn"
            onClick={() => { const next = !compact; setCompact(next); localStorage.setItem("projects-compact", next ? "1" : "0"); }}
            style={{ border: "1px solid var(--border)", borderRadius: 7, padding: "6px 10px", background: compact ? "var(--surface-2)" : "transparent", color: compact ? "var(--ink)" : "var(--ink-3)" }}
            title={`Compact view: ${compact ? "on" : "off"}`}
          ><Rows3 size={15} /></button>
          <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus /> New project</button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid-2">
          {gridProjects.map((p) => {
            const total = p.milestones.reduce((a, m) => a + m.subtasks.length, 0);
            const done = p.milestones.reduce((a, m) => a + m.subtasks.filter((s) => s.done).length, 0);
            return (
              <button
                key={p.id}
                className="card card-pad"
                onClick={() => navigate(`/projects/${p.id}`)}
                style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: compact ? 8 : 12, cursor: "pointer", transition: "border-color .14s, box-shadow .14s", padding: compact ? "12px 14px" : undefined, minWidth: compact ? 0 : undefined }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {p.heroImage && (
                      <img
                        src={p.heroImage}
                        alt=""
                        style={{ width: 44, height: 44, borderRadius: 7, objectFit: "cover", flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", ...(compact ? { minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const : {}) }}>{p.title}</div>
                  </div>
                  {p.desc && <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>{p.desc}</div>}
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  {[...p.milestones].sort((a, b) => { const da = toDateInputValue(a.due), db = toDateInputValue(b.due); if (!da && !db) return 0; if (!da) return 1; if (!db) return -1; return da.localeCompare(db); }).map((m) => {
                    const bg = m.status === "complete" ? "var(--next)" : m.status === "active" ? "var(--accent)" : m.status === "waiting" ? "var(--ink-4)" : "#F59E0B";
                    return <div key={m.id} style={{ height: 6, width: 28, borderRadius: 3, background: bg, flexShrink: 0 }} title={`${m.title} — ${m.status}`} />;
                  })}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--ink-3)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <ProgressDial value={p.progress} color={riskColor(p.risk)} />
                  {p.risk ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 500, color: p.risk === "green" ? "var(--next)" : p.risk === "amber" ? "#F59E0B" : "var(--danger)" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: riskColor(p.risk), display: "inline-block", flexShrink: 0 }} />
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
                  <StatusChip status={p.status} />
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
                {(["name", "status", null, "progress", "risk", "due", "activity", "owner"] as const).map((col, i) => {
                  const labels = ["Name", "Status", "Milestones", "Progress", "Risk", "Due", "Last Changed", "Owner"];
                  const active = col && sortCol === col;
                  return (
                    <th
                      key={i}
                      onClick={col ? () => toggleSort(col) : undefined}
                      style={{ padding: compact ? "5px 12px" : "9px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: active ? "var(--ink)" : "var(--ink-3)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", cursor: col ? "pointer" : "default", userSelect: "none" }}
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
                    <td className="td-primary" style={{ padding: compact ? "4px 12px" : "10px 12px", minWidth: 200 }}>
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
                        <div style={{ fontWeight: 600, fontSize: 13, ...(compact ? { maxWidth: 320, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const : {}) }}>{p.title}</div>
                      </div>
                    </td>
                    <td style={{ padding: compact ? "4px 12px" : "10px 12px", whiteSpace: "nowrap" }}>
                      <StatusChip status={p.status} />
                    </td>
                    <td style={{ padding: compact ? "4px 12px" : "10px 12px" }}>
                      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                        {sortedMilestones.map((m) => {
                          const bg = m.status === "complete" ? "var(--next)" : m.status === "active" ? "var(--accent)" : m.status === "waiting" ? "var(--ink-4)" : "#F59E0B";
                          return <div key={m.id} style={{ height: 6, width: 20, borderRadius: 3, background: bg, flexShrink: 0 }} title={`${m.title} — ${m.status}`} />;
                        })}
                        {sortedMilestones.length === 0 && <span style={{ color: "var(--ink-4)", fontSize: 12 }}>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: compact ? "4px 12px" : "10px 12px", minWidth: 100 }}>
                      <Bar value={p.progress} color={riskColor(p.risk)} />
                    </td>
                    <td style={{ padding: compact ? "4px 12px" : "10px 12px", whiteSpace: "nowrap" }}>
                      {p.risk ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: p.risk === "green" ? "var(--next)" : p.risk === "amber" ? "#F59E0B" : "var(--danger)" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: riskColor(p.risk), display: "inline-block", flexShrink: 0 }} />
                          {p.risk === "green" ? "On track" : p.risk === "amber" ? "At risk" : "Off track"}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={12} /> {done}/{total}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: compact ? "4px 12px" : "10px 12px", whiteSpace: "nowrap", fontSize: 12, color: isOverdue(p.due) ? "var(--danger)" : "var(--ink-3)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> {p.due}</span>
                    </td>
                    <td style={{ padding: compact ? "4px 12px" : "10px 12px", whiteSpace: "nowrap", fontSize: 12, color: "var(--ink-3)" }}>
                      {(() => {
                        const t = lastActivity(p);
                        return Number.isFinite(t) ? new Date(t).toLocaleDateString() : "—";
                      })()}
                    </td>
                    <td style={{ padding: compact ? "4px 12px" : "10px 12px", whiteSpace: "nowrap", fontSize: 12, color: "var(--ink-3)" }}>
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
