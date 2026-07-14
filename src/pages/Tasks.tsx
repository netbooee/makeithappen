import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, ChevronUp, LayoutList, Plus, Table2 } from "lucide-react";
import { useStore } from "../store/store";
import { Avatar, DateInput, StateTag, TaskMarker, fmtDue, isOverdue, toDateInputValue } from "../components/ui";
import { TaskEditPanel } from "../components/TaskEditPanel";
import { SubtaskEditPanel } from "../components/SubtaskEditPanel";
import type { Subtask, Task, TaskGroup } from "../lib/types";

type TaskSortCol = "text" | "group" | "project" | "milestone" | "due" | "done";
type SortDir = "asc" | "desc";
const GROUP_ORDER: Record<string, number> = { overdue: 0, today: 1, upcoming: 2, someday: 3, done: 4 };

export function Tasks() {
  const { data, workspace, toggleTask, toggleSubtask, addTask } = useStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [group, setGroup] = useState<TaskGroup>("today");
  const [project, setProject] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [who, setWho] = useState("");
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [nextOnly, setNextOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<{ projectId: string; milestoneId: string; subtaskId: string } | null>(null);
  const [view, setView] = useState<"list" | "table">(() =>
    (localStorage.getItem("mih_tasks_view") as "list" | "table") ?? "list"
  );
  const [sortCol, setSortCol] = useState<TaskSortCol>("group");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [tFilterDone, setTFilterDone] = useState<"all" | "open" | "done">("all");
  const [tFilterGroup, setTFilterGroup] = useState("all");
  const [tFilterProject, setTFilterProject] = useState("all");
  const [tFilterMilestone, setTFilterMilestone] = useState("all");

  const changeView = (v: "list" | "table") => { setView(v); localStorage.setItem("mih_tasks_view", v); };
  const toggleSort = (col: TaskSortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  useEffect(() => { setProject(""); setMilestoneId(""); setWho(""); setEditingId(null); }, [workspace]); // eslint-disable-line react-hooks/exhaustive-deps

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
      next: false,
      context: "",
      project: project || null,
      ...(milestoneId ? { milestoneId } : {}),
      ...(who.trim() ? { who: who.trim() } : {}),
      ...(due ? { due } : {}),
    };
    addTask(task, group);
    setText("");
    setDue("");
    setMilestoneId("");
    setWho("");
  };

  const matches = (t: Task) =>
    (!filterProject || (filterProject === "__none__" ? !t.project : t.project === filterProject)) &&
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

  const milestoneMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of data.projects) for (const ms of p.milestones) m.set(ms.id, ms.title);
    return m;
  }, [data.projects]);

  const allMilestoneNames = useMemo(() => Array.from(new Set(data.projects.flatMap((p) => p.milestones.map((m) => m.title)))).sort(), [data.projects]);

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

  type FlatRow =
    | { kind: "task"; task: Task; group: string; milestoneName: string | null }
    | { kind: "subtask"; projectId: string; milestoneId: string; milestoneTitle: string; projectTitle: string; subtask: Subtask; group: string };

  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];

    // Regular tasks (all, including done)
    const addTasks = (list: Task[], grp: string) =>
      list.forEach((t) => rows.push({ kind: "task", task: t, group: grp, milestoneName: t.milestoneId ? (milestoneMap.get(t.milestoneId) ?? null) : null }));
    addTasks(overdueList, "overdue");
    addTasks(todayList, "today");
    addTasks(upcomingList, "upcoming");
    addTasks(data.someday, "someday");

    // All project subtasks including done
    for (const p of data.projects) {
      for (const m of p.milestones) {
        for (const s of m.subtasks) {
          const iso = s.due ? toDateInputValue(s.due) : "";
          let grp = "someday";
          if (s.done) grp = "done";
          else if (iso) {
            if (iso < todayISO) grp = "overdue";
            else if (iso === todayISO) grp = "today";
            else grp = "upcoming";
          }
          rows.push({ kind: "subtask", projectId: p.id, milestoneId: m.id, milestoneTitle: m.title, projectTitle: p.title, subtask: s, group: grp });
        }
      }
    }

    const filtered = rows.filter((r) => {
      const isDone = r.kind === "task" ? r.task.done : r.subtask.done;
      const proj = r.kind === "task" ? (r.task.project ?? "") : r.projectTitle;
      const mile = r.kind === "task" ? (r.milestoneName ?? "") : r.milestoneTitle;
      if (tFilterDone !== "all" && (tFilterDone === "done") !== isDone) return false;
      if (tFilterGroup !== "all" && r.group !== tFilterGroup) return false;
      if (tFilterProject !== "all" && (tFilterProject === "__none__" ? proj !== "" : proj !== tFilterProject)) return false;
      if (tFilterMilestone !== "all" && mile !== tFilterMilestone) return false;
      if (nextOnly && r.kind === "task" && (!r.task.next || r.task.done)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const aText = a.kind === "task" ? a.task.text : a.subtask.t;
      const bText = b.kind === "task" ? b.task.text : b.subtask.t;
      const aDue = a.kind === "task" ? (a.task.due ?? "") : (a.subtask.due ?? "");
      const bDue = b.kind === "task" ? (b.task.due ?? "") : (b.subtask.due ?? "");
      const aProj = a.kind === "task" ? (a.task.project ?? "") : a.projectTitle;
      const bProj = b.kind === "task" ? (b.task.project ?? "") : b.projectTitle;
      const aMile = a.kind === "task" ? (a.milestoneName ?? "") : a.milestoneTitle;
      const bMile = b.kind === "task" ? (b.milestoneName ?? "") : b.milestoneTitle;
      const aDone = a.kind === "task" ? (a.task.done ? 1 : 0) : (a.subtask.done ? 1 : 0);
      const bDone = b.kind === "task" ? (b.task.done ? 1 : 0) : (b.subtask.done ? 1 : 0);
      let cmp = 0;
      if (sortCol === "text") cmp = aText.localeCompare(bText);
      else if (sortCol === "group") cmp = (GROUP_ORDER[a.group] ?? 9) - (GROUP_ORDER[b.group] ?? 9);
      else if (sortCol === "project") cmp = aProj.localeCompare(bProj);
      else if (sortCol === "milestone") cmp = aMile.localeCompare(bMile);
      else if (sortCol === "due") cmp = (toDateInputValue(aDue) ?? "").localeCompare(toDateInputValue(bDue) ?? "");
      else if (sortCol === "done") cmp = aDone - bDone;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [overdueList, todayList, upcomingList, data.someday, data.projects, milestoneMap, todayISO, tFilterDone, tFilterGroup, tFilterProject, tFilterMilestone, nextOnly, sortCol, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  const { moveTask } = useStore();

  const SortTh = ({ col, children }: { col: TaskSortCol; children: React.ReactNode }) => (
    <th
      className={`sortable${sortCol === col ? ` sort-${sortDir}` : ""}`}
      onClick={() => toggleSort(col)}
    >
      {children}
      <span className="sort-icon">
        {sortCol === col
          ? sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />
          : <ChevronDown size={11} />}
      </span>
    </th>
  );

  const GROUP_LABELS: Record<string, string> = { overdue: "Overdue", today: "Today", upcoming: "Upcoming", someday: "Someday", done: "Done" };
  const GROUP_COLORS: Record<string, string> = { overdue: "#DC2626", today: "var(--accent)", upcoming: "var(--ink-3)", someday: "var(--ink-4)", done: "var(--next)" };

  return (
    <div className="page fade">
      <div className="page-head" style={{ display: "flex", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div className="page-title">Tasks</div>
          <div className="page-sub">
            {[...data.todayTasks, ...data.upcoming].filter((t) => !t.done).length} open · press <kbd className="mono" style={{ fontSize: 12, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, padding: "0 5px" }}>T</kbd> to capture
          </div>
        </div>
        <div className="view-toggle">
          <button className={view === "list" ? "active" : ""} title="List view" onClick={() => changeView("list")}><LayoutList size={15} /></button>
          <button className={view === "table" ? "active" : ""} title="Table view" onClick={() => changeView("table")}><Table2 size={15} /></button>
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
        <select
          className="input"
          style={{ fontSize: 12.5, padding: "4px 8px", height: 28 }}
          value={filterProject ?? "all"}
          onChange={(e) => setFilterProject(e.target.value === "all" ? null : e.target.value)}
        >
          <option value="all">All projects</option>
          <option value="__none__">No project</option>
          {data.projects.map((p) => <option key={p.id} value={p.title}>{p.title}</option>)}
        </select>
      </div>

      {view === "table" ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <SortTh col="done">Done</SortTh>
                <SortTh col="text">Task</SortTh>
                <SortTh col="group">Group</SortTh>
                <SortTh col="project">Project</SortTh>
                <SortTh col="milestone">Milestone</SortTh>
                <SortTh col="due">Due</SortTh>
              </tr>
              <tr className="filter-row">
                <td>
                  <select className="table-filter" value={tFilterDone} onChange={(e) => setTFilterDone(e.target.value as "all" | "open" | "done")}>
                    <option value="all">All</option>
                    <option value="open">Open</option>
                    <option value="done">Done</option>
                  </select>
                </td>
                <td />
                <td>
                  <select className="table-filter" value={tFilterGroup} onChange={(e) => setTFilterGroup(e.target.value)}>
                    <option value="all">All groups</option>
                    <option value="overdue">Overdue</option>
                    <option value="today">Today</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="someday">Someday</option>
                    <option value="done">Done</option>
                  </select>
                </td>
                <td>
                  <select className="table-filter" value={tFilterProject} onChange={(e) => setTFilterProject(e.target.value)}>
                    <option value="all">All projects</option>
                    <option value="__none__">No project</option>
                    {data.projects.map((p) => <option key={p.id} value={p.title}>{p.title}</option>)}
                  </select>
                </td>
                <td>
                  <select className="table-filter" value={tFilterMilestone} onChange={(e) => setTFilterMilestone(e.target.value)}>
                    <option value="all">All milestones</option>
                    {allMilestoneNames.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                <td />
              </tr>
            </thead>
            <tbody>
              {flatRows.map((row, i) => {
                if (row.kind === "task") {
                  const t = row.task;
                  return (
                    <tr key={t.id}>
                      <td style={{ width: 36, textAlign: "center" }}>
                        <TaskMarker task={t} onClick={() => toggleTask(t.id)} />
                      </td>
                      <td className="td-primary">
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            style={{ textAlign: "left", cursor: "pointer", fontSize: 13, color: "var(--ink)" }}
                            className={t.done ? "strike" : ""}
                            onClick={() => setEditingId(t.id)}
                          >
                            {t.text}
                          </button>
                          <StateTag task={t} />
                          {t.who && <Avatar who={t.who} size={20} color="var(--ink-3)" />}
                        </div>
                      </td>
                      <td>
                        <select
                          className="input"
                          style={{ fontSize: 11.5, padding: "3px 7px", width: "auto", color: GROUP_COLORS[row.group] }}
                          value={row.group === "overdue" ? "today" : row.group}
                          onChange={(e) => moveTask(t.id, e.target.value as TaskGroup)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="today">Today</option>
                          <option value="upcoming">Upcoming</option>
                          <option value="someday">Someday</option>
                        </select>
                        {row.group === "overdue" && (
                          <span style={{ fontSize: 10.5, color: "#DC2626", fontWeight: 600, marginLeft: 5 }}>Overdue</span>
                        )}
                      </td>
                      <td>
                        {t.project ? (
                          <button className="chip" style={{ cursor: "pointer", fontSize: 11 }} onClick={() => goToProject(t.project)}>
                            {t.project}
                          </button>
                        ) : "—"}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--ink-3)" }}>{row.milestoneName ?? "—"}</td>
                      <td style={{ whiteSpace: "nowrap", fontSize: 12, color: t.due && isOverdue(t.due, t.done) ? "var(--danger)" : "var(--ink-3)" }}>{t.due ? fmtDue(t.due) : "—"}</td>
                    </tr>
                  );
                } else {
                  const { projectId, milestoneId, milestoneTitle, projectTitle, subtask, group } = row;
                  return (
                    <tr key={`${subtask.id}-${i}`} style={{ opacity: subtask.done ? 0.5 : 1 }}>
                      <td style={{ width: 36, textAlign: "center" }}>
                        <TaskMarker task={subtask} onClick={() => toggleSubtask(projectId, milestoneId, subtask.id)} />
                      </td>
                      <td className="td-primary">
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            style={{ textAlign: "left", cursor: "pointer", fontSize: 13, color: "var(--ink)" }}
                            className={subtask.done ? "strike" : ""}
                            onClick={() => setEditingSubtask({ projectId, milestoneId, subtaskId: subtask.id })}
                          >
                            {subtask.t}
                          </button>
                          <StateTag task={subtask} />
                          {subtask.who && <Avatar who={subtask.who} size={20} color="var(--ink-3)" />}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 11.5, color: GROUP_COLORS[group], fontWeight: 600 }}>
                          {GROUP_LABELS[group]}
                        </span>
                      </td>
                      <td>
                        <button className="chip" style={{ cursor: "pointer", fontSize: 11 }} onClick={() => goToProject(projectTitle)}>
                          {projectTitle}
                        </button>
                      </td>
                      <td style={{ fontSize: 11, color: "var(--ink-3)" }}>{milestoneTitle}</td>
                      <td style={{ whiteSpace: "nowrap", fontSize: 12, color: subtask.due && isOverdue(subtask.due, subtask.done) ? "var(--danger)" : "var(--ink-3)" }}>{subtask.due ? fmtDue(subtask.due) : "—"}</td>
                    </tr>
                  );
                }
              })}
              {flatRows.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--ink-4)" }}>No tasks match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
      <>
      {sections.map(({ key, label, list, pSubs }) => {
        const visible = list.filter(matches);
        const filteredPSubs = filterProject
          ? filterProject === "__none__" ? [] : pSubs.filter((s) => s.projectTitle === filterProject)
          : pSubs;
        const totalOpen = visible.filter((t) => !t.done).length + filteredPSubs.filter((s) => !s.subtask.done).length;
        return (
          <div key={key} style={{ marginBottom: 22 }}>
            <div className="section-h">
              {label} <span style={{ fontWeight: 500 }}>{totalOpen}</span>
            </div>
            <div className="card" style={{ padding: "6px 10px 8px" }}>
              {visible.length === 0 && filteredPSubs.length === 0 && (
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
                  {t.who && <Avatar who={t.who} size={20} color="var(--ink-3)" />}
                  {t.project && (
                    <button className="chip" style={{ cursor: "pointer" }} onClick={() => goToProject(t.project)}>
                      {t.project}
                    </button>
                  )}
                  {t.due && <span style={{ fontSize: 11.5, color: isOverdue(t.due, t.done) ? "var(--danger)" : "var(--ink-4)", whiteSpace: "nowrap" }}>{fmtDue(t.due)}</span>}
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
              {filteredPSubs.map(({ projectId, milestoneId, projectTitle, subtask }) => (
                <div key={subtask.id} className="task-row">
                  <TaskMarker task={subtask} onClick={() => toggleSubtask(projectId, milestoneId, subtask.id)} />
                  <button
                    style={{ flex: 1, fontSize: 13, textAlign: "left", cursor: "pointer" }}
                    className={subtask.done ? "strike" : ""}
                    title="Edit task"
                    onClick={() => setEditingSubtask({ projectId, milestoneId, subtaskId: subtask.id })}
                  >
                    {subtask.t}
                  </button>
                  <StateTag task={subtask} />
                  {subtask.who && <Avatar who={subtask.who} size={20} color="var(--ink-3)" />}
                  <button className="chip" style={{ cursor: "pointer" }} onClick={() => goToProject(projectTitle)}>
                    {projectTitle}
                  </button>
                  {subtask.due && <span style={{ fontSize: 11.5, color: isOverdue(subtask.due, subtask.done) ? "var(--danger)" : "var(--ink-4)", whiteSpace: "nowrap" }}>{fmtDue(subtask.due)}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      </>
      )}

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
