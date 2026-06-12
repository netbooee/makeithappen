import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Flag } from "lucide-react";
import { useStore } from "../store/store";
import { Bar, StateTag, StatusChip, TaskMarker } from "../components/ui";
import { TaskEditPanel } from "../components/TaskEditPanel";

export function Today() {
  const { data, workspace, toggleTask, toggleHabit } = useStore();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const spotlight = data.spotlight;
  const spotlightTask = data.todayTasks.find((t) => t.text.startsWith(spotlight.text.slice(0, 18)));
  const activeProjects = data.projects.filter((p) => p.status === "active").slice(0, 4);
  const followUps = data.contacts.filter((c) => c.followUp);

  const goToProjectByTitle = (title: string | null) => {
    const p = title ? data.projects.find((x) => x.title === title) : null;
    navigate(p ? `/projects/${p.id}` : "/tasks");
  };

  return (
    <div className="page fade">
      <div className="page-head" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="page-title">{dateLabel}</div>
          <div className="page-sub">Here's what matters today.</div>
        </div>
        <span className={`chip ${workspace}`}>
          <span className="dot" style={{ background: workspace === "work" ? "var(--work)" : "var(--personal)" }} />
          {workspace === "work" ? "Work" : "Personal"}
        </span>
      </div>

      {/* Next action spotlight */}
      <div className="card card-pad spotlight-card" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="section-h" style={{ marginBottom: 6, color: "var(--next-ink)" }}>
            <Flag size={12} /> Next action
          </div>
          <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
            {spotlight.text}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="chip" style={{ cursor: "pointer" }} onClick={() => goToProjectByTitle(spotlight.project)}>
              {spotlight.project}
            </button>
            <span className="chip">{spotlight.milestone}</span>
            <span className="chip context">{spotlight.context}</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{spotlight.due}</span>
          </div>
        </div>
        <button
          className="btn"
          style={{ background: "var(--next)", color: "#fff", flexShrink: 0 }}
          onClick={() => spotlightTask && toggleTask(spotlightTask.id)}
        >
          <Check /> Done
        </button>
      </div>

      {/* Today's tasks */}
      <div className="section-h">Today's tasks</div>
      <div className="card" style={{ padding: "6px 10px 8px", marginBottom: 24 }}>
        {data.todayTasks.map((t) => (
          <div key={t.id} className="task-row">
            <TaskMarker task={t} onClick={() => toggleTask(t.id)} />
            <button
              style={{ flex: 1, fontSize: 13, textAlign: "left", cursor: "pointer" }}
              className={t.done ? "strike" : ""}
              onClick={() => setEditingId(t.id)}
              title="Edit task"
            >
              {t.text}
            </button>
            <StateTag task={t} />
            {t.project && (
              <button className="chip" style={{ cursor: "pointer" }} onClick={() => goToProjectByTitle(t.project)}>
                {t.project}
              </button>
            )}
            <span className="chip context">{t.context}</span>
          </div>
        ))}
      </div>

      {/* Habit check-in strip */}
      <div className="section-h">Habit check-in</div>
      <div className="habit-strip" style={{ marginBottom: 24 }}>
        {data.habits.map((h) => (
          <button key={h.id} className={"habit-bubble" + (h.doneToday ? " done" : "")} onClick={() => toggleHabit(h.id)}>
            <span>{h.icon}</span> {h.name}
            {h.doneToday && <Check size={14} />}
          </button>
        ))}
      </div>

      {/* Mini project pulse */}
      <div className="section-h">Project pulse</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {activeProjects.map((p) => {
          const activeMs = p.milestones.find((m) => m.status === "active") || p.milestones[0];
          return (
            <button
              key={p.id}
              className="card"
              onClick={() => navigate(`/projects/${p.id}`)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", textAlign: "left", cursor: "pointer" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 4 }}>
                  <ChevronRight size={11} /> {activeMs.title}
                </div>
              </div>
              <div style={{ width: 120, flexShrink: 0 }}><Bar value={p.progress} /></div>
              <StatusChip status={p.status} />
            </button>
          );
        })}
      </div>

      {/* Follow-up nudges */}
      {followUps.length > 0 && (
        <>
          <div className="section-h">Follow-ups</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {followUps.map((c) => (
              <button
                key={c.id}
                className="card"
                onClick={() => navigate(`/contacts/${c.id}`)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", textAlign: "left", cursor: "pointer" }}
              >
                <span style={{ fontSize: 17 }}>👋</span>
                <span style={{ fontSize: 13, color: "var(--ink-2)", flex: 1 }}>
                  You haven't talked to <b style={{ fontWeight: 600, color: "var(--ink)" }}>{c.name}</b> recently — last contact {c.lastDate}.
                </span>
                <span className="chip">{c.rel}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {editingId && <TaskEditPanel taskId={editingId} close={() => setEditingId(null)} />}
    </div>
  );
}
