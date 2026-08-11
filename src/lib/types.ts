export function lastNameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? "";
}

export type Workspace = "work" | "personal";
export type Status = "active" | "waiting" | "hold" | "complete";
export type TaskFlow = "delegated" | "waiting";
export type SubtaskStatus = "not-started" | "scheduled" | "in-progress" | "completed";

/** Which per-project roster an officially entered contact lives on. */
export type ContactKind = "internal" | "external" | "stakeholder";

/** Reference to a contact entered on a project (member, external team member, or stakeholder). */
export interface ProjectContactRef {
  kind: ContactKind;
  id: string;
}

export interface User {
  name: string;
  email: string;
  initials: string;
  feedbackEmail?: string;
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
  assignee?: ProjectContactRef;
  due?: string;
  reminder?: string;
  notes?: string;
  taskStatus?: SubtaskStatus;
}

export interface Milestone {
  id: string;
  title: string;
  desc?: string;
  start?: string;
  due: string;
  status: Status;
  subtasks: Subtask[];
}

export type UpdateType = "update" | "heads-up" | "blocked" | "win" | "executive";

export interface StatusUpdate {
  id: string;
  when: string;
  who: string;
  text: string;
  type?: UpdateType;
}

export interface ProjectMember {
  contactId: string;
  role: string;
}

export interface ExternalTeamMember {
  id: string;
  name: string;
  role: string;
  company: string;
}

export type AgendaAttendee = ProjectContactRef;

export interface AgendaItem {
  id: string;
  text: string;
  detail?: string;
}

export interface MeetingAgenda {
  id: string;
  title: string;
  date: string;
  attendees: AgendaAttendee[];
  items: AgendaItem[];
  resources?: ProjectResource[];
  notes?: string;
}

export interface ProjectResource {
  id: string;
  label: string;
  url: string;
}

export type RiskProbability = "low" | "medium" | "high";
export type RiskImpact = "low" | "medium" | "high";
export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type RiskStatus = "open" | "mitigated" | "closed";

export interface ProjectRisk {
  id: string;
  description: string;
  category: string;
  probability: RiskProbability;
  impact: RiskImpact;
  status: RiskStatus;
  owner?: string;
  mitigation?: string;
}

export type IssueSeverity = "low" | "medium" | "high" | "critical";
export type IssueStatus = "open" | "in-progress" | "resolved";

export interface ProjectIssue {
  id: string;
  title: string;
  description?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  owner?: string;
  reportedDate: string;
  resolution?: string;
}

export type DecisionStatus = "proposed" | "decided" | "reversed";

export interface ProjectDecision {
  id: string;
  title: string;
  description?: string;
  status: DecisionStatus;
  owner?: string;
  decidedDate: string;
}

export type StakeholderSatisfaction = "dissatisfied" | "neutral" | "satisfied" | "delighted";

export interface ProjectStakeholder {
  id: string;
  name: string;
  role?: string;
  satisfaction: StakeholderSatisfaction;
  notes?: string;
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
  budgetSpent?: string;
  onBudget?: boolean;
  risk?: "green" | "amber" | "red";
  riskNote?: string;
  timelineRisk?: "green" | "amber" | "red";
  budgetRisk?: "green" | "amber" | "red";
  resourceRisk?: "green" | "amber" | "red";
  timelineNote?: string;
  budgetNote?: string;
  webUrl?: string;
  meetingAgendaLocationUrl?: string;
  sharepointUrl?: string;
  sharepointProjectId?: string;
  webServerFolderUrl?: string;
  heroImage?: string;
  clientLogo?: string;
  members?: ProjectMember[];
  externalTeam?: ExternalTeamMember[];
  agendas?: MeetingAgenda[];
  resources?: ProjectResource[];
  risks?: ProjectRisk[];
  issues?: ProjectIssue[];
  decisions?: ProjectDecision[];
  stakeholders?: ProjectStakeholder[];
  milestones: Milestone[];
  updates: StatusUpdate[];
  nextActionsAiSummary?: string;
  /** Forward-looking "coming next" paragraph shown on the Executive update page */
  execStatement?: string;
  /** One-sentence recap of the latest executive update, shown under the paragraph */
  execSince?: string;
  /** Store timestamp of when execStatement was last generated or edited */
  execStatementAt?: string;
  /** ISO timestamp stamped by the store on every mutation that touches this project */
  updatedAt?: string;
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
  who?: string;
  assignee?: ProjectContactRef;
  due?: string;
  reminder?: string;
  notes?: string;
}

export type TaskGroup = "today" | "upcoming" | "someday";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  streak: number;
  doneToday: boolean;
  cadence: string;
  checkins?: string[]; // YYYY-MM-DD dates
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
  linkedin?: string; // LinkedIn profile URL
}

export const CONTACT_COLORS = ["#4F6BED", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#0EA5E9"];

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
  execUpdateOrder?: string[];
}

export interface Tweaks {
  collapsible: boolean;
  defaultState: "all" | "active" | "none";
  showCount: boolean;
  darkMode: boolean;
}

export interface AppData {
  user: User;
  work: WorkspaceData;
  personal: WorkspaceData;
}
