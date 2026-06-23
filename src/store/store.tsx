import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SEED } from "../data/seed";
import { supabase, supabaseConfigured, saveTweaks, loadUserData, saveUserData } from "../lib/supabase";
import type {
  AppData, Contact, ContactTouch, Habit, Milestone, Project, StatusUpdate, Subtask, Task, TaskGroup, Tweaks, Workspace, WorkspaceData,
} from "../lib/types";

const DATA_KEY = "mih_data_v1";
const WS_KEY = "mih_ws";
const TWEAKS_KEY = "mih_tweaks_v1";

const TWEAK_DEFAULTS: Tweaks = { collapsible: true, defaultState: "active", showCount: true, darkMode: false };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export interface Store {
  workspace: Workspace;
  setWorkspace: (ws: Workspace) => void;
  data: WorkspaceData;
  all: AppData;
  tweaks: Tweaks;
  setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
  toggleTask: (id: string) => void;
  addTask: (task: Task, group: TaskGroup) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  moveTask: (id: string, toGroup: TaskGroup) => void;
  deleteTask: (id: string) => void;
  toggleSubtask: (projectId: string, milestoneId: string, subtaskId: string) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addMilestone: (projectId: string, milestone: Milestone) => void;
  updateMilestone: (projectId: string, milestoneId: string, patch: Partial<Milestone>) => void;
  deleteMilestone: (projectId: string, milestoneId: string) => void;
  addSubtask: (projectId: string, milestoneId: string, title: string) => void;
  updateSubtask: (projectId: string, milestoneId: string, subtaskId: string, patch: Partial<Subtask>) => void;
  deleteSubtask: (projectId: string, milestoneId: string, subtaskId: string) => void;
  updateStatusUpdate: (projectId: string, updateId: string, text: string, type?: import("../lib/types").UpdateType) => void;
  deleteStatusUpdate: (projectId: string, updateId: string) => void;
  deleteContact: (id: string) => void;
  addTouchpoint: (contactId: string, touch: ContactTouch) => void;
  deleteTouchpoint: (contactId: string, touchId: string) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  addUpdate: (projectId: string, text: string, type?: import("../lib/types").UpdateType) => void;
  toggleHabit: (id: string) => void;
  toggleCheckin: (id: string, date: string) => void;
  addHabit: (habit: Habit) => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  addContact: (contact: Contact) => void;
  addContacts: (contacts: Contact[]) => void;
  resetDemoData: () => void;
  importData: (data: AppData) => void;
}

