import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flag, Plus } from "lucide-react";
import { useStore } from "../store/store";
import { Avatar, DateInput, DueChip, StateTag, toDateInputValue } from "../components/ui";
import { TaskEditPanel } from "../components/TaskEditPanel";
import { SubtaskEditPanel } from "../components/SubtaskEditPanel";
import { nextActionSubtasks } from "./projects/NextActionsSection";
import type { Milestone, Subtask, Task } from "../lib/types";
import { assigneeAvatar, projectContactPool } from "../lib/projectContacts";

const colHead: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em",
};

type TaskRow = { kind: "task"; task: Task; milestoneName: string | null };
type SubtaskRow = { kind: "subtask"; projectId: string; milestone: Milestone; subtask: Subtask };
type Row = TaskRow | SubtaskRow;

function rowDue(row: Row): string | undefined {
  return row.kind === "task" ? row.task.due : row.subtask.due;
}

function sortRows(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => {
    const da = toDateInputValue(rowDue(a));
    const db = toDateInputValue(rowDue(b));
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  });
}

export function Tasks() {
  const { data, workspace, addTask } = useStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [nextFlag, setNextFlag] = useState(false);
  const [project, setProject] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [who, setWho] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<{ projectId: string; milestoneId: string; subtaskId: string } | null>(null);

  const taskAvatar = (t: Task) => {
    const proj = t.project ? data.projects.find((p) => p.title === t.project) : null;
    return assigneeAvatar(projectContactPool(proj, data.contacts), t.assignee, t.who);
  };
  const subtaskAvatar = (projectId: string, s: Subtask) =>
    assigneeAvatar(projectContactPool(data.projects.find((p) => p.id === projectId), data.contacts), s.assignee, s.who);

  useEffect(() => { setProject(""); setMilestoneId(""); setWho(""); setNextFlag(false); setEditingId(null); setEditingSubtask(null); }, [workspace]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const captureMilestones = useMemo(
    () => data.projects.find((p) => p.title === project)?.milestones ?? [],
    [data.projects, project],
  );

  const capture = () => {
    if (!text.trim()) return;
    const task: Task = {
      id: "t" + Date.now(),
      text: text.trim(),
      done: false,
      next: nextFlag,
      context: "",
      project: project || null,
      ...(milestoneId ? { milestoneId } : {}),
      ...(who.trim() ? { who: who.trim() } : {}),
      ...(due ? { due } : {}),
    };
    addTask(task, "today");
    setText("");
    setDue("");
    setMilestoneId("");
    setWho("");
    setNextFlag(false);
  };

  const milestoneMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of data.projects) for (const ms of p.milestones) m.set(ms.id, ms.title);
    return m;
  }, [data.projects]);

  // All next-action, not-done Tasks (across the whole app), keyed by project title (or null for none).
  const nextTasksByProject = useMemo(() => {
    const m = new Map<string | null, Task[]>();
    for (const t of [...data.todayTasks, ...data.upcoming, ...data.someday]) {
      if (!t.next || t.done) continue;
      const key = t.project ?? null;
      const list = m.get(key) ?? [];
      list.push(t);
      m.set(key, list);
    }
    return m;
  }, [data.todayTasks, data.upcoming, data.someday]);

  // One group per project (in project order) + a trailing "No project" group.
  const groups = useMemo(() => {
    const result: { key: string; title: string; projectId: string | null; rows: Row[] }[] = [];

    for (const p of data.projects) {
      const rows: Row[] = [];
      for (const t of nextTasksByProject.get(p.title) ?? []) {
        rows.push({ kind: "task", task: t, milestoneName: t.milestoneId ? (milestoneMap.get(t.milestoneId) ?? null) : null });
      }
      for (const { milestone, subtask } of nextActionSubtasks(p)) {
        rows.push({ kind: "subtask", projectId: p.id, milestone, subtask });
      }
      if (rows.length > 0) {
        result.push({ key: p.id, title: p.title, projectId: p.id, rows: sortRows(rows) });
      }
    }

    const looseTasks = nextTasksByProject.get(null) ?? [];
    if (looseTasks.length > 0) {
      const rows: Row[] = looseTasks.map((t) => ({
        kind: "task",
        task: t,
        milestoneName: t.milestoneId ? (milestoneMap.get(t.milestoneId) ?? null) : null,
      }));
      result.push({ key: "__none__", title: "No project", projectId: null, rows: sortRows(rows) });
    }

    return result;
  }, [data.projects, nextTasksByProject, milestoneMap]);

  const totalCount = useMemo(() => groups.reduce((sum, g) => sum + g.rows.length, 0), [groups]);

  return (
    <div className="page fade">
      <div className="page-head">
        <div className="page-title">Tasks</div>
        <div className="page-sub">
          Next actions across all projects · press <kbd className="mono" style={{ fontSize: 12, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, padding: "0 5px" }}>T</kbd> to capture
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
        <select
          className="input"
          style={{ width: 150, fontSize: 12.5 }}
          value={project}
          onChange={(e) => { setProject(e.target.value); setMilestoneId(""); }}
        >
          <option value="">No project</option>
          {data.projects.map((p) => <option key={p.id} value={p.title}>{p.title}</option>)}
        </select>
        <select
          className="input"
          style={{ width: 150, fontSize: 12.5 }}
          value={milestoneId}
          onChange={(e) => setMilestoneId(e.target.value)}
          disabled={!project}
        >
          <option value="">No milestone</option>
          {captureMilestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <input
          className="input"
          style={{ width: 120, fontSize: 12.5 }}
          placeholder="Assigned to"
          value={who}
          onChange={(e) => setWho(e.target.value)}
        />
        <button
          type="button"
          className={"chip" + (nextFlag ? " next" : "")}
          style={{ cursor: "pointer" }}
          aria-pressed={nextFlag}
          onClick={() => setNextFlag((v) => !v)}
        >
          <Flag size={12} /> Next Action
        </button>
        <button className="btn btn-primary" onClick={capture}><Plus /> Add</button>
      </div>

      {totalCount === 0 && (
        <div className="card" style={{ padding: "14px 12px", fontSize: 13, color: "var(--ink-4)" }}>
          Nothing flagged as next action.
        </div>
      )}

      {groups.map((g) => (
        <div key={g.key} style={{ marginBottom: 22 }}>
          <div className="section-h">
            {g.projectId ? (
              <span
                onClick={() => navigate(`/projects/${g.projectId}`)}
                title="Open project"
                style={{ cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}
              >
                {g.title}
              </span>
            ) : (
              g.title
            )}{" "}
            <span style={{ fontWeight: 500 }}>{g.rows.length}</span>
          </div>
          <div className="card" style={{ padding: "6px 10px 8px" }}>
            <div style={{ display: "flex", gap: 10, padding: "4px 4px 6px", borderBottom: "1px solid var(--border)", marginBottom: 2 }}>
              <span style={{ flex: 1, ...colHead }}>Task</span>
              <span style={{ width: 130, flexShrink: 0, ...colHead }}>Milestone</span>
              <span style={{ width: 78, flexShrink: 0, ...colHead }}>Due</span>
              <span style={{ width: 120, flexShrink: 0, ...colHead }}>Owner</span>
              <span style={{ width: 110, flexShrink: 0, ...colHead }}>Status</span>
            </div>
            {g.rows.map((row) => {
              const isTask = row.kind === "task";
              const name = isTask ? row.task.text : row.subtask.t;
              const milestoneName = isTask ? row.milestoneName : row.milestone.title;
              const dueVal = isTask ? row.task.due : row.subtask.due;
              const doneVal = isTask ? row.task.done : row.subtask.done;
              const avatar = isTask ? taskAvatar(row.task) : subtaskAvatar(row.projectId, row.subtask);
              const ownerLabel = avatar.title || "—";
              const key = isTask ? row.task.id : row.subtask.id;
              return (
                <button
                  key={key}
                  onClick={() =>
                    isTask
                      ? setEditingId(row.task.id)
                      : setEditingSubtask({ projectId: row.projectId, milestoneId: row.milestone.id, subtaskId: row.subtask.id })
                  }
                  title="Open task details"
                  style={{
                    display: "flex", width: "100%", gap: 10, padding: "7px 4px",
                    borderBottom: "1px solid var(--border)", alignItems: "center", flexWrap: "wrap",
                    textAlign: "left", cursor: "pointer",
                  }}
                >
                  <span className="row-title-flex" style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500 }}>{name}</span>
                  <span style={{ width: 130, flexShrink: 0, fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {milestoneName ?? "—"}
                  </span>
                  <span style={{ width: 78, flexShrink: 0 }}>
                    {dueVal ? <DueChip due={dueVal} done={doneVal} /> : <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>—</span>}
                  </span>
                  <span style={{ width: 120, flexShrink: 0, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                    {avatar.ini && <Avatar who={avatar.ini} size={20} color={avatar.color ?? "var(--ink-3)"} />}
                    <span style={{ fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ownerLabel}
                    </span>
                  </span>
                  <span style={{ width: 110, flexShrink: 0 }}>
                    <StateTag task={isTask ? row.task : row.subtask} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {editingId && <TaskEditPanel taskId={editingId} close={() => setEditingId(null)} />}
      {editingSubtask && (
        <SubtaskEditPanel
          projectId={editingSubtask.projectId}
          milestoneId={editingSubtask.milestoneId}
          subtaskId={editingSubtask.subtaskId}
          close={() => setEditingSubtask(null)}
        />
      )}
    </div>
  );
}
