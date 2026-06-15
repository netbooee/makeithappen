import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useStore } from "../store/store";
import type { StatusUpdate, UpdateType } from "../lib/types";

type SortCol = "when" | "project" | "type";
type SortDir = "asc" | "desc";

const UPDATE_TYPE_META: Record<UpdateType, { label: string; bg: string; color: string }> = {
  "update":    { label: "Update",    bg: "var(--surface-2)",     color: "var(--ink-3)"  },
  "heads-up":  { label: "Heads up",  bg: "rgba(245,158,11,.13)", color: "#B45309"       },
  "blocked":   { label: "Blocked",   bg: "rgba(239,68,68,.13)",  color: "#DC2626"       },
  "win":       { label: "Win",       bg: "rgba(16,185,129,.13)", color: "#059669"       },
  "executive": { label: "Executive", bg: "rgba(99,102,241,.13)", color: "#4338CA"       },
};

const ALL_TYPES = Object.keys(UPDATE_TYPE_META) as UpdateType[];

type FlatUpdate = {
  projectId: string;
  projectTitle: string;
  update: StatusUpdate;
  sortIndex: number;
};

function parseWhen(when: string): number {
  const yr = new Date().getFullYear();
  const d = new Date(when.replace(/^(\w{3} \d+),/, `$1, ${yr},`));
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function UpdateTypeTag({ type }: { type: UpdateType }) {
  const m = UPDATE_TYPE_META[type];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 99,
      background: m.bg, color: m.color, whiteSpace: "nowrap",
    }}>
      {m.label}
    </span>
  );
}

function UpdateTypePicker({ value, onChange }: { value: UpdateType; onChange: (t: UpdateType) => void }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {ALL_TYPES.map((t) => {
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

export function Updates() {
  const { data, updateStatusUpdate, deleteStatusUpdate } = useStore();
  const navigate = useNavigate();

  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<UpdateType | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>("when");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editingKey, setEditingKey] = useState<{ projectId: string; updateId: string } | null>(null);
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState<UpdateType>("update");

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir(col === "when" ? "desc" : "asc"); }
  };

  const startEdit = (projectId: string, u: StatusUpdate) => {
    setEditingKey({ projectId, updateId: u.id });
    setEditText(u.text);
    setEditType(u.type ?? "update");
  };

  const saveEdit = () => {
    if (!editingKey || !editText.trim()) return;
    updateStatusUpdate(editingKey.projectId, editingKey.updateId, editText.trim(), editType);
    setEditingKey(null);
  };

  const projectTitles = useMemo(
    () => data.projects.map((p) => p.title),
    [data.projects],
  );

  const flat = useMemo<FlatUpdate[]>(() => {
    const rows: FlatUpdate[] = [];
    let idx = 0;
    for (const p of data.projects) {
      for (const u of p.updates) {
        rows.push({ projectId: p.id, projectTitle: p.title, update: u, sortIndex: idx++ });
      }
    }
    return rows
      .filter(
        (r) =>
          (!filterProject || r.projectTitle === filterProject) &&
          (!filterType || (r.update.type ?? "update") === filterType),
      )
      .sort((a, b) => {
        let cmp = 0;
        if (sortCol === "when") cmp = parseWhen(a.update.when) - parseWhen(b.update.when);
        else if (sortCol === "project") cmp = a.projectTitle.localeCompare(b.projectTitle);
        else if (sortCol === "type") cmp = (a.update.type ?? "update").localeCompare(b.update.type ?? "update");
        if (cmp === 0) cmp = a.sortIndex - b.sortIndex;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [data.projects, filterProject, filterType, sortCol, sortDir]);

  const SortTh = ({ col, children }: { col: SortCol; children: React.ReactNode }) => (
    <th
      className={`sortable${sortCol === col ? ` sort-${sortDir}` : ""}`}
      onClick={() => toggleSort(col)}
    >
      {children}
      <span className="sort-icon">
        {sortCol === col
          ? sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />
          : <ChevronDown size={11} />}
      </span>
    </th>
  );

  const totalCount = data.projects.reduce((a, p) => a + p.updates.length, 0);

  return (
    <div className="page fade">
      <div className="page-head">
        <div className="page-title">Status Updates</div>
        <div className="page-sub">{totalCount} updates across {data.projects.length} projects</div>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 7, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        {projectTitles.map((p) => (
          <button
            key={p}
            className="chip"
            style={{ cursor: "pointer", borderColor: filterProject === p ? "var(--accent)" : undefined, color: filterProject === p ? "var(--accent-ink)" : undefined }}
            onClick={() => setFilterProject(filterProject === p ? null : p)}
          >
            {p}
          </button>
        ))}
        <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 2px" }} />
        {ALL_TYPES.map((t) => {
          const m = UPDATE_TYPE_META[t];
          const active = filterType === t;
          return (
            <button
              key={t}
              onClick={() => setFilterType(active ? null : t)}
              style={{
                fontSize: 11.5, fontWeight: active ? 600 : 400, padding: "3px 10px", borderRadius: 99,
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

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <SortTh col="when">Date</SortTh>
              <SortTh col="type">Type</SortTh>
              <SortTh col="project">Project</SortTh>
              <th>Update</th>
              <th>Author</th>
              <th style={{ width: 72 }} />
            </tr>
          </thead>
          <tbody>
            {flat.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--ink-4)" }}>
                  No updates match the current filters.
                </td>
              </tr>
            )}
            {flat.map(({ projectId, projectTitle, update: u }) => {
              const isEditing = editingKey?.projectId === projectId && editingKey?.updateId === u.id;
              return (
                <tr key={`${projectId}-${u.id}`} style={{ verticalAlign: isEditing ? "top" : "middle" }}>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--ink-3)", minWidth: 110 }}>{u.when}</td>
                  <td style={{ minWidth: 100 }}>
                    {isEditing ? (
                      <UpdateTypePicker value={editType} onChange={setEditType} />
                    ) : (
                      <UpdateTypeTag type={u.type ?? "update"} />
                    )}
                  </td>
                  <td style={{ minWidth: 140 }}>
                    <button
                      className="chip"
                      style={{ cursor: "pointer", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                      onClick={() => navigate(`/projects/${projectId}`)}
                    >
                      {projectTitle} <ExternalLink size={10} />
                    </button>
                  </td>
                  <td style={{ width: "100%" }}>
                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <textarea
                          className="input"
                          rows={3}
                          autoFocus
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit(); }}
                        />
                        <div style={{ display: "flex", gap: 7 }}>
                          <button className="btn btn-primary" style={{ fontSize: 12, padding: "4px 12px" }} onClick={saveEdit}>Save</button>
                          <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => setEditingKey(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 13, color: "var(--ink-2)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {u.text}
                      </span>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--ink-4)" }}>{u.who}</td>
                  <td>
                    {!isEditing && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} title="Edit" onClick={() => startEdit(projectId, u)}>
                          <Pencil size={13} />
                        </button>
                        <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} title="Delete" onClick={() => deleteStatusUpdate(projectId, u.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
