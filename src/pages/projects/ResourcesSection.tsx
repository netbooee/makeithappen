import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Link2, Pencil, Plus, X } from "lucide-react";
import { useStore } from "../../store/store";
import type { Project, ProjectResource } from "../../lib/types";

export function ResourcesSection({ project }: { project: Project }) {
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
