import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Mail, Phone, Plus, Search, Trash2 } from "lucide-react";
import { useStore } from "../store/store";
import { Avatar, DateInput } from "../components/ui";
import type { Contact, ContactTouch, Relationship } from "../lib/types";

const RELS: Relationship[] = ["Colleague", "Client", "Vendor", "Friend", "Family", "Other"];
const COLORS = ["#4F6BED", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#0EA5E9"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(s: string): Date | null {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const match = s.match(/^(\w{3})\s+(\d{1,2})(?:[,\s]+(\d{4}))?$/);
  if (match) {
    const mo = MONTHS.findIndex((x) => x === match[1]);
    if (mo >= 0) return new Date(match[3] ? +match[3] : new Date().getFullYear(), mo, +match[2]);
  }
  return null;
}

function formatShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function latestTouchDate(contact: Contact): string {
  const touches = contact.touchpoints ?? [];
  if (touches.length) return [...touches].sort((a, b) => b.date.localeCompare(a.date))[0].date;
  return contact.lastDate;
}

function nextE6WDate(contact: Contact): Date | null {
  const last = parseLocalDate(latestTouchDate(contact));
  if (!last) return null;
  const next = new Date(last);
  next.setDate(next.getDate() + 42);
  return next;
}

type E6WBadge = { label: string; bg: string; color: string; overdue: boolean };

