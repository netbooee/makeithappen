import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { ChevronDown, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useStore } from "../../store/store";
import { safeHref } from "../../lib/safeUrl";
import type { Project, ProjectNote, ProjectResource } from "../../lib/types";

const mdComponents: Components = {
  h1: ({ children }) => <h1 style={{ fontSize: 18, fontWeight: 650, margin: "10px 0 6px", color: "var(--ink)" }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: 16, fontWeight: 650, margin: "10px 0 6px", color: "var(--ink)" }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: 14, fontWeight: 650, margin: "8px 0 4px", color: "var(--ink)" }}>{children}</h3>,
  p: ({ children }) => <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{children}</p>,
  strong: ({ children }) => <strong style={{ fontWeight: 650, color: "var(--ink)" }}>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul style={{ margin: "0 0 8px", paddingLeft: 20, fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: "0 0 8px", paddingLeft: 20, fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
  a: ({ children, href }) => (
    <a href={safeHref(href)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code style={{ background: "var(--surface-2)", borderRadius: 4, padding: "1px 5px", fontSize: 12.5, fontFamily: "monospace" }}>{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{ margin: "0 0 8px", paddingLeft: 10, borderLeft: "2px solid var(--border)", color: "var(--ink-3)" }}>{children}</blockquote>
  ),
};

function fmtNoteDate(iso?: string): string {
  if (!iso) return "";
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ProjectNotesSection({ project }: { project: Project }) {
  const { updateProject } = useStore();

  const [adding, setAdding] = useState(false);
  const [nTitle, setNTitle] = useState("");
  const [nBody, setNBody] = useState("");
  const [nLinks, setNLinks] = useState<ProjectResource[]>([]);
  const [nLinkLabel, setNLinkLabel] = useState("");
  const [nLinkUrl, setNLinkUrl] = useState("");

  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eBody, setEBody] = useState("");
  const [linkInputs, setLinkInputs] = useState<Record<string, { label: string; url: string }>>({});

  const notes = useMemo(
    () => [...(project.notes ?? [])].sort((a, b) => (b.updatedAt ?? b.createdAt ?? "").localeCompare(a.updatedAt ?? a.createdAt ?? "")),
    [project.notes],
  );

  const toggleOpen = (id: string) =>
    setOpenNotes((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const addNLink = () => {
    if (!nLinkUrl.trim()) return;
    setNLinks((p) => [...p, { id: "lr" + Date.now(), label: nLinkLabel.trim() || nLinkUrl.trim(), url: nLinkUrl.trim() }]);
    setNLinkLabel(""); setNLinkUrl("");
  };

  const createNote = () => {
    if (!nBody.trim() && !nTitle.trim()) return;
    const now = new Date().toISOString();
    const note: ProjectNote = { id: "note" + Date.now(), title: nTitle.trim() || undefined, body: nBody, resources: nLinks, createdAt: now, updatedAt: now };
    updateProject(project.id, { notes: [...(project.notes ?? []), note] });
    setAdding(false);
    setNTitle(""); setNBody(""); setNLinks([]); setNLinkLabel(""); setNLinkUrl("");
  };

  const deleteNote = (id: string) =>
    updateProject(project.id, { notes: (project.notes ?? []).filter((n) => n.id !== id) });

  const startEdit = (note: ProjectNote) => {
    setEditingId(note.id); setETitle(note.title ?? ""); setEBody(note.body);
    setOpenNotes((prev) => new Set(prev).add(note.id));
  };

  const saveEdit = () => {
    if (!editingId) return;
    const now = new Date().toISOString();
    updateProject(project.id, {
      notes: (project.notes ?? []).map((n) =>
        n.id === editingId ? { ...n, title: eTitle.trim() || undefined, body: eBody, updatedAt: now } : n
      ),
    });
    setEditingId(null);
  };

  const addLink = (noteId: string) => {
    const inp = linkInputs[noteId];
    if (!inp?.url?.trim()) return;
    updateProject(project.id, {
      notes: (project.notes ?? []).map((n) =>
        n.id === noteId
          ? { ...n, resources: [...(n.resources ?? []), { id: "lr" + Date.now(), label: inp.label.trim() || inp.url.trim(), url: inp.url.trim() }] }
          : n
      ),
    });
    setLinkInputs((p) => ({ ...p, [noteId]: { label: "", url: "" } }));
  };

  const removeLink = (noteId: string, linkId: string) =>
    updateProject(project.id, {
      notes: (project.notes ?? []).map((n) =>
        n.id === noteId ? { ...n, resources: (n.resources ?? []).filter((r) => r.id !== linkId) } : n
      ),
    });

  return (
    <div style={{ marginTop: 28 }}>
      <div className="section-h">
        Project Notes
        <button
          onClick={() => setAdding(true)}
          style={{ marginLeft: "auto", color: "var(--accent-ink)", fontSize: 12, fontWeight: 550, display: "flex", alignItems: "center", gap: 5 }}
        >
          <Plus size={12} /> New note
        </button>
      </div>

      {adding && (
        <div className="card card-pad" style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="input" autoFocus placeholder="Note title (optional)" value={nTitle} onChange={(e) => setNTitle(e.target.value)} style={{ fontSize: 13 }} />
          <textarea
            className="input"
            placeholder="Write in Markdown… (# headings, **bold**, [links](https://…), - lists)"
            value={nBody}
            onChange={(e) => setNBody(e.target.value)}
            rows={7}
            style={{ fontSize: 13, lineHeight: 1.55, fontFamily: "monospace", resize: "vertical" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-4)" }}>Links</span>
            {nLinks.map((link) => (
              <div key={link.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Link2 size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12.5, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.label}</span>
                <button className="icon-btn" style={{ width: 20, height: 20, color: "var(--ink-4)" }} onClick={() => setNLinks((p) => p.filter((l) => l.id !== link.id))}><X size={11} /></button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <input className="input" placeholder="Label" value={nLinkLabel} onChange={(e) => setNLinkLabel(e.target.value)} style={{ width: 110, fontSize: 12 }} />
              <input className="input" placeholder="URL" value={nLinkUrl} onChange={(e) => setNLinkUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNLink(); }} style={{ flex: 1, minWidth: 140, fontSize: 12 }} />
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={addNLink}>Add</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={createNote}>Save note</button>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => { setAdding(false); setNTitle(""); setNBody(""); setNLinks([]); setNLinkLabel(""); setNLinkUrl(""); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {notes.length === 0 && !adding && (
          <div className="card" style={{ padding: "14px 16px", fontSize: 13, color: "var(--ink-4)" }}>No project notes yet.</div>
        )}
        {notes.map((note) => {
          const isOpen = openNotes.has(note.id);
          const isEditing = editingId === note.id;
          const li = linkInputs[note.id] ?? { label: "", url: "" };
          return (
            <div key={note.id} className="card" style={{ padding: "10px 14px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }} onClick={() => toggleOpen(note.id)}>
                <ChevronDown size={13} style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", color: "var(--ink-4)", flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 550, color: "var(--ink)", flex: 1 }}>{note.title || "Untitled note"}</span>
                {note.updatedAt && <span style={{ fontSize: 12, color: "var(--ink-4)" }}>{fmtNoteDate(note.updatedAt)}</span>}
                <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} onClick={(e) => { e.stopPropagation(); isEditing ? setEditingId(null) : startEdit(note); }}><Pencil size={12} /></button>
                <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}><Trash2 size={12} /></button>
              </div>

              {isOpen && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <input className="input" autoFocus placeholder="Note title (optional)" value={eTitle} onChange={(e) => setETitle(e.target.value)} style={{ fontSize: 13 }} />
                      <textarea
                        className="input"
                        value={eBody}
                        onChange={(e) => setEBody(e.target.value)}
                        rows={8}
                        style={{ fontSize: 13, lineHeight: 1.55, fontFamily: "monospace", resize: "vertical" }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={saveEdit}>Save</button>
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : note.body.trim() ? (
                    <div><ReactMarkdown components={mdComponents}>{note.body}</ReactMarkdown></div>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--ink-4)" }}>No content yet — click the pencil to add some.</div>
                  )}

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4, display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-4)" }}>Links</span>
                    {(note.resources ?? []).map((r) => (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Link2 size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                        <a href={safeHref(r.url)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 12.5, color: "var(--accent)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</a>
                        <button className="icon-btn" style={{ width: 20, height: 20, color: "var(--ink-4)" }} onClick={() => removeLink(note.id, r.id)}><X size={11} /></button>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      <input className="input" placeholder="Label" value={li.label} onChange={(e) => setLinkInputs((p) => ({ ...p, [note.id]: { ...li, label: e.target.value } }))} style={{ width: 110, fontSize: 12 }} />
                      <input className="input" placeholder="URL" value={li.url} onChange={(e) => setLinkInputs((p) => ({ ...p, [note.id]: { ...li, url: e.target.value } }))} onKeyDown={(e) => { if (e.key === "Enter") addLink(note.id); }} style={{ flex: 1, minWidth: 140, fontSize: 12 }} />
                      <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => addLink(note.id)}>Add</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
