/**
 * Pure data computation for the Modernist-styled portfolio view of Executive Update
 * (src/pages/ExecutiveUpdate.tsx). Kept separate from that page so the heavy per-project
 * derivation (phase stepper, RAG roll-ups, composed narrative) can be read and adjusted
 * on its own. Nothing here is fabricated — every string is built from real project data;
 * the "composed prose" bands (lede, summary, decision ask, next-narrative) are deterministic
 * templates over that data, not AI- or hand-written copy.
 */
import type { Contact, Milestone, Project, Task } from "./types";
import { fmtDue, isOverdue, toDateInputValue } from "../components/ui";
import { assigneeAvatar, projectContactPool } from "./projectContacts";
import { nextActionSubtasks } from "../pages/projects/NextActionsSection";
import type { ExecEntry } from "../pages/ExecutiveUpdate";

export type Rag = "green" | "amber" | "red";

/** Modernist design system's RAG additions — swatch/text colors + qualifier label, keyed by severity. */
export const RAG: Record<Rag, { swatch: string; text: string; label: string }> = {
  green: { swatch: "#157f4a", text: "#106039", label: "On track" },
  amber: { swatch: "#e0900a", text: "#8a5200", label: "Attention" },
  red: { swatch: "#ec3013", text: "#ae1800", label: "At risk" },
};
export const RAG_NAME: Record<Rag, string> = { green: "Green", amber: "Amber", red: "Red" };
const RAG_SEVERITY: Record<Rag, number> = { green: 0, amber: 1, red: 2 };
const RAG_ORDER: Rag[] = ["green", "amber", "red"];

