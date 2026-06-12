import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Plus } from "lucide-react";
import { useStore } from "../store/store";
import { DateInput, StateTag, TaskMarker, toDateInputValue } from "../components/ui";
import { TaskEditPanel } from "../components/TaskEditPanel";
import { SubtaskEditPanel } from "../components/SubtaskEditPanel";
import type { Subtask, Task, TaskGroup } from "../lib/types";

export function Tasks() {
  const { data, workspace, toggleTask, toggleSubtask, addTask } = useStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [group, setGroup] = useState<TaskGroup>("today");
  const [project, setProject] = useState("");
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [nextOnly, setNextOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<{ projectId: string; milestoneId: string; subtask: Subtask } | null>(null);

  useEffect(() => { setProject(""); setEditingId(null); }, [workspace]); // eslint-disable-line react-hooks/exhaustive-deps

  // press T anywhere to focus quick capture
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key.toLowerCase() === "t" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const projectTitles = useMemo(
    () => Array.from(new Set([...data.todayTasks, ...data.upcoming, ...data.someday].map((t) => t.project).filter(Boolean))) as string[],
    [data],
  );

  const capture = () => {
    if (!text.trim()) return;
    const task: Task = {
      id: "t" + Date.now(),
      text: text.trim(),
      done: false,
      next: false,
      context: "",
      project: project || null,
      ...(due ? { due } : {}),
    };
    addTask(task, group);
    setText("");
    setDue("");
  };

  const matches = (t: Task) =>
    (!filterProject || t.project === filterProject) &&
    (!nextOnly || (t.next && !t.done));

  const goToProject = (title: string | null) => {
    const p = title ? data.projects.find((x) => x.title === title) : null;
    if (p) navigate(`/projects/${p.id}`);
  };

  const remindInCalendar = (t: Task) => {
    const title = encodeURIComponent(t.text);
    const details = encodeURIComponent(`MakeItHappen reminder${t.project ? ` — ${t.project}` : ""}`);
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`, "_blank");
  };

  const todayISO = new Date().toISOString().slice(0, 10);

  const todayTaskIds = useMemo(() => new Set(data.todayTasks.map((t) => t.id)), [data.todayTasks]);

  // Subtasks from projects bucketed into overdue / today / upcoming (undone only)
  const projectSubtasks = useMemo(() => {
    type PSub = { projectId: string; milestoneId: string; projectTitle: string; subtask: Subtask };
    const overdue: PSub[] = [];
    const today: PSub[] = [];
    const upcoming: PSub[] = [];
    for (const p of data.projects) {
      for (const m of p.milestones) {
        for (const s of m.subtasks) {
          if (!s.due || s.done) continue;
          const iso = toDateInputValue(s.due);
          if (!iso) continue;
          const entry = { projectId: p.id, milestoneId: m.id, projectTitle: p.title, subtask: s };
          if (iso < todayISO) overdue.push(entry);
          else if (iso === todayISO) today.push(entry);
          else upcoming.push(entry);
        }
      }
    }
    return { overdue, today, upcoming };
  }, [data.projects, todayISO]);

  // Derive display buckets from due dates rather than storage buckets
  const { overdueList, todayList, upcomingList } = useMemo(() => {
    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];
    for (const t of [...data.todayTasks, ...data.upcoming]) {
      const iso = toDateInputValue(t.due);
      if (iso && iso < todayISO) {
        overdue.push(t);
      } else if (iso && iso === todayISO) {
        today.push(t);
      } else if (iso && iso > todayISO) {
        upcoming.push(t);
      } else {
        // Unparseable/relative date — fall back to original storage bucket
        (todayTaskIds.has(t.id) ? today : upcoming).push(t);
      }
    }
    return { overdueList: overdue, todayList: today, upcomingList: upcoming };
  }, [data.todayTasks, data.upcoming, todayISO, todayTaskIds]);

  type DisplaySection = { key: string; label: string; list: Task[]; pSubs: typeof projectSubtasks.today };
  const sections: DisplaySection[] = [
    { key: "overdue", label: "Overdue", list: overdueList, pSubs: projectSubtasks.overdue },
    { key: "today", label: "Today", list: todayList, pSubs: projectSubtasks.today },
    { key: "upcoming", label: "Upcoming", list: upcomingList, pSubs: projectSubtasks.upcoming },
    { key: "someday", label: "Someday", list: data.someday, pSubs: [] },
  ];

  return (
    <div className="page fade">
      <div className="page-head">
        <div className="page-title">Tasks</div>
        <div className="page-sub">
          {[...data.todayTasks, ...data.upcoming].filter((t) => !t.done).length} open · press <kbd className="mono" style={{ fontSize: 12, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, padding: "0 5px" }}>T</kbd> to capture
        </div>
      </div>

      {/* Quick capture */}
      <div className="card" style={{ display: "flex", gap: 9, padding: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <input
          ref={inputRef}
          className="input"
          style={{ flex: 1, minWidth: 180, border: "none", boxShadow: "none" }}
          placeholder="Capture a task…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && capture()}
        />
        <DateInput
          value={due}
          onChange={setDue}
          style={{ width: 130, fontSize: 12.5 }}
        />
        <select className="input" style={{ width: 150, fontSize: 12.5 }} value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">No project</option>
          {data.projects.map((p) => <option key={p.id} value={p.title}>{p.title}</option>)}
        </select>
        <select className="input" style={{ width: 105, fontSize: 12.5 }} value={group} onChange={(e) => setGroup(e.target.value as TaskGroup)}>
          <option value="today">Today</option>
          <option value="upcoming">Upcoming</option>
          <option value="someday">Someday</option>
        </select>
        <button className="btn btn-primary" onClick={capture}><Plus /> Add</button>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 7, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className="chip next"
          style={{ cursor: "pointer", opacity: nextOnly ? 1 : 0.55 }}
          onClick={() => setNextOnly((v) => !v)}
        >
          Next actions only
        </button>
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
      </div>

      {sections.map(({ key, label, list, pSubs }) => {
        const visible = list.filter(matches);
        const totalOpen = visible.filter((t) => !t.done).length + pSubs.length;
        return (
          <div key={key} style={{ marginBottom: 22 }}>
            <div className="section-h">
              {label} <span style={{ fontWeight: 500 }}>{totalOpen}</span>
            </div>
            <div className="card" style={{ padding: "6px 10px 8px" }}>
              {visible.length === 0 && pSubs.length === 0 && (
                <div style={{ padding: "10px 8px", fontSize: 13, color: "var(--ink-4)" }}>Nothing here.</div>
              )}
              {visible.map((t) => (
                <div key={t.id} className="task-row">
                  <TaskMarker task={t} onClick={() => toggleTask(t.id)} />
                  <button
                    style={{ flex: 1, fontSize: 13, textAlign: "left", cursor: "pointer" }}
                    className={t.done ? "strike" : ""}
                    title="Edit task"
                    onClick={() => setEditingId(t.id)}
                  >
                    {t.text}
                  </button>
                  <StateTag task={t} />
                  {t.project && (
                    <button className="chip" style={{ cursor: "pointer" }} onClick={() => goToProject(t.project)}>
                      {t.project}
                    </button>
                  )}
                  {t.due && <span style={{ fontSize: 11.5, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{t.due}</span>}
                  <button
                    className="icon-btn"
                    style={{ width: 24, height: 24, color: t.reminder ? "var(--accent)" : undefined }}
                    title={t.reminder ? `Reminder ${t.reminder} — open in Google Calendar` : "Add a Google Calendar reminder"}
                    onClick={() => remindInCalendar(t)}
                  >
                    <Bell size={13} />
                  </button>
                </div>
              ))}
              {pSubs.map(({ projectId, milestoneId, projectTitle, subtask }) => (
                <div key={subtask.id} className="task-row">
                  <TaskMarker task={subtask} onClick={() => toggleSubtask(projectId, milestoneId, subtask.id)} />
                  <button
                    style={{ flex: 1, fontSize: 13, textAlign: "left", cursor: "pointer" }}
                    className={subtask.done ? "strike" : ""}
                    title="Edit task"
                    onClick={() => setEditingSubtask({ projectId, milestoneId, subtask })}
                  >
                    {subtask.t}
                  </button>
                  <StateTag task={subtask} />
                  <button className="chip" style={{ cursor: "pointer" }} onClick={() => goToProject(projectTitle)}>
                    {projectTitle}
                  </button>
                  {subtask.due && <span style={{ fontSize: 11.5, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{subtask.due}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {editingId && <TaskEditPanel taskId={editingId} close={() => setEditingId(null)} />}
      {editingSubtask && (
        <SubtaskEditPanel
          projectId={editingSubtask.projectId}
          milestoneId={editingSubtask.milestoneId}
          subtask={editingSubtask.subtask}
          close={() => setEditingSubtask(null)}
        />
      )}
    </div>
  );
}
