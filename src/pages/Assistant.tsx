import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { useStore } from "../store/store";
import { askAssistant, claudeConfigured } from "../lib/claude";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "What's my next action across all projects?",
  "Who haven't I contacted in 30 days?",
  "Run a GTD weekly review",
  "Draft a status update email for a project",
];

export function Assistant() {
  const { workspace, data, all } = useStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setInput("");
    const history = messages;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setThinking(true);
    try {
      const answer = await askAssistant(q, history, workspace, data, all.user);
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry — something went wrong. Check your connection and try again." }]);
    } finally {
      setThinking(false);
    }
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
          <div key={i} className={`bubble ${m.role}`}>{m.content}</div>
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
          placeholder="Ask about your projects, tasks, contacts…"
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
