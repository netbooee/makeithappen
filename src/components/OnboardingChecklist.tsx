import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight, Flag, FolderKanban, ListTodo, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const DISMISSED_KEY = "mih_onboarding_dismissed_v1";

const STEPS: { icon: LucideIcon; label: string; sub: string; path: string }[] = [
  { icon: FolderKanban, label: "Open a project", sub: "See milestones, risk, and updates in one place", path: "/projects" },
  { icon: ListTodo, label: "Flag a next action", sub: "Toggle \"Next action\" on a task to have it surface everywhere", path: "/tasks" },
  { icon: Flag, label: "Log a status update", sub: "Add one from a project page, then try Export HTML", path: "/projects" },
];

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "1");

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="card card-pad" style={{ borderLeft: "3px solid var(--accent)", marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 650, letterSpacing: "-0.01em" }}>New here? Start with these</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>A few things to try first — dismiss any time.</div>
        </div>
        <button className="icon-btn" style={{ color: "var(--ink-4)", flexShrink: 0 }} onClick={dismiss} title="Dismiss">
          <X size={15} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {STEPS.map((s) => (
          <button
            key={s.label}
            className="card"
            onClick={() => navigate(s.path)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", textAlign: "left", cursor: "pointer", background: "var(--surface-2)" }}
          >
            <s.icon size={16} style={{ color: "var(--accent-ink)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 550 }}>{s.label}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{s.sub}</div>
            </div>
            <ChevronRight size={14} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
          </button>
        ))}
      </div>

      <button
        className="btn btn-ghost"
        style={{ alignSelf: "flex-start", fontSize: 12, gap: 6 }}
        onClick={() => navigate("/help")}
      >
        <BookOpen size={13} /> Read the full guide
      </button>
    </div>
  );
}
