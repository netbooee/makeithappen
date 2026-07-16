import { useMemo, useState } from "react";
import {
  AlignLeft, Calendar, Check, ChevronDown, ChevronUp, Copy, Download, Link2, Pencil, Plus, Trash2, X,
} from "lucide-react";
import { useStore } from "../../store/store";
import { Avatar, DateInput, toDateInputValue } from "../../components/ui";
import { exportAgendaHtml, getMeetingAgendaUrl } from "../../lib/exportHtml";
import type { AgendaAttendee, AgendaItem, MeetingAgenda, Project } from "../../lib/types";

function fmtAgendaDate(str: string): string {
  if (!str) return "";
  const iso = toDateInputValue(str);
  if (!iso) return str;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return str;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function MeetingAgendasSection({ project }: { project: Project }) {
  const { data, updateProject, all } = useStore();

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [nTitle, setNTitle] = useState("");
  const [nDate, setNDate] = useState("");
  const [nAttendees, setNAttendees] = useState<AgendaAttendee[]>([]);
  const [nItems, setNItems] = useState<AgendaItem[]>([]);
  const [nItemText, setNItemText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eDate, setEDate] = useState("");
  const [eAttendees, setEAttendees] = useState<AgendaAttendee[]>([]);
  const [itemInputs, setItemInputs] = useState<Record<string, string>>({});
  const [editingItemKey, setEditingItemKey] = useState<{ agendaId: string; itemId: string } | null>(null);
  const [editingItemText, setEditingItemText] = useState("");
  const [openAgendas, setOpenAgendas] = useState<Set<string>>(new Set());
  const [copiedAgendaId, setCopiedAgendaId] = useState<string | null>(null);
  const [linkInputs, setLinkInputs] = useState<Record<string, { label: string; url: string }>>({});
  const [detailOpen, setDetailOpen] = useState<Set<string>>(new Set());

  const agendas = useMemo(
    () => [...(project.agendas ?? [])].sort((a, b) => {
      const da = toDateInputValue(a.date), db = toDateInputValue(b.date);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db.localeCompare(da);
    }),
    [project.agendas],
  );

  type AttInfo = { att: AgendaAttendee; name: string; ini: string; color?: string };
  const pool = useMemo<AttInfo[]>(() => {
    const out: AttInfo[] = [];
    for (const mem of project.members ?? []) {
      const c = data.contacts.find((x) => x.id === mem.contactId);
      if (!c) continue;
      const ini = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      out.push({ att: { kind: "internal", id: mem.contactId }, name: c.name, ini, color: c.color });
    }
    for (const ext of project.externalTeam ?? []) {
      const ini = ext.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      out.push({ att: { kind: "external", id: ext.id }, name: ext.name, ini });
    }
    for (const sh of project.stakeholders ?? []) {
      const ini = sh.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      out.push({ att: { kind: "stakeholder", id: sh.id }, name: sh.name, ini });
    }
    return out;
  }, [project.members, project.externalTeam, project.stakeholders, data.contacts]);

  const resolve = (att: AgendaAttendee) =>
    pool.find((p) => p.att.kind === att.kind && p.att.id === att.id);

  const toggleCheck = (aId: string, iId: string) => {
    const key = `${aId}:${iId}`;
    setChecked((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };

  const addNItem = () => {
    if (!nItemText.trim()) return;
    setNItems((p) => [...p, { id: "i" + Date.now(), text: nItemText.trim() }]);
    setNItemText("");
  };

  const createMeeting = () => {
    if (!nTitle.trim()) return;
    updateProject(project.id, {
      agendas: [...(project.agendas ?? []), { id: "ag" + Date.now(), title: nTitle.trim(), date: nDate, attendees: nAttendees, items: nItems }],
    });
    setAdding(false);
    setNTitle(""); setNDate(""); setNAttendees([]); setNItems([]); setNItemText("");
  };

  const deleteMeeting = (id: string) =>
    updateProject(project.id, { agendas: (project.agendas ?? []).filter((a) => a.id !== id) });

  const addItem = (agendaId: string) => {
    const text = (itemInputs[agendaId] ?? "").trim();
    if (!text) return;
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === agendaId ? { ...a, items: [...a.items, { id: "i" + Date.now(), text }] } : a
      ),
    });
    setItemInputs((p) => ({ ...p, [agendaId]: "" }));
  };

  const removeItem = (agendaId: string, itemId: string) =>
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === agendaId ? { ...a, items: a.items.filter((i) => i.id !== itemId) } : a
      ),
    });

  const saveItemEdit = () => {
    if (!editingItemKey || !editingItemText.trim()) { setEditingItemKey(null); return; }
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === editingItemKey.agendaId
          ? { ...a, items: a.items.map((i) => i.id === editingItemKey.itemId ? { ...i, text: editingItemText.trim() } : i) }
          : a
      ),
    });
    setEditingItemKey(null);
  };

  const toggleAgendaOpen = (id: string) =>
    setOpenAgendas((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const addLink = (agendaId: string) => {
    const inp = linkInputs[agendaId];
    if (!inp?.url?.trim()) return;
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === agendaId
          ? { ...a, resources: [...(a.resources ?? []), { id: "lr" + Date.now(), label: inp.label.trim() || inp.url.trim(), url: inp.url.trim() }] }
          : a
      ),
    });
    setLinkInputs((p) => ({ ...p, [agendaId]: { label: "", url: "" } }));
  };

  const removeLink = (agendaId: string, linkId: string) =>
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === agendaId ? { ...a, resources: (a.resources ?? []).filter((r) => r.id !== linkId) } : a
      ),
    });

  const toggleDetail = (key: string) =>
    setDetailOpen((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });

  const saveDetail = (agendaId: string, itemId: string, text: string) => {
    const detail = text.trim() || undefined;
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === agendaId ? { ...a, items: a.items.map((i) => i.id === itemId ? { ...i, detail } : i) } : a
      ),
    });
  };

  const moveItem = (agendaId: string, itemId: string, dir: -1 | 1) =>
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) => {
        if (a.id !== agendaId) return a;
        const items = [...a.items];
        const idx = items.findIndex((i) => i.id === itemId);
        const next = idx + dir;
        if (idx === -1 || next < 0 || next >= items.length) return a;
        [items[idx], items[next]] = [items[next], items[idx]];
        return { ...a, items };
      }),
    });

  const startEdit = (a: MeetingAgenda) => {
    setEditingId(a.id); setETitle(a.title); setEDate(a.date); setEAttendees([...a.attendees]);
  };

  const saveEdit = () => {
    if (!eTitle.trim() || !editingId) return;
    updateProject(project.id, {
      agendas: (project.agendas ?? []).map((a) =>
        a.id === editingId ? { ...a, title: eTitle.trim(), date: eDate, attendees: eAttendees } : a
      ),
    });
    setEditingId(null);
  };

  const attendeeRow = (attendees: AgendaAttendee[], setAtts: (v: AgendaAttendee[]) => void) => {
    const available = pool.filter((p) => !attendees.some((a) => a.kind === p.att.kind && a.id === p.att.id));
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
        {attendees.map((att) => {
          const info = resolve(att);
          if (!info) return null;
          return (
            <div key={`${att.kind}:${att.id}`} style={{ display: "flex", alignItems: "center", gap: 3, background: "var(--surface-2)", borderRadius: 99, padding: "2px 6px 2px 3px" }}>
              <Avatar who={info.ini} size={16} color={info.color ?? "var(--ink-3)"} />
              <span style={{ fontSize: 11, color: "var(--ink-2)" }}>{info.name}</span>
              <button onClick={() => setAtts(attendees.filter((a) => !(a.kind === att.kind && a.id === att.id)))} style={{ color: "var(--ink-4)", display: "flex", alignItems: "center" }}><X size={10} /></button>
            </div>
          );
        })}
        {available.length > 0 && (
          <select
            className="input"
            style={{ fontSize: 11.5, padding: "2px 6px", width: "auto" }}
            value=""
            onChange={(e) => {
              const [kind, id] = e.target.value.split(":");
              if (kind && id) setAtts([...attendees, { kind: kind as "internal" | "external" | "stakeholder", id }]);
            }}
          >
            <option value="">+ Add attendee</option>
            {available.map((p) => (
              <option key={`${p.att.kind}:${p.att.id}`} value={`${p.att.kind}:${p.att.id}`}>
                {p.name}{p.att.kind === "external" ? " (ext)" : p.att.kind === "stakeholder" ? " (stakeholder)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div className="section-h">
        Meeting Agendas
        <button
          onClick={() => setAdding(true)}
          style={{ marginLeft: "auto", color: "var(--accent-ink)", fontSize: 12, fontWeight: 550, display: "flex", alignItems: "center", gap: 5 }}
        >
          <Plus size={12} /> New meeting
        </button>
      </div>

      {adding && (
        <div className="card card-pad" style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" autoFocus placeholder="Meeting title" value={nTitle} onChange={(e) => setNTitle(e.target.value)} style={{ flex: 1, minWidth: 180, fontSize: 13 }} />
            <DateInput value={nDate} onChange={setNDate} style={{ width: 140, fontSize: 12.5 }} />
          </div>
          {pool.length > 0 && attendeeRow(nAttendees, setNAttendees)}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {nItems.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--ink-4)", width: 16, textAlign: "center" }}>☐</span>
                <span style={{ flex: 1, fontSize: 13, color: "var(--ink-2)" }}>{item.text}</span>
                <button className="icon-btn" style={{ width: 20, height: 20, color: "var(--ink-4)" }} onClick={() => setNItems((p) => p.filter((i) => i.id !== item.id))}><X size={11} /></button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 7 }}>
              <input className="input" placeholder="Add agenda item…" value={nItemText} onChange={(e) => setNItemText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNItem()} style={{ flex: 1, fontSize: 12.5 }} />
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={addNItem}>Add</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={createMeeting}>Save meeting</button>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => { setAdding(false); setNTitle(""); setNDate(""); setNAttendees([]); setNItems([]); setNItemText(""); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {agendas.length === 0 && !adding && (
          <div className="card" style={{ padding: "14px 16px", fontSize: 13, color: "var(--ink-4)" }}>No meeting agendas yet.</div>
        )}
        {agendas.map((agenda) =>
          editingId === agenda.id ? (
            <div key={agenda.id} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input className="input" autoFocus placeholder="Meeting title" value={eTitle} onChange={(e) => setETitle(e.target.value)} style={{ flex: 1, minWidth: 180, fontSize: 13 }} />
                <DateInput value={eDate} onChange={setEDate} style={{ width: 140, fontSize: 12.5 }} />
              </div>
              {pool.length > 0 && attendeeRow(eAttendees, setEAttendees)}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={saveEdit}>Save</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (() => {
            const isOpen = openAgendas.has(agenda.id);
            const li = linkInputs[agenda.id] ?? { label: "", url: "" };
            return (
              <div key={agenda.id} className="card" style={{ padding: "10px 14px 12px" }}>
                {/* Header row — always visible */}
                <div style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }} onClick={() => toggleAgendaOpen(agenda.id)}>
                  <ChevronDown size={13} style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", color: "var(--ink-4)", flexShrink: 0 }} />
                  <Calendar size={14} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 550, color: "var(--ink)", flex: 1 }}>{agenda.title}</span>
                  {agenda.date && <span style={{ fontSize: 12, color: "var(--ink-4)" }}>{fmtAgendaDate(agenda.date)}</span>}
                  <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} title="Export agenda HTML" onClick={(e) => { e.stopPropagation(); exportAgendaHtml(project, agenda, data.contacts, all.user.feedbackEmail ?? ""); }}><Download size={12} /></button>
                  {project.meetingAgendaLocationUrl?.trim() && (
                    <button
                      className="icon-btn"
                      style={{ width: 26, height: 26, color: copiedAgendaId === agenda.id ? "var(--green, #16a34a)" : "var(--ink-4)" }}
                      title="Copy meeting URL"
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = getMeetingAgendaUrl(project, agenda);
                        if (!url) return;
                        navigator.clipboard.writeText(url);
                        setCopiedAgendaId(agenda.id);
                        setTimeout(() => setCopiedAgendaId((cur) => (cur === agenda.id ? null : cur)), 1600);
                      }}
                    >
                      {copiedAgendaId === agenda.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}
                  <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} onClick={(e) => { e.stopPropagation(); startEdit(agenda); }}><Pencil size={12} /></button>
                  <button className="icon-btn" style={{ width: 26, height: 26, color: "var(--ink-4)" }} onClick={(e) => { e.stopPropagation(); deleteMeeting(agenda.id); }}><Trash2 size={12} /></button>
                </div>

                {/* Body — only when open */}
                {isOpen && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* Attendees */}
                    {pool.length > 0 && (
                      <div style={{ marginBottom: 4 }}>
                        {attendeeRow(
                          agenda.attendees,
                          (next) => updateProject(project.id, {
                            agendas: (project.agendas ?? []).map((a) => a.id === agenda.id ? { ...a, attendees: next } : a),
                          }),
                        )}
                      </div>
                    )}
                    {/* Items */}
                    {agenda.items.map((item, idx) => {
                      const isChecked = checked.has(`${agenda.id}:${item.id}`);
                      const detailKey = `${agenda.id}:${item.id}`;
                      const isDetailOpen = detailOpen.has(detailKey);
                      return (
                        <div key={item.id} style={{ display: "flex", flexDirection: "column" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, color: "var(--ink-4)", minWidth: 16, textAlign: "right", flexShrink: 0 }}>{idx + 1}.</span>
                            <button
                              onClick={() => toggleCheck(agenda.id, item.id)}
                              style={{ width: 15, height: 15, borderRadius: 3, border: `1.5px solid ${isChecked ? "var(--accent)" : "var(--border)"}`, background: isChecked ? "var(--accent)" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.1s" }}
                            >
                              {isChecked && <Check size={9} style={{ color: "white" }} />}
                            </button>
                            {editingItemKey?.agendaId === agenda.id && editingItemKey?.itemId === item.id ? (
                              <input className="input" autoFocus value={editingItemText} onChange={(e) => setEditingItemText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveItemEdit(); if (e.key === "Escape") setEditingItemKey(null); }} onBlur={saveItemEdit} style={{ flex: 1, fontSize: 13, padding: "2px 6px" }} />
                            ) : (
                              <span style={{ flex: 1, fontSize: 13, color: isChecked ? "var(--ink-4)" : "var(--ink-2)", textDecoration: isChecked ? "line-through" : "none", transition: "color 0.1s", cursor: "text" }} onClick={() => { setEditingItemKey({ agendaId: agenda.id, itemId: item.id }); setEditingItemText(item.text); }}>
                                {item.text}
                              </span>
                            )}
                            <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                              <button className="icon-btn" style={{ width: 16, height: 14, color: idx === 0 ? "var(--border)" : "var(--ink-4)", cursor: idx === 0 ? "default" : "pointer" }} onClick={() => moveItem(agenda.id, item.id, -1)} disabled={idx === 0}><ChevronUp size={10} /></button>
                              <button className="icon-btn" style={{ width: 16, height: 14, color: idx === agenda.items.length - 1 ? "var(--border)" : "var(--ink-4)", cursor: idx === agenda.items.length - 1 ? "default" : "pointer" }} onClick={() => moveItem(agenda.id, item.id, 1)} disabled={idx === agenda.items.length - 1}><ChevronDown size={10} /></button>
                            </div>
                            <button className="icon-btn" title={isDetailOpen ? "Close notes" : "Add notes"} style={{ width: 20, height: 20, color: item.detail || isDetailOpen ? "var(--accent)" : "var(--ink-4)" }} onClick={() => toggleDetail(detailKey)}><AlignLeft size={11} /></button>
                            <button className="icon-btn" style={{ width: 20, height: 20, color: "var(--ink-4)" }} onClick={() => removeItem(agenda.id, item.id)}><X size={11} /></button>
                          </div>
                          {!isDetailOpen && item.detail && (
                            <div style={{ fontSize: 12, color: "var(--ink-3)", paddingLeft: 39, lineHeight: 1.45, marginTop: 2 }}>{item.detail}</div>
                          )}
                          {isDetailOpen && (
                            <textarea
                              key={detailKey}
                              autoFocus
                              defaultValue={item.detail ?? ""}
                              placeholder="Add notes for this topic…"
                              onBlur={(e) => saveDetail(agenda.id, item.id, e.target.value)}
                              rows={3}
                              style={{ marginLeft: 39, marginTop: 4, fontSize: 12, color: "var(--ink-2)", resize: "vertical", border: "1px solid var(--border)", borderRadius: 5, padding: "5px 8px", background: "transparent", outline: "none", lineHeight: 1.45, fontFamily: "inherit" }}
                            />
                          )}
                        </div>
                      );
                    })}
                    {/* Add item */}
                    <div style={{ display: "flex", gap: 7, marginTop: 2 }}>
                      <input className="input" placeholder="Add agenda item…" value={itemInputs[agenda.id] ?? ""} onChange={(e) => setItemInputs((p) => ({ ...p, [agenda.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") addItem(agenda.id); }} style={{ flex: 1, fontSize: 12.5 }} />
                      <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => addItem(agenda.id)}>Add</button>
                    </div>
                    {/* Meeting notes */}
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4, display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-4)" }}>Meeting notes</span>
                      <textarea
                        key={agenda.id + "-notes"}
                        defaultValue={agenda.notes ?? ""}
                        placeholder="Paste meeting minutes or summarize key decisions and action items…"
                        onBlur={(e) => {
                          const val = e.target.value;
                          updateProject(project.id, {
                            agendas: (project.agendas ?? []).map((a) => a.id === agenda.id ? { ...a, notes: val } : a),
                          });
                        }}
                        rows={5}
                        style={{ fontSize: 13, color: "var(--ink-2)", resize: "vertical", border: "1px solid var(--border)", borderRadius: 5, padding: "7px 10px", background: "transparent", outline: "none", lineHeight: 1.55, fontFamily: "inherit" }}
                      />
                    </div>
                    {/* Resources */}
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4, display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-4)" }}>Links</span>
                      {(agenda.resources ?? []).map((r) => (
                        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Link2 size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                          <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 12.5, color: "var(--accent)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</a>
                          <button className="icon-btn" style={{ width: 20, height: 20, color: "var(--ink-4)" }} onClick={() => removeLink(agenda.id, r.id)}><X size={11} /></button>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <input className="input" placeholder="Label" value={li.label} onChange={(e) => setLinkInputs((p) => ({ ...p, [agenda.id]: { ...li, label: e.target.value } }))} style={{ width: 110, fontSize: 12 }} />
                        <input className="input" placeholder="URL" value={li.url} onChange={(e) => setLinkInputs((p) => ({ ...p, [agenda.id]: { ...li, url: e.target.value } }))} onKeyDown={(e) => { if (e.key === "Enter") addLink(agenda.id); }} style={{ flex: 1, minWidth: 140, fontSize: 12 }} />
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => addLink(agenda.id)}>Add</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