function getE6WBadge(contact: Contact): E6WBadge | null {
  if (!contact.e6w) return null;
  const next = nextE6WDate(contact);
  if (!next) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((next.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, bg: "#FEE2E2", color: "#DC2626", overdue: true };
  if (days === 0) return { label: "Due today", bg: "#FEF3C7", color: "#D97706", overdue: false };
  if (days <= 7) return { label: `${days}d`, bg: "#FEF3C7", color: "#D97706", overdue: false };
  return { label: formatShort(next), bg: "var(--surface-2)", color: "var(--ink-4)", overdue: false };
}

/* ====================== ContactList ====================== */

export function ContactList() {
  const { data, addContact } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filterRel, setFilterRel] = useState<Relationship | null>(null);
  const [filterE6W, setFilterE6W] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newRel, setNewRel] = useState<Relationship>("Colleague");

  const visible = useMemo(
    () =>
      data.contacts.filter(
        (c) =>
          (!filterRel || c.rel === filterRel) &&
          (!filterE6W || c.e6w) &&
          (!query || `${c.name} ${c.company} ${c.role}`.toLowerCase().includes(query.toLowerCase())),
      ),
    [data.contacts, filterRel, filterE6W, query],
  );

  const e6wCount = data.contacts.filter((c) => c.e6w).length;
  const overdueCount = data.contacts.filter((c) => getE6WBadge(c)?.overdue).length;

  const submit = () => {
    if (!newName.trim()) return;
    addContact({
      id: "c" + Date.now(),
      name: newName.trim(),
      company: newCompany.trim(),
      role: "",
      rel: newRel,
      email: "",
      phone: "",
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      lastNote: "",
      lastDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      followUp: false,
      remember: "",
      e6w: false,
      touchpoints: [],
    });
    setAdding(false);
    setNewName("");
    setNewCompany("");
  };

  return (
    <div className="page fade">
      <div className="page-head" style={{ display: "flex", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div className="page-title">E6W Networking</div>
          <div className="page-sub">
            {data.contacts.length} contacts · {e6wCount} in rotation
            {overdueCount > 0 && (
              <span style={{ color: "#DC2626", fontWeight: 600 }}> · {overdueCount} overdue</span>
            )}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus /> New contact</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: 11, color: "var(--ink-4)" }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="Search contacts…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button
          className="chip"
          style={{
            cursor: "pointer",
            borderColor: filterE6W ? "var(--accent)" : undefined,
            color: filterE6W ? "var(--accent-ink)" : undefined,
            fontWeight: 600,
          }}
          onClick={() => setFilterE6W((v) => !v)}
        >
          E6W only
        </button>
        {RELS.map((r) => (
          <button
            key={r}
            className="chip"
            style={{ cursor: "pointer", borderColor: filterRel === r ? "var(--accent)" : undefined, color: filterRel === r ? "var(--accent-ink)" : undefined }}
            onClick={() => setFilterRel(filterRel === r ? null : r)}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="grid-2">
        {visible.map((c) => {
          const badge = getE6WBadge(c);
          const touches = (c.touchpoints ?? []).sort((a, b) => b.date.localeCompare(a.date));
          const latest = touches[0];
          const displayNote = latest?.note || c.lastNote || "No notes yet";
          const displayDate = latest
            ? (() => { const d = parseLocalDate(latest.date); return d ? formatShort(d) : latest.date; })()
            : c.lastDate;
          return (
            <button key={c.id} className="card contact-card" onClick={() => navigate(`/contacts/${c.id}`)}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <Avatar who={initials(c.name)} size={36} color={c.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    {[c.role, c.company].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <span className="chip">{c.rel}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-3)" }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayNote}</span>
                <span style={{ color: "var(--ink-4)", flexShrink: 0 }}>{displayDate}</span>
                {badge ? (
                  <span style={{
                    flexShrink: 0, fontSize: 11, padding: "2px 7px", borderRadius: 99,
                    background: badge.bg, color: badge.color, fontWeight: 600,
                  }}>
                    {badge.label}
                  </span>
                ) : (
                  c.followUp && <span className="chip next" style={{ flexShrink: 0 }}>Follow up</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {adding && (
        <div className="modal-center">
          <div className="overlay-bg" onClick={() => setAdding(false)} style={{ position: "fixed" }} />
          <div className="modal-card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>New contact</div>
            <input className="input" autoFocus placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            <input className="input" placeholder="Company" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {RELS.map((r) => (
                <button
                  key={r}
                  className="chip"
                  style={{ cursor: "pointer", borderColor: newRel === r ? "var(--accent)" : undefined, color: newRel === r ? "var(--accent-ink)" : undefined }}
                  onClick={() => setNewRel(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button className="btn btn-primary" onClick={submit}>Add contact</button>
              <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================== ContactDetail ====================== */

export function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, updateContact, deleteContact, addTouchpoint, deleteTouchpoint } = useStore();
  const contact = data.contacts.find((c) => c.id === id);

  const [touchDate, setTouchDate] = useState(todayISO);
  const [touchNote, setTouchNote] = useState("");

  if (!contact) {
    return (
      <div className="page fade">
        <div className="page-title">Contact not found</div>
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate("/contacts")}>Back to E6W Networking</button>
      </div>
    );
  }

  const set = (patch: Partial<Contact>) => updateContact(contact.id, patch);

  const sortedTouches = [...(contact.touchpoints ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  const logTouch = () => {
    if (!touchDate) return;
    const touch: ContactTouch = { id: "tp" + Date.now(), date: touchDate, note: touchNote.trim() };
    addTouchpoint(contact.id, touch);
    setTouchNote("");
  };

  const badge = getE6WBadge(contact);
  const nextDate = contact.e6w ? nextE6WDate(contact) : null;

  const bannerBg = badge ? badge.bg : "var(--accent-soft)";
  const bannerColor = badge ? badge.color : "var(--accent)";

  return (
    <div className="page fade" style={{ maxWidth: 720 }}>
      <button
        onClick={() => navigate("/contacts")}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-3)", marginBottom: 16, fontWeight: 500 }}
      >
        <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /> E6W Networking
      </button>

      <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar who={initials(contact.name)} size={52} color={contact.color} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: "-0.01em" }}>{contact.name}</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
              {[contact.role, contact.company].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "var(--ink-2)" }}>
          {contact.email && (
            <a href={`mailto:${contact.email}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Mail size={13} /> {contact.email}
            </a>
          )}
          {contact.phone && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Phone size={13} /> {contact.phone}
            </span>
          )}
        </div>

        {/* Relationship */}
        <div>
          <div className="field-label" style={{ marginBottom: 7 }}>Relationship</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RELS.map((r) => (
              <button
                key={r}
                className="chip"
                style={{ cursor: "pointer", borderColor: contact.rel === r ? "var(--accent)" : undefined, color: contact.rel === r ? "var(--accent-ink)" : undefined }}
                onClick={() => set({ rel: r })}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* E6W toggle */}
        <div className="tweak-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 550, color: "var(--ink)" }}>E6W rotation</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Keep in touch every 6 weeks</div>
          </div>
          <button
            className={"switch" + (contact.e6w ? " on" : "")}
            role="switch"
            aria-checked={!!contact.e6w}
            onClick={() => set({ e6w: !contact.e6w })}
          />
        </div>

        {/* Next check-in banner */}
        {contact.e6w && nextDate && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", borderRadius: 10,
            background: bannerBg,
            border: `1px solid ${bannerColor}`,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: bannerColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                Next check-in
              </div>
              <div style={{ fontSize: 15, fontWeight: 650, color: bannerColor }}>
                {formatShort(nextDate)}
              </div>
            </div>
            {badge && (
              <span style={{ fontSize: 13, fontWeight: 700, color: badge.color }}>{badge.label}</span>
            )}
          </div>
        )}

        {/* Interactions log */}
        <div>
          <div className="field-label" style={{ marginBottom: 10 }}>Interactions</div>

          {/* Quick-add row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <DateInput
              value={touchDate}
              onChange={setTouchDate}
              returnRaw
              style={{ width: 130 }}
            />
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="Note (optional)"
              value={touchNote}
              onChange={(e) => setTouchNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && logTouch()}
            />
            <button className="btn btn-primary" style={{ whiteSpace: "nowrap" }} onClick={logTouch}>
              Log
            </button>
          </div>

          {/* Touchpoints list */}
          {sortedTouches.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-4)", padding: "4px 0" }}>No interactions logged yet.</div>
          ) : (
            sortedTouches.map((t) => {
              const d = parseLocalDate(t.date);
              return (
                <div
                  key={t.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", whiteSpace: "nowrap", minWidth: 52 }}>
                    {d ? formatShort(d) : t.date}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: t.note ? "var(--ink-2)" : "var(--ink-4)" }}>
                    {t.note || "—"}
                  </span>
                  <button
                    className="icon-btn"
                    style={{ color: "var(--ink-4)", width: 24, height: 24 }}
                    title="Delete"
                    onClick={() => deleteTouchpoint(contact.id, t.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Remember this */}
        <div>
          <div className="field-label" style={{ marginBottom: 7 }}>Remember this</div>
          <textarea
            className="input"
            rows={4}
            placeholder="How you met, personal details, follow-up topics…"
            value={contact.remember}
            onChange={(e) => set({ remember: e.target.value })}
          />
        </div>

        {/* Follow-up flag */}
        <div className="tweak-row">
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 550, color: "var(--ink)" }}>Follow-up flag</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Surfaces a nudge on your Today dashboard</div>
          </div>
          <button
            className={"switch" + (contact.followUp ? " on" : "")}
            role="switch"
            aria-checked={contact.followUp}
            onClick={() => set({ followUp: !contact.followUp })}
          />
        </div>

        {/* Delete */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <button
            className="btn btn-ghost"
            style={{ color: "var(--danger)", borderColor: "color-mix(in oklab, var(--danger) 30%, transparent)" }}
            onClick={() => { deleteContact(contact.id); navigate("/contacts"); }}
          >
            <Trash2 size={14} /> Delete contact
          </button>
        </div>

      </div>
    </div>
  );
}
