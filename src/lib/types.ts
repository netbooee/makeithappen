export type Workspace = "work" | "personal";
export type Status = "active" | "hold" | "complete";
export type TaskFlow = "delegated" | "waiting";

export interface User {
  name: string;
  email: string;
  initials: string;
}

export interface Subtask {
  id: string;
  t: string;
  done: boolean;
  next?: boolean;
  state?: TaskFlow;
  to?: string;
  waitFor?: string;
  who: string;
  due?: string;
}

export interface Milestone {
  id: string;
  title: string;
  due: string;
  status: Status;
  subtasks: Subtask[];
}

export interface StatusUpdate {
  id: string;
  when: string;
  who: string;
  text: string;
}

export interface Project {
  id: string;
  title: string;
  status: Status;
  owner: string;
  due: string;
  start?: string;
  desc: string;
  progress: number;
  active: boolean;
  budget?: string;
  onBudget?: boolean;
  risk?: "green" | "amber" | "red";
  riskNote?: string;
  milestones: Milestone[];
  updates: StatusUpdate[];
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  next?: boolean;
  state?: TaskFlow;
  to?: string;
  waitFor?: string;
  context: string;
  project: string | null;
  milestoneId?: string;
  due?: string;
  reminder?: string;
}

export type TaskGroup = "today" | "upcoming" | "someday";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  streak: number;
  doneToday: boolean;
  cadence: string;
}

export type Relationship = "Colleague" | "Client" | "Vendor" | "Friend" | "Family" | "Other";

export interface ContactTouch {
  id: string;
  date: string; // YYYY-MM-DD
  note: string;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  rel: Relationship;
  email: string;
  phone: string;
  color: string;
  lastNote: string;
  lastDate: string;
  followUp: boolean;
  remember: string;
  e6w?: boolean;
  touchpoints?: ContactTouch[];
}

export interface NextAction {
  id: string;
  text: string;
  project: string | null;
  due: string;
  overdue: boolean;
}

export interface Spotlight {
  text: string;
  project: string;
  milestone: string;
  due: string;
  context: string;
}

export interface WorkspaceData {
  nextActions: NextAction[];
  spotlight: Spotlight;
  todayTasks: Task[];
  upcoming: Task[];
  someday: Task[];
  habits: Habit[];
  projects: Project[];
  contacts: Contact[];
}

export interface Tweaks {
  collapsible: boolean;
  defaultState: "all" | "active" | "none";
  showCount: boolean;
}

export interface AppData {
  user: User;
  work: WorkspaceData;
  personal: WorkspaceData;
}