function worstRag(a: Rag, b: Rag): Rag {
  return RAG_SEVERITY[b] > RAG_SEVERITY[a] ? b : a;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Parses a leading "$1,200,000" / "$1.2M" / "$45k" out of a budget field. Unlike a strip-then-
 *  Number() approach, this stops at the first non-numeric character instead of concatenating
 *  every digit group in the string — so a field like "$120,000 - $150,000" reads as $120,000,
 *  not $120,000,150,000. */
function parseMoney(v?: string): number {
  if (!v) return 0;
  const c = v.replace(/[$,\s]/g, "");
  const k = c.match(/^([\d.]+)[kK]/);
  const m = c.match(/^([\d.]+)[mM]/);
  if (k) return parseFloat(k[1]) * 1_000;
  if (m) return parseFloat(m[1]) * 1_000_000;
  const n = parseFloat(c);
  return Number.isFinite(n) ? n : 0;
}

/** "$1,200,000" -> "$1.2M", "$45000" -> "$45k" — duplicated from ExecutiveUpdate.tsx to avoid a circular import. */
function formatMoneyShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

export interface PhaseCell {
  color: string;
  height: string;
}

export interface PortfolioRow {
  project: Project;
  rag: Rag;
  timeline: Rag;
  budget: Rag;
  resourcing: Rag;
  phase: number;
  phases: number;
  stage: string;
  done: number;
  total: number;
  pct: number;
  target: string;
  gate: string;
  gateSlipped: boolean;
  gateIso: string;
  approved: number;
  spent: number;
  updateDate: string;
  update: string;
  next: string;
  actionTitle: string | null;
  actionMeta: string | null;
  phaseCells: PhaseCell[];
}

export interface PortfolioSummary {
  rows: PortfolioRow[];
  totalProjects: number;
  needsAttention: number;
  portfolioRag: Rag;
  pct: number;
  doneTasks: number;
  totalTasks: number;
  phasesOpen: number;
  onDateCount: number;
  categoryCounts: Record<"timeline" | "budget" | "resourcing", Record<Rag, number>>;
  approvedTotal: number;
  spentTotal: number;
  drawnPct: number | null;
  gatesClosingSoon: number;
  gatesClosingBy: string;
  nextMilestone: { label: string; date: string; daysOut: number } | null;
  lede: string;
  healthNote: string;
  riskNote: string;
  scheduleNote: string;
  /** The poster-band executive summary — a manually-edited override when set, else composed from the data. */
  summary: string;
  /** True when `summary` came from the user's own edit rather than the auto-composed default. */
  summaryIsStored: boolean;
}

/** Current phase (1-based), stage name, and task tally for a project's milestone list. */
function computePhase(project: Project) {
  const ms = project.milestones;
  const phases = ms.length;
  let idx = ms.findIndex((m) => m.status === "active");
  if (idx === -1) idx = ms.findIndex((m) => m.status !== "complete");
  if (idx === -1) idx = Math.max(phases - 1, 0);
  const current: Milestone | undefined = ms[idx];
  const subs = ms.flatMap((m) => m.subtasks);
  const done = subs.filter((s) => s.done).length;
  const total = subs.length;
  return { phase: phases ? idx + 1 : 0, phases, stage: current?.title ?? "—", done, total, current };
}

function computeGate(current: Milestone | undefined) {
  if (!current || !current.due || current.due === "No date") {
    return { label: "No date", slipped: false, iso: "" };
  }
  const slipped = isOverdue(current.due, current.status === "complete");
  return { label: slipped ? `Slipped · was ${fmtDue(current.due)}` : fmtDue(current.due), slipped, iso: toDateInputValue(current.due) };
}

function phaseCells(phase: number, phases: number, rag: Rag): PhaseCell[] {
  const cells: PhaseCell[] = [];
  for (let i = 1; i <= phases; i++) {
    cells.push({
      color: i < phase ? "#201e1d" : i === phase ? RAG[rag].swatch : "#d7d3d3",
      height: i === phase ? "12px" : "8px",
    });
  }
  return cells;
}

/** Soonest-due, undone next-action across a project's flagged subtasks and standalone tasks. */
function pickTopAction(project: Project, tasks: Task[], contacts: Contact[]) {
  const pool = projectContactPool(project, contacts);
  const fromSubtasks = nextActionSubtasks(project).map((r) => ({
    title: r.subtask.t, due: r.subtask.due, who: r.subtask.who, assignee: r.subtask.assignee, done: r.subtask.done,
  }));
  const fromTasks = tasks
    .filter((t) => t.project === project.title && t.next && !t.done)
    .map((t) => ({ title: t.text, due: t.due, who: t.who, assignee: t.assignee, done: t.done }));
  const all = [...fromSubtasks, ...fromTasks].sort((a, b) => {
    const da = toDateInputValue(a.due), db = toDateInputValue(b.due);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  });
  const top = all[0];
  if (!top) return null;
  const av = assigneeAvatar(pool, top.assignee, top.who);
  const owner = av.ini || top.who || "";
  const status = top.due && top.due !== "No date"
    ? (isOverdue(top.due, top.done) ? "Overdue" : `Due ${fmtDue(top.due)}`)
    : "Scheduled";
  return { title: top.title, meta: owner ? `${status} · Owner ${owner}` : status, dueIso: toDateInputValue(top.due) };
}

/** Builds the full portfolio report from every non-complete project, using each project's
 *  already-computed ExecEntry (executive update, "coming next" statement) where one exists. */
export function buildPortfolioReport(
  projects: Project[],
  tasks: Task[],
  contacts: Contact[],
  entriesById: Map<string, ExecEntry>,
  manualSummary?: string,
): PortfolioSummary {
  const active = projects.filter((p) => p.status !== "complete");
  const storedSummary = manualSummary?.trim();

  const rows: PortfolioRow[] = active.map((project) => {
    const rag = project.risk ?? "green";
    const timeline = project.timelineRisk ?? "green";
    const budget = project.budgetRisk ?? "green";
    const resourcing = project.resourceRisk ?? "green";
    const { phase, phases, stage, done, total, current } = computePhase(project);
    const gate = computeGate(current);
    const approved = parseMoney(project.budget);
    const spent = parseMoney(project.budgetSpent);
    const entry = entriesById.get(project.id);
    const action = pickTopAction(project, tasks, contacts);
    return {
      project,
      rag, timeline, budget, resourcing,
      phase, phases, stage, done, total,
      pct: total ? Math.round((done / total) * 100) : 0,
      target: project.due && project.due !== "No date" ? fmtDue(project.due) : "No date",
      gate: gate.label, gateSlipped: gate.slipped, gateIso: gate.iso,
      approved, spent,
      updateDate: entry?.execUpdate ? entry.execUpdate.when : "",
      update: entry?.execUpdate?.text ?? "No executive update recorded yet.",
      next: entry?.statement ?? "",
      actionTitle: action?.title ?? null,
      actionMeta: action?.meta ?? null,
      phaseCells: phaseCells(phase, phases, rag),
    };
  });

  if (rows.length === 0) {
    return {
      rows: [], totalProjects: 0, needsAttention: 0, portfolioRag: "green", pct: 0,
      doneTasks: 0, totalTasks: 0, phasesOpen: 0, onDateCount: 0,
      categoryCounts: {
        timeline: { green: 0, amber: 0, red: 0 },
        budget: { green: 0, amber: 0, red: 0 },
        resourcing: { green: 0, amber: 0, red: 0 },
      },
      approvedTotal: 0, spentTotal: 0, drawnPct: null,
      gatesClosingSoon: 0, gatesClosingBy: "", nextMilestone: null,
      lede: "No active projects to report on.",
      healthNote: "", riskNote: "", scheduleNote: "",
      summary: storedSummary || "No active projects to report on.",
      summaryIsStored: Boolean(storedSummary),
    };
  }

  const portfolioRag = rows.reduce<Rag>((acc, r) => worstRag(acc, r.rag), "green");
  const needsAttention = rows.filter((r) => r.rag !== "green").length;
  const doneTasks = rows.reduce((a, r) => a + r.done, 0);
  const totalTasks = rows.reduce((a, r) => a + r.total, 0);
  const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const phasesOpen = rows.filter((r) => r.phase < r.phases).length;
  // "On date" folds in the actual gate math, not just the manually-set timeline flag — otherwise
  // a project with a slipped gate but an unset (defaulted-green) timeline risk would read as fine.
  const onDateCount = rows.filter((r) => r.timeline !== "red" && !r.gateSlipped).length;

  const categoryCounts = {
    timeline: tally(rows.map((r) => r.timeline)),
    budget: tally(rows.map((r) => r.budget)),
    resourcing: tally(rows.map((r) => r.resourcing)),
  };
  function tally(rags: Rag[]): Record<Rag, number> {
    return { green: rags.filter((r) => r === "green").length, amber: rags.filter((r) => r === "amber").length, red: rags.filter((r) => r === "red").length };
  }

  const approvedTotal = rows.reduce((a, r) => a + r.approved, 0);
  const spentTotal = rows.reduce((a, r) => a + r.spent, 0);
  const drawnPct = approvedTotal > 0 ? Math.round((spentTotal / approvedTotal) * 100) : null;

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const gatesClosingSoon = rows.filter((r) => r.gateIso && !r.gateSlipped && r.gateIso <= toDateInputValue(endOfMonth.toISOString())).length;
  const gatesClosingBy = endOfMonth.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const upcoming = rows
    .filter((r) => r.gateIso && !r.gateSlipped)
    .sort((a, b) => a.gateIso.localeCompare(b.gateIso));
  const nextMilestone = upcoming.length
    ? (() => {
        const r = upcoming[0];
        const days = Math.round((new Date(r.gateIso).getTime() - new Date(toDateInputValue(now.toISOString())).getTime()) / 86_400_000);
        return { label: `${r.project.title} — ${r.stage}`, date: r.gate, daysOut: days };
      })()
    : null;

  const redRows = rows.filter((r) => r.rag === "red");
  const amberRows = rows.filter((r) => r.rag === "amber");
  const greenRows = rows.filter((r) => r.rag === "green");

  const lede = [
    `${rows.length} project${rows.length === 1 ? " is" : "s are"} in flight — ${greenRows.length} on track, ${amberRows.length} need${amberRows.length === 1 ? "s" : ""} attention, ${redRows.length} at risk.`,
    redRows.length
      ? `${joinNames(redRows.map((r) => r.project.title))} ${redRows.length === 1 ? "has" : "have"} slipped or ${redRows.length === 1 ? "is" : "are"} at risk.`
      : amberRows.length
        ? `${joinNames(amberRows.map((r) => r.project.title))} need${amberRows.length === 1 ? "s" : ""} attention.`
        : "",
  ].filter(Boolean).join(" ");

  const healthNote = redRows.length
    ? `${joinNames(redRows.map((r) => r.project.title))} ${redRows.length === 1 ? "holds" : "hold"} the portfolio at red.`
    : amberRows.length
      ? `${joinNames(amberRows.map((r) => r.project.title))} ${amberRows.length === 1 ? "holds" : "hold"} the portfolio off green.`
      : "All projects are green.";

  const catLabels: Record<"timeline" | "budget" | "resourcing", string> = { timeline: "Timeline", budget: "Budget", resourcing: "Resourcing" };
  const catEntries = (Object.keys(categoryCounts) as (keyof typeof categoryCounts)[])
    .map((k) => ({ key: k, flagged: categoryCounts[k].amber + categoryCounts[k].red }))
    .sort((a, b) => b.flagged - a.flagged);
  const worstCat = catEntries[0];
  const riskNote = worstCat && worstCat.flagged > 0
    ? `${catLabels[worstCat.key]} carries the most risk — ${worstCat.flagged} of ${rows.length} projects are amber or red.`
    : "No category risk flagged across the portfolio.";

  const slipped = rows.filter((r) => r.gateSlipped);
  const scheduleNote = slipped.length
    ? `${slipped[0].project.title} has slipped its ${slipped[0].stage} gate.`
    : "All projects are tracking to their gates.";

  const worstRow = [...rows].sort((a, b) => RAG_SEVERITY[b.rag] - RAG_SEVERITY[a.rag])[0];
  const composedSummary = portfolioRag === "green"
    ? `All ${rows.length} project${rows.length === 1 ? "" : "s"} ${rows.length === 1 ? "is" : "are"} on track.`
    : (() => {
        const cats: [Rag, string][] = [
          [worstRow.timeline, "schedule"], [worstRow.budget, "budget"], [worstRow.resourcing, "resourcing"],
        ];
        const worstCatForRow = cats.sort((a, b) => RAG_SEVERITY[b[0]] - RAG_SEVERITY[a[0]])[0][1];
        const rest = rows.length - 1;
        return `${worstRow.project.title} is the project to watch, driven by ${worstCatForRow}${worstRow.gateSlipped ? ` — its ${worstRow.stage} gate has slipped` : ""}.${rest > 0 ? ` ${rest} other project${rest === 1 ? "" : "s"} ${rest === 1 ? "is" : "are"} on track or stable.` : ""}`;
      })();

  return {
    rows, totalProjects: rows.length, needsAttention, portfolioRag, pct,
    doneTasks, totalTasks, phasesOpen, onDateCount, categoryCounts,
    approvedTotal, spentTotal, drawnPct,
    gatesClosingSoon, gatesClosingBy, nextMilestone,
    lede, healthNote, riskNote, scheduleNote,
    summary: storedSummary || composedSummary,
    summaryIsStored: Boolean(storedSummary),
  };
}

export { RAG_ORDER, formatMoneyShort };