function computeStreak(checkins: string[]): number {
  if (!checkins.length) return 0;
  const set = new Set(checkins);
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = d.toISOString().slice(0, 10);
    if (set.has(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [all, setAll] = useState<AppData>(() => load(DATA_KEY, SEED));
  const [workspace, setWorkspace] = useState<Workspace>(
    () => (localStorage.getItem(WS_KEY) as Workspace) || "work",
  );
  const [tweaks, setTweaks] = useState<Tweaks>(() => load(TWEAKS_KEY, TWEAK_DEFAULTS));
  const [dataLoading, setDataLoading] = useState(supabaseConfigured);
  const initialAll = useRef(all);
  const initialLoadDone = useRef(!supabaseConfigured);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load from Supabase once on mount; on first login, seed user profile from Google.
  useEffect(() => {
    if (!supabaseConfigured || !supabase) return;
    const sb = supabase;
    loadUserData<AppData>().then((loaded) => {
      if (loaded) {
        setAll(loaded);
      } else {
        // First login: populate user profile from Google session and upload local data.
        return sb.auth.getUser().then(({ data: { user } }) => {
          const base = initialAll.current;
          const name = (user?.user_metadata?.full_name as string | undefined)
            ?? user?.email?.split("@")[0]
            ?? "User";
          const email = user?.email ?? "";
          const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          const seeded: AppData = { ...base, user: { name, email, initials } };
          setAll(seeded);
          saveUserData(seeded);
        });
      }
    }).finally(() => {
      initialLoadDone.current = true;
      setDataLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.setAttribute("data-workspace", workspace);
    localStorage.setItem(WS_KEY, workspace);
  }, [workspace]);

  useEffect(() => {
    document.body.classList.toggle("dark", tweaks.darkMode);
  }, [tweaks.darkMode]);

  useEffect(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(all));
    if (!supabaseConfigured || !initialLoadDone.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveUserData(all), 1500);
  }, [all]);

  useEffect(() => {
    localStorage.setItem(TWEAKS_KEY, JSON.stringify(tweaks));
    saveTweaks(tweaks); // no-op unless Supabase is configured
  }, [tweaks]);

  const store = useMemo<Store>(() => {
    const mutate = (fn: (d: WorkspaceData) => void) =>
      setAll((s) => {
        const copy: AppData = JSON.parse(JSON.stringify(s));
        fn(copy[workspace]);
        return copy;
      });

    const recomputeProgress = (p: Project) => {
      const subs = p.milestones.flatMap((m) => m.subtasks);
      p.progress = subs.length ? subs.filter((x) => x.done).length / subs.length : 0;
    };

    return {
      workspace,
      setWorkspace,
      data: all[workspace],
      all,
      tweaks,
      setTweak: (key, value) => setTweaks((t) => ({ ...t, [key]: value })),

      toggleTask: (id) =>
        mutate((d) => {
          for (const list of [d.todayTasks, d.upcoming, d.someday]) {
            const t = list.find((x) => x.id === id);
            if (t) t.done = !t.done;
          }
        }),

      addTask: (task, group) =>
        mutate((d) => {
          const list = group === "today" ? d.todayTasks : group === "upcoming" ? d.upcoming : d.someday;
          list.unshift(task);
        }),

      updateTask: (id, patch) =>
        mutate((d) => {
          for (const list of [d.todayTasks, d.upcoming, d.someday]) {
            const t = list.find((x) => x.id === id);
            if (t) Object.assign(t, patch);
          }
        }),

      moveTask: (id, toGroup) =>
        mutate((d) => {
          const lists: [TaskGroup, Task[]][] = [
            ["today", d.todayTasks], ["upcoming", d.upcoming], ["someday", d.someday],
          ];
          for (const [group, list] of lists) {
            const i = list.findIndex((x) => x.id === id);
            if (i >= 0 && group !== toGroup) {
              const [t] = list.splice(i, 1);
              const target = toGroup === "today" ? d.todayTasks : toGroup === "upcoming" ? d.upcoming : d.someday;
              target.unshift(t);
              return;
            }
          }
        }),

      deleteTask: (id) =>
        mutate((d) => {
          d.todayTasks = d.todayTasks.filter((x) => x.id !== id);
          d.upcoming = d.upcoming.filter((x) => x.id !== id);
          d.someday = d.someday.filter((x) => x.id !== id);
        }),

      toggleSubtask: (projectId, milestoneId, subtaskId) =>
        mutate((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          const m = p?.milestones.find((x) => x.id === milestoneId);
          const s = m?.subtasks.find((x) => x.id === subtaskId);
          if (!p || !s) return;
          s.done = !s.done;
          if (s.done) {
            s.taskStatus = "completed";
          } else if (s.taskStatus === "completed") {
            s.taskStatus = undefined;
          }
          recomputeProgress(p);
        }),

      addProject: (project) => mutate((d) => d.projects.unshift(project)),

      updateProject: (id, patch) =>
        mutate((d) => {
          const p = d.projects.find((x) => x.id === id);
          if (p) Object.assign(p, patch);
        }),

      deleteProject: (id) =>
        mutate((d) => {
          d.projects = d.projects.filter((x) => x.id !== id);
        }),

      addMilestone: (projectId, milestone) =>
        mutate((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          if (!p) return;
          p.milestones.push(milestone);
          recomputeProgress(p);
        }),

      updateMilestone: (projectId, milestoneId, patch) =>
        mutate((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          const m = p?.milestones.find((x) => x.id === milestoneId);
          if (m) Object.assign(m, patch);
        }),

      deleteMilestone: (projectId, milestoneId) =>
        mutate((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          if (!p) return;
          p.milestones = p.milestones.filter((x) => x.id !== milestoneId);
          recomputeProgress(p);
        }),

      updateSubtask: (projectId, milestoneId, subtaskId, patch) =>
        mutate((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          const m = p?.milestones.find((x) => x.id === milestoneId);
          const s = m?.subtasks.find((x) => x.id === subtaskId);
          if (!p || !s) return;
          Object.assign(s, patch);
          recomputeProgress(p);
        }),

      deleteSubtask: (projectId, milestoneId, subtaskId) =>
        mutate((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          const m = p?.milestones.find((x) => x.id === milestoneId);
          if (!p || !m) return;
          m.subtasks = m.subtasks.filter((x) => x.id !== subtaskId);
          recomputeProgress(p);
        }),

      updateStatusUpdate: (projectId, updateId, text, type) =>
        mutate((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          const u = p?.updates.find((x) => x.id === updateId);
          if (u) { u.text = text; if (type !== undefined) u.type = type; }
        }),

      deleteStatusUpdate: (projectId, updateId) =>
        mutate((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          if (!p) return;
          p.updates = p.updates.filter((x) => x.id !== updateId);
        }),

      addSubtask: (projectId, milestoneId, title) =>
        mutate((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          const m = p?.milestones.find((x) => x.id === milestoneId);
          if (!p || !m) return;
          m.subtasks.push({ id: "s" + Date.now(), t: title, done: false, next: false, who: all.user.initials });
          recomputeProgress(p);
        }),

      addUpdate: (projectId, text, type = "update") =>
        mutate((d) => {
          const p = d.projects.find((x) => x.id === projectId);
          if (!p) return;
          const when = new Date().toLocaleString("en-US", {
            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
          });
          const update: StatusUpdate = { id: "u" + Date.now(), when, who: all.user.initials, text, type };
          p.updates.unshift(update);
        }),

      toggleHabit: (id) =>
        mutate((d) => {
          const h = d.habits.find((x) => x.id === id);
          if (!h) return;
          const today = new Date().toISOString().slice(0, 10);
          if (!h.checkins) h.checkins = [];
          if (h.checkins.includes(today)) {
            h.checkins = h.checkins.filter((c) => c !== today);
          } else {
            h.checkins.push(today);
          }
          h.doneToday = h.checkins.includes(today);
          h.streak = computeStreak(h.checkins);
        }),

      toggleCheckin: (id, date) =>
        mutate((d) => {
          const h = d.habits.find((x) => x.id === id);
          if (!h) return;
          if (!h.checkins) h.checkins = [];
          if (h.checkins.includes(date)) {
            h.checkins = h.checkins.filter((c) => c !== date);
          } else {
            h.checkins.push(date);
          }
          const today = new Date().toISOString().slice(0, 10);
          h.doneToday = h.checkins.includes(today);
          h.streak = computeStreak(h.checkins);
        }),

      addHabit: (habit) => mutate((d) => d.habits.push(habit)),

      updateContact: (id, patch) =>
        mutate((d) => {
          const c = d.contacts.find((x) => x.id === id);
          if (c) Object.assign(c, patch);
        }),

      addContact: (contact) => mutate((d) => d.contacts.unshift(contact)),
      addContacts: (contacts) => mutate((d) => { contacts.forEach((c) => d.contacts.unshift(c)); }),

      deleteContact: (id) =>
        mutate((d) => {
          d.contacts = d.contacts.filter((x) => x.id !== id);
        }),

      addTouchpoint: (contactId, touch) =>
        mutate((d) => {
          const c = d.contacts.find((x) => x.id === contactId);
          if (!c) return;
          if (!c.touchpoints) c.touchpoints = [];
          c.touchpoints.unshift(touch);
        }),

      deleteTouchpoint: (contactId, touchId) =>
        mutate((d) => {
          const c = d.contacts.find((x) => x.id === contactId);
          if (!c) return;
          c.touchpoints = (c.touchpoints ?? []).filter((t) => t.id !== touchId);
        }),

      updateHabit: (id, patch) =>
        mutate((d) => {
          const h = d.habits.find((x) => x.id === id);
          if (h) Object.assign(h, patch);
        }),

      deleteHabit: (id) =>
        mutate((d) => {
          d.habits = d.habits.filter((x) => x.id !== id);
        }),

      resetDemoData: () => {
        localStorage.removeItem(DATA_KEY);
        setAll(JSON.parse(JSON.stringify(SEED)));
      },

      importData: (data: AppData) => {
        setAll(data);
        saveUserData(data);
      },
    };
  }, [all, workspace, tweaks]);

  if (dataLoading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: "var(--ink-3, #888)" }}>Loading…</div>
      </div>
    );
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
