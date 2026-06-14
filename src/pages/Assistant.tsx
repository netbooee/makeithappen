import { useEffect, useRef, useState } from "react";
import { Check, Send, Sparkles, UserRound } from "lucide-react";
import { useStore } from "../store/store";
import { askAssistant, claudeConfigured } from "../lib/claude";
import type { ImportContact } from "../lib/claude";
import type { Contact } from "../lib/types";

interface Msg {
  role: "user" | "assistant";
  content: string;
  contacts?: ImportContact[];
}

const CONTACT_COLORS = ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

const SUGGESTED = [
  "What's my next action across all projects?",
  "Who haven't I contacted in 30 days?",
  "Run a GTD weekly review",
  "Import contacts from a list",
];

function extractContacts(raw: string): { text: string; contacts?: ImportContact[] } {
  const m = raw.match(/<import-contacts>([\s\S]*?)<\/import-contacts>/);
  if (m) {
    try {
      const contacts = JSON.parse(m[1].trim()) as ImportContact[];
      const text = raw.replace(/<import-contacts>[\s\S]*?<\/import-contacts>/, "").trim();
      return { text, contacts };
    } catch { /* fall through */ }
  }
  return { text: raw };
}

function ImportCard({
  contacts, workspace, onImport, imported,
}: {
  contacts: ImportContact[];
  workspace: string;
  onImport: () => void;
  imported: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
        Found <strong>{contacts.length}</strong> contact{contacts.length !== 1 ? "s" : ""} for your <strong>{workspace}</strong> workspace:
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 220, overflowY: "auto", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface-1)" }}>
        {contacts.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderBottom: i < contacts.length - 1 ? "0.5px solid var(--border)" : undefined }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: CONTACT_COLORS[i % CONTACT_COLORS.length] + "22", color: CONTACT_COLORS[i % CONTACT_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 600 }}>
              {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{c.company}{c.role ? ` · ${c.role}` : ""}</div>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-4)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{c.email}</div>
          </div>
        ))}
      </div>
      {imported ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--next)", fontWeight: 500 }}>
          <Check size={14} /> {contacts.length} contacts imported
        </div>
      ) : (
        <button className="btn btn-primary" style={{ alignSelf: "flex-start", fontSize: 12.5, gap: 6 }} onClick={onImport}>
          <UserRound size={13} /> Import {contacts.length} contacts
        </button>
      )}
    </div>
  );
}

export function Assistant() {
  const { workspace, data, all, addContacts } = useStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [imported, setImported] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setInput("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: q }]);
    setThinking(true);
    try {
      const raw = await askAssistant(q, history, workspace, data, all.user);
      const { text: content, contacts } = extractContacts(raw);
      setMessages((m) => [...m, { role: "assistant", content, contacts }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry — something went wrong. Check your connection and try again." }]);
    } finally {
      setThinking(false);
    }
  };

  const handleImport = (msgIndex: number, contacts: ImportContact[]) => {
    const today = new Date().toISOString().slice(0, 10);
    const base = Date.now();
    const newContacts: Contact[] = contacts.map((c, i) => ({
      id: `c_import_${base}_${i}`,
      name: c.name,
      company: c.company,
      role: c.role,
      rel: "Colleague",
      email: c.email,
      phone: "",
      color: CONTACT_COLORS[i % CONTACT_COLORS.length],
      lastNote: "Imported via AI assistant",
      lastDate: today,
      followUp: false,
      remember: "",
      e6w: false,
      touchpoints: [],
    }));
    addContacts(newContacts);
    setImported((prev) => new Set(prev).add(msgIndex));
  };

  return (
    <div className="chat-wrap fade">
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 0 0", flexWrap: "wrap" }}>
        <span className={`chip ${workspace}`}>
          <span className="dot" style={{ background: workspace === "work" ? "var(--work)" : "var(--personal)" }} />
          {workspace === "work" ? "Work" : "Personal"}
        </span>
        <span style={{ fontSize: 12.5, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 5 }}>
          <Sparkles size={12} /> Connected to your data
          {!claudeConfigured && <span style={{ color: "var(--ink-4)" }}>· demo mode · add key in Settings</span>}
        </span>
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
                <Sparkles size={22} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 650, letterSpacing: "-0.01em" }}>How can I help?</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 3 }}>
                I can see your {workspace} projects, tasks, contacts, and habits.
              </div>
            </div>
            <div className="suggested">
              {SUGGESTED.map((s) => (
                <button key={s} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.contacts ? (
              <>
                {m.content && <div style={{ marginBottom: 10 }}>{m.content}</div>}
                <ImportCard
                  contacts={m.contacts}
                  workspace={workspace}
                  onImport={() => handleImport(i, m.contacts!)}
                  imported={imported.has(i)}
                />
              </>
            ) : (
              m.content
            )}
          </div>
        ))}
        {thinking && (
          <div className="bubble assistant">
            <span className="typing"><i /><i /><i /></span>
          </div>
        )}
      </div>

      <div className="chat-input-bar">
        <textarea
          className="input"
          rows={1}
          placeholder="Ask about your projects, tasks, contacts… or paste a contact list"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button className="btn btn-primary" style={{ height: 42 }} onClick={() => send(input)} disabled={thinking || !input.trim()}>
          <Send size={15} /> Send
        </button>
      </div>
    </div>
  );
}
