/**
 * "Export v2.0" — a from-scratch recreation of the "Modernist" design system's Project Dashboard
 * handoff, as a second, independent, self-contained HTML export. Deliberately does NOT import
 * from exportHtml.ts (the v1 export) — the two files are meant to be maintained independently,
 * so small helpers (esc, budget/date parsing, RAG styling, isSubtaskComplete) are duplicated here.
 */
import type { Contact, Milestone, Project, Subtask, SubtaskStatus } from "./types";
import { safeHref } from "./safeUrl";
import { TASK_STATUS_LABEL, parseTimestamp } from "../components/ui";
import { nextActionSubtasks } from "../pages/projects/NextActionsSection";
import { assigneeAvatar, projectContactPool } from "./projectContacts";

/* ── Design tokens (Modernist, from the handoff's styles.css + README RAG additions) ───────── */
const C = {
  bg: "#f3f2f2",
  text: "#201e1d",
  accent: "#ec3013",
  accent600: "#dd2b0f",
  accent700: "#ae1800",
  divider: "rgba(32,30,29,0.4)",
  n100: "#f8f4f4",
  n200: "#eae7e7",
  n300: "#d7d3d3",
  n400: "#bab6b6",
  n500: "#9b9797",
  n600: "#7d7979",
  n700: "#605d5d",
  n800: "#444141",
  n900: "#2d2b2b",
};

const RAG: Record<"green" | "amber" | "red", { swatch: string; text: string; label: string; caption: string }> = {
  green: { swatch: "#157f4a", text: "#106039", label: "Green", caption: "On track" },
  amber: { swatch: "#e0900a", text: "#8a5200", label: "Amber", caption: "At risk" },
  red:   { swatch: C.accent,  text: C.accent700, label: "Red",   caption: "Off track" },
};

const FONT = "'Archivo', system-ui, sans-serif";

/* ── Duplicated small helpers (self-contained on purpose — see file header) ────────────────── */
function esc(s: string | undefined | null): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function parseBudgetNum(val: string | undefined): number | null {
  if (!val) return null;
  const c = val.replace(/[$,\s]/g, "");
  const k = c.match(/^([\d.]+)[kK]$/), m = c.match(/^([\d.]+)[mM]$/);
  if (k) return parseFloat(k[1]) * 1_000;
  if (m) return parseFloat(m[1]) * 1_000_000;
  const n = parseFloat(c); return isNaN(n) ? null : n;
}
function formatBudget(val: string | undefined): string {
  const n = parseBudgetNum(val);
  if (n === null) return val ? esc(val) : "—";
  if (n >= 1_000_000) return `$${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${+(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}
function remainingBudget(total: string | undefined, spent: string | undefined): { fmt: string; negative: boolean } {
  const t = parseBudgetNum(total), s = parseBudgetNum(spent);
  if (t === null || s === null) return { fmt: "—", negative: false };
  const r = t - s, abs = Math.abs(r);
  const fmt = abs >= 1_000_000 ? `$${+(abs / 1_000_000).toFixed(1)}M` : abs >= 1_000 ? `$${+(abs / 1_000).toFixed(1)}K` : `$${Math.round(abs)}`;
  return { fmt: r < 0 ? `-${fmt}` : fmt, negative: r < 0 };
}

const _MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function parseExportDate(str: string | undefined): Date | null {
  if (!str || str === "No date" || str === "Not set") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, mo, d] = str.split("-").map(Number);
    return new Date(y, mo - 1, d);
  }
  const m = str.match(/^(\w{3})\s+(\d{1,2})(?:[,\s]+(\d{4}))?$/);
  if (m) {
    const mo = _MONTHS.findIndex((x) => x === m[1]);
    if (mo >= 0) return new Date(m[3] ? +m[3] : new Date().getFullYear(), mo, +m[2]);
  }
  return null;
}
function daysRemaining(due: string | undefined): string {
  if (!due || due === "No date") return "";
  const d = parseExportDate(due);
  if (!d) return "";
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff === 0) return "Due today";
  return `${diff} days remaining`;
}

function isSubtaskComplete(s: { done: boolean; taskStatus?: SubtaskStatus }): boolean {
  return s.done || s.taskStatus === "completed";
}

function isExportOverdue(due: string): boolean {
  const d = parseExportDate(due);
  if (!d) return false;
  const now = new Date();
  return d < new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** "MMM DD" — used for task-row due dates. Falls back to the raw string if unparseable. */
function fmtDateShort(str: string | undefined): string {
  const d = parseExportDate(str);
  if (d) return `${_MONTHS[d.getMonth()]} ${d.getDate()}`;
  return str && str !== "No date" && str !== "Not set" ? esc(str) : "";
}
/** "MMM DD, YYYY" — used for the Owner/Status/Start/Due meta row. Falls back to the raw string if unparseable. */
function fmtDateLong(str: string | undefined): string {
  const d = parseExportDate(str);
  if (d) return `${_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  return str && str !== "No date" && str !== "Not set" ? esc(str) : "";
}

const SEV_MATRIX: Record<string, Record<string, string>> = {
  low:    { low: "low",    medium: "low",    high: "medium"   },
  medium: { low: "low",    medium: "medium", high: "high"     },
  high:   { low: "medium", medium: "high",   high: "critical" },
};

const STATUS_LABEL: Record<string, string> = { active: "Active", waiting: "Waiting", hold: "On Hold", complete: "Complete" };

const MILESTONE_STATUS_META: Record<string, { label: string; accent: boolean }> = {
  active:   { label: "In progress", accent: true },
  complete: { label: "Complete", accent: false },
  hold:     { label: "On hold", accent: false },
  waiting:  { label: "Waiting", accent: false },
};

/** Same sort as ProjectDetail.tsx's milestone list & v1's export: soonest-due first, undated last. */
function toDateInputValue(str: string | undefined): string {
  if (!str || str === "No date" || str === "Not set") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const m = str.match(/^(\w{3})\s+(\d{1,2})(?:[,\s]+(\d{4}))?$/);
  if (m) {
    const mo = _MONTHS.findIndex((x) => x === m[1]) + 1;
    if (mo > 0) {
      const yr = m[3] ? +m[3] : new Date().getFullYear();
      return `${yr}-${String(mo).padStart(2, "0")}-${String(+m[2]).padStart(2, "0")}`;
    }
  }
  return "";
}
/** Same subtask ordering as exportHtml.ts (v1): not-done before done, then soonest-due-first
 *  within each group, undated last. Uses raw `.done` (not isSubtaskComplete) to match v1 exactly. */
function sortSubtasksLikeV1(subtasks: Subtask[]): Subtask[] {
  return [...subtasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const da = parseExportDate(a.due), db = parseExportDate(b.due);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  });
}
function sortMilestones(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => {
    const da = toDateInputValue(a.due), db = toDateInputValue(b.due);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  });
}

/* ── Small markup helpers ────────────────────────────────────────────────────────────────────── */
function chipFilled(label: string): string {
  return `<span style="display:inline-block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:2px 6px;background:${C.accent};color:${C.bg}">${esc(label)}</span>`;
}
function chipOutline(label: string, color?: string): string {
  return `<span style="display:inline-block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:2px 6px;border:1px solid ${C.divider}${color ? `;color:${color}` : ""}">${esc(label)}</span>`;
}

function dateRangeCopy(m: Milestone): string {
  if (!m.due || m.due === "No date") return "Dates to be set";
  return m.start ? `${esc(m.start)} – ${esc(m.due)}` : esc(m.due);
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Main export
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
export function exportProjectHtmlV2(project: Project, contacts: Contact[], feedbackEmail = "", workspaceLabel = ""): void {
  const exportDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const totalSubs = project.milestones.reduce((a, m) => a + m.subtasks.length, 0);
  const doneSubs = project.milestones.reduce((a, m) => a + m.subtasks.filter((s) => isSubtaskComplete(s)).length, 0);
  const pct = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;
  const phasesTotal = project.milestones.length;
  const phasesOpen = project.milestones.filter((m) => m.status !== "complete").length;
  const sortedMilestones = sortMilestones(project.milestones);

  /* ── Band A — Header bar ──────────────────────────────────────────────────────────────────── */
  const wsBadge = workspaceLabel ? `${esc(workspaceLabel)} · Project Report` : "Project Report";
  const bandA = `
  <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;padding:14px 32px;border-bottom:2px solid ${C.divider}">
    <div style="display:flex;align-items:baseline;gap:12px">
      <span style="font-family:${FONT};font-weight:800;font-size:14px;letter-spacing:.12em;text-transform:uppercase">MakeItHappen</span>
      <span style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.n600}">${wsBadge}</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <span style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600}">Exported ${esc(exportDate)}</span>
      <div style="display:flex;gap:0;border:1px solid ${C.divider}">
        <button type="button" id="v2-btn-exec" class="v2-toggle-btn" onclick="
          document.getElementById('v2-btn-exec').classList.add('v2-selected');
          document.getElementById('v2-btn-full').classList.remove('v2-selected');
          document.getElementById('v2-band-g').style.display='none';
        " style="font-family:${FONT};font-weight:800;font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:7px 12px;border:0;cursor:pointer">Executive</button>
        <button type="button" id="v2-btn-full" class="v2-toggle-btn v2-selected" onclick="
          document.getElementById('v2-btn-full').classList.add('v2-selected');
          document.getElementById('v2-btn-exec').classList.remove('v2-selected');
          document.getElementById('v2-band-g').style.display='';
        " style="font-family:${FONT};font-weight:800;font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:7px 12px;border:0;border-left:1px solid ${C.divider};cursor:pointer">Full detail</button>
      </div>
    </div>
  </div>`;

  /* ── Band B — Title block ─────────────────────────────────────────────────────────────────── */
  const statusLabel = STATUS_LABEL[project.status] ?? project.status;
  const startVal = project.start ? fmtDateLong(project.start) : "—";
  const dueVal = project.due && project.due !== "No date" ? fmtDateLong(project.due) : "—";
  const targetVal = project.due && project.due !== "No date" ? esc(project.due) : "Not set";
  const daysRemain = daysRemaining(project.due);

  const bandB = `
  <div class="v2-2col v2-band-b" style="border-bottom:2px solid ${C.divider}">
    <div style="padding:40px 32px 32px">
      <h1 class="v2-h1" style="font-size:64px;line-height:1;letter-spacing:-0.03em;margin:0 0 16px">${esc(project.title)}</h1>
      <p style="font-size:21px;line-height:1.45;max-width:56ch;margin:0">${esc(project.desc)}</p>
    </div>
    <div class="v2-right" style="padding:40px 32px 32px;display:flex;flex-direction:column;justify-content:space-between;gap:24px">
      <div>
        <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:10px">Completion</div>
        <div style="display:flex;align-items:baseline;gap:10px">
          <span style="font-family:${FONT};font-weight:800;font-size:88px;line-height:.85;letter-spacing:-0.04em">${pct}</span>
          <span style="font-family:${FONT};font-weight:800;font-size:28px;line-height:1">%</span>
        </div>
        <div style="height:10px;background:${C.n300};margin-top:18px;display:flex">
          <div style="width:${pct}%;background:${C.accent}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n700}">
          <span>${doneSubs} of ${totalSubs} tasks complete</span>
          <span>${phasesOpen} of ${phasesTotal} phases open</span>
        </div>
      </div>
      <div style="border-top:1px solid ${C.divider};padding-top:16px">
        <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:6px">Target completion</div>
        <div style="font-family:${FONT};font-weight:800;font-size:26px;letter-spacing:-0.01em">${targetVal}</div>
        ${daysRemain ? `<div style="font-size:13px;color:${C.n700};margin-top:2px">${esc(daysRemain)}</div>` : ""}
      </div>
    </div>
  </div>`;

  /* ── Band C — Executive metrics ───────────────────────────────────────────────────────────── */
  const showBudget = !!project.budget;
  const rag = project.risk ? RAG[project.risk] : null;
  const ragScale = (["green", "amber", "red"] as const)
    .map((k) => `<span style="flex:1;height:8px;background:${project.risk === k ? RAG[k].swatch : C.n300};display:block"></span>`)
    .join("");

  const riskRows = ([
    ["Timeline", project.timelineRisk],
    ["Budget", project.budgetRisk],
    ["Resourcing", project.resourceRisk],
  ] as [string, "green" | "amber" | "red" | undefined][]).filter(([, v]) => !!v);

  const healthCell = `
    <div style="padding:20px 32px 22px">
      <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:8px">Overall health</div>
      <div style="display:flex;align-items:center;gap:9px">
        <span style="width:14px;height:14px;background:${rag ? rag.swatch : C.n300};display:block"></span>
        <span style="font-family:${FONT};font-weight:800;font-size:22px;letter-spacing:-0.01em">${rag ? rag.label : "Not set"}</span>
        ${rag ? `<span style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n700}">${rag.caption}</span>` : ""}
      </div>
      <div style="display:flex;gap:2px;margin-top:12px">${ragScale}</div>
      <div style="display:flex;gap:2px;margin-top:5px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n600}">
        <span style="flex:1">Green</span><span style="flex:1">Amber</span><span style="flex:1">Red</span>
      </div>
      ${project.riskNote ? `<p style="font-size:13px;line-height:1.45;color:${C.n800};margin:10px 0 0">${esc(project.riskNote)}</p>` : ""}
    </div>`;

  const riskCell = `
    <div style="padding:20px 24px 22px;border-left:1px solid ${C.divider}">
      <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:8px">Risk breakdown</div>
      ${riskRows.length === 0
        ? `<div style="font-size:13px;color:${C.n700}">Not tracked.</div>`
        : `<div style="display:flex;flex-direction:column;gap:7px">
        ${riskRows.map(([label, v]) => `
        <div style="display:flex;align-items:center;gap:9px">
          <span style="width:11px;height:11px;background:${RAG[v!].swatch};display:block;flex-shrink:0"></span>
          <span style="font-size:13px;flex:1">${esc(label)}</span>
          <span style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${RAG[v!].text}">${RAG[v!].label}</span>
        </div>`).join("")}
      </div>`}
    </div>`;

  const activeMilestoneIdx = sortedMilestones.findIndex((m) => m.status !== "complete");
  const scheduleCell = (() => {
    if (phasesTotal === 0) {
      return `
    <div style="padding:20px 24px 22px;border-left:1px solid ${C.divider}">
      <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:8px">Schedule</div>
      <div style="font-family:${FONT};font-weight:800;font-size:22px;letter-spacing:-0.01em">No phases yet</div>
    </div>`;
    }
    const headline = activeMilestoneIdx >= 0 ? `Phase ${activeMilestoneIdx + 1} of ${phasesTotal}` : "All phases complete";
    const m = activeMilestoneIdx >= 0 ? sortedMilestones[activeMilestoneIdx] : sortedMilestones[phasesTotal - 1];
    const sub = m.due && m.due !== "No date" ? `${esc(m.title)} closes ${esc(m.due)}` : `${esc(m.title)} — Dates to be set`;
    return `
    <div style="padding:20px 24px 22px;border-left:1px solid ${C.divider}">
      <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:8px">Schedule</div>
      <div style="font-family:${FONT};font-weight:800;font-size:22px;letter-spacing:-0.01em">${esc(headline)}</div>
      <div style="font-size:13px;color:${C.n700};margin-top:2px">${sub}</div>
      ${project.timelineNote ? `<p style="font-size:13px;line-height:1.45;color:${C.n800};margin:10px 0 0">${esc(project.timelineNote)}</p>` : ""}
    </div>`;
  })();

  const budgetCell = showBudget ? (() => {
    const remaining = remainingBudget(project.budget, project.budgetSpent);
    return `
    <div style="padding:20px 32px 22px;border-left:1px solid ${C.divider}">
      <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:8px">Budget</div>
      <div style="font-family:${FONT};font-weight:800;font-size:22px;letter-spacing:-0.01em">${formatBudget(project.budget)} allocated</div>
      <div style="display:flex;gap:20px;margin-top:10px">
        <div>
          <div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n600}">Approved</div>
          <div style="font-family:${FONT};font-weight:800;font-size:15px">${formatBudget(project.budget)}</div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n600}">Spent</div>
          <div style="font-family:${FONT};font-weight:800;font-size:15px">${formatBudget(project.budgetSpent)}</div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n600}">Remaining</div>
          <div style="font-family:${FONT};font-weight:800;font-size:15px${remaining.negative ? `;color:${C.accent700}` : ""}">${remaining.fmt}</div>
        </div>
      </div>
    </div>`;
  })() : "";

  const metaRow = `
  <div style="padding:18px 32px 16px;border-bottom:1px solid ${C.divider}">
    <div class="v2-meta-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
      <div>
        <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:4px">Owner</div>
        <div style="font-family:${FONT};font-weight:800;font-size:15px">${esc(project.owner)}</div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:4px">Status</div>
        <div style="font-family:${FONT};font-weight:800;font-size:15px;color:${C.accent700}">${esc(statusLabel)}</div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:4px">Start</div>
        <div style="font-family:${FONT};font-weight:800;font-size:15px">${startVal}</div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:4px">Due</div>
        <div style="font-family:${FONT};font-weight:800;font-size:15px">${dueVal}</div>
      </div>
    </div>
  </div>`;

  const bandC = `
  <div style="border-bottom:2px solid ${C.divider}">
    ${metaRow}
    <div class="v2-metrics" style="--cols:${showBudget ? 4 : 3}">
      ${healthCell}${riskCell}${scheduleCell}${budgetCell}
    </div>
  </div>`;

  /* ── Band D — Executive poster ────────────────────────────────────────────────────────────── */
  const execUpdates = project.updates.filter((u) => u.type === "executive");
  const execUpdate = execUpdates.length > 0
    ? execUpdates.reduce((a, b) => (parseTimestamp(b.when) > parseTimestamp(a.when) ? b : a))
    : undefined;
  const decided = [...(project.decisions ?? [])]
    .filter((d) => d.status === "decided")
    .sort((a, b) => b.decidedDate.localeCompare(a.decidedDate))[0];

  const bandD = !execUpdate ? "" : `
  <div style="background:${C.accent600};color:${C.bg};padding:44px 32px 40px;border-bottom:2px solid ${C.divider}">
    <div class="v2-2col v2-band-d" style="grid-template-columns:${decided ? "1.85fr 1fr" : "1fr"};gap:40px;align-items:start">
      <div>
        <div style="font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-bottom:18px">Executive update · ${esc(execUpdate.when)}</div>
        <p class="v2-poster-stmt" style="font-family:${FONT};font-weight:800;font-size:34px;line-height:1.18;letter-spacing:-0.02em;margin:0;max-width:46ch">${esc(execUpdate.text)}</p>
      </div>
      ${decided ? `
      <div class="v2-band-d-right" style="border-left:2px solid rgba(243,242,242,.45);padding-left:24px">
        <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;opacity:.85;margin-bottom:10px">Decision on record</div>
        <div style="font-family:${FONT};font-weight:800;font-size:17px;line-height:1.25">${esc(decided.title)}</div>
        ${decided.description ? `<div style="font-size:13px;line-height:1.45;margin-top:8px;opacity:.9">${esc(decided.description)}</div>` : ""}
      </div>` : ""}
    </div>
  </div>`;

  /* ── Band E — Coming up next / Next action ────────────────────────────────────────────────── */
  const nextRows = nextActionSubtasks(project);
  const NEXT_ACTIONS_SHOWN = 3;
  const nextRowsShown = nextRows.slice(0, NEXT_ACTIONS_SHOWN);
  const contactPool = projectContactPool(project, contacts);
  const leftText = project.nextActionsAiSummary ?? "";

  let rightHtml = "";
  if (nextRowsShown.length > 0) {
    const rowsHtml = nextRowsShown.map(({ subtask }) => {
      const av = assigneeAvatar(contactPool, subtask.assignee, subtask.who);
      const ownerLabel = av.ini || subtask.who || "";
      const statusText = subtask.taskStatus ? TASK_STATUS_LABEL[subtask.taskStatus] : "Scheduled";
      const metaText = ownerLabel ? `${statusText} · Owner ${esc(ownerLabel)}` : statusText;
      return `
      <div style="display:flex;align-items:flex-start;gap:10px">
        ${chipFilled("Next")}
        <div>
          <div style="font-family:${FONT};font-weight:800;font-size:15px;line-height:1.3">${esc(subtask.t)}</div>
          <div style="font-size:12px;color:${C.n700};margin-top:3px">${metaText}</div>
        </div>
      </div>`;
    }).join("");
    rightHtml = `
      <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:12px">Next action${nextRowsShown.length > 1 ? "s" : ""}</div>
      <div style="display:flex;flex-direction:column;gap:14px">${rowsHtml}</div>`;
  }
  const leftHtml = leftText
    ? `<div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:12px">Coming up next</div>
       <p style="font-size:17px;line-height:1.5;margin:0;max-width:62ch">${esc(leftText)}</p>`
    : "";

  const bandE = (!leftHtml && !rightHtml) ? "" : `
  <div class="v2-2col" style="grid-template-columns:${leftHtml && rightHtml ? "1.85fr 1fr" : "1fr"};border-bottom:2px solid ${C.divider}">
    ${leftHtml ? `<div style="padding:28px 32px">${leftHtml}</div>` : ""}
    ${rightHtml ? `<div class="${leftHtml ? "v2-right" : ""}" style="padding:28px 32px">${rightHtml}</div>` : ""}
  </div>`;

  /* ── Band F — Delivery phases ─────────────────────────────────────────────────────────────── */
  const phaseCells = sortedMilestones.map((m, i) => {
    const meta = MILESTONE_STATUS_META[m.status] ?? { label: m.status, accent: false };
    const color = meta.accent ? C.accent700 : C.n600;
    const total = m.subtasks.length;
    const done = m.subtasks.filter((s) => isSubtaskComplete(s)).length;
    const barPct = total > 0 ? Math.round((done / total) * 100) : 0;
    const countText = total > 0 ? `${done} / ${total} tasks` : "No tasks";
    return `
    <div style="background:${C.bg};padding:16px 18px">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">
        <span style="font-family:${FONT};font-weight:800;font-size:12px;letter-spacing:.08em;color:${color}">${String(i + 1).padStart(2, "0")}</span>
        <span style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${color}">${esc(meta.label)}</span>
      </div>
      <div style="font-family:${FONT};font-weight:800;font-size:16px;line-height:1.2;margin-top:8px">${esc(m.title)}</div>
      <div style="font-size:12px;color:${C.n700};margin-top:4px">${dateRangeCopy(m)}</div>
      <div style="height:6px;background:${C.n300};margin-top:12px;display:flex"><div style="width:${barPct}%;background:${C.accent}"></div></div>
      <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n700};margin-top:6px">${countText}</div>
    </div>`;
  }).join("");

  const bandF = `
  <div style="padding:28px 32px 0">
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:20px;margin-bottom:16px">
      <h2 style="font-size:26px;letter-spacing:-0.02em;margin:0">Delivery phases</h2>
      <span style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600}">${phasesTotal} phase${phasesTotal === 1 ? "" : "s"} · ${totalSubs} task${totalSubs === 1 ? "" : "s"}</span>
    </div>
  </div>
  ${phasesTotal === 0
    ? `<div style="margin:0 32px 32px;padding:16px 0;border-top:2px solid ${C.divider};border-bottom:2px solid ${C.divider};font-size:13px;color:${C.n700}">No milestones yet.</div>`
    : `<div class="v2-phase-grid" style="gap:2px;background:${C.divider};margin:0 32px 32px;border-top:2px solid ${C.divider};border-bottom:2px solid ${C.divider}">${phaseCells}</div>`}`;

  /* ── Band G — Detail layer (Full detail view only) ────────────────────────────────────────── */
  const TASK_STATUS_COLOR: Record<string, string | undefined> = {
    "not-started": undefined,
    "scheduled": RAG.amber.text,
    "in-progress": C.accent700,
  };
  const taskRow = (s: Subtask): string => {
    const complete = isSubtaskComplete(s);
    const nextTag = (s.next && !s.done) ? chipFilled("Next") : "";
    const rightTags: string[] = [];
    if (complete) rightTags.push(chipOutline("Complete", RAG.green.text));
    else if (s.taskStatus) rightTags.push(chipOutline(TASK_STATUS_LABEL[s.taskStatus], TASK_STATUS_COLOR[s.taskStatus]));
    const dueHtml = s.due
      ? `<span style="font-size:11px;font-weight:600;color:${!complete && isExportOverdue(s.due) ? C.accent700 : C.n700};white-space:nowrap">${fmtDateShort(s.due)}</span>`
      : "";
    const showNotes = !!s.notes && !complete;
    const hasExtras = !!nextTag || rightTags.length > 0 || !!dueHtml || showNotes;
    const av = assigneeAvatar(contactPool, s.assignee, s.who);
    const ownerLabel = av.ini || s.who || "";
    const checkbox = complete
      ? `<span style="width:14px;height:14px;background:${C.text};display:flex;align-items:center;justify-content:center;margin-top:3px;color:${C.bg};font-size:9px;font-weight:800">&#10003;</span>`
      : `<span style="width:14px;height:14px;border:2px solid ${C.n500};display:block;margin-top:3px"></span>`;
    return `
        <div style="display:grid;grid-template-columns:16px 1fr auto;gap:12px;align-items:start;padding:10px 0;border-top:1px solid ${C.divider}">
          ${checkbox}
          <div>
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">
              <span style="font-size:15px;font-weight:${hasExtras ? 600 : 400};line-height:1.35${complete ? `;color:${C.n500}` : ""}">${esc(s.t)}</span>
              ${nextTag}
            </div>
            ${showNotes ? `<div style="font-size:13px;color:${C.n700};line-height:1.45;margin-top:5px">${esc(s.notes)}</div>` : ""}
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:2px">
            ${rightTags.join("")}
            ${dueHtml}
            ${ownerLabel ? `<span style="font-size:11px;font-weight:800;letter-spacing:.08em;color:${C.n700}">${esc(ownerLabel)}</span>` : ""}
          </div>
        </div>`;
  };

  const phaseBlocks = sortedMilestones.map((m, i) => {
    const total = m.subtasks.length, done = m.subtasks.filter((s) => isSubtaskComplete(s)).length;
    const meta = MILESTONE_STATUS_META[m.status] ?? { label: m.status, accent: false };
    const color = meta.accent ? C.accent700 : C.n600;
    return `
      <details data-v2-phase style="border-top:2px solid ${C.divider};margin-bottom:26px">
        <summary class="v2-phase-summary" style="display:flex;align-items:baseline;gap:12px;background:${C.n200};padding:12px 14px">
          <span style="font-family:${FONT};font-weight:800;font-size:12px;color:${color}">${String(i + 1).padStart(2, "0")}</span>
          <h3 style="font-size:19px;letter-spacing:-0.01em;margin:0;flex:1">${esc(m.title)}</h3>
          <span style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n700}">${total > 0 ? `${done} / ${total}` : "No tasks"}</span>
        </summary>
        <div style="padding:0 14px">
          ${m.subtasks.length === 0 ? `<div style="font-size:13px;color:${C.n700};padding:10px 0;border-top:1px solid ${C.divider}">No tasks in this phase.</div>` : sortSubtasksLikeV1(m.subtasks).map(taskRow).join("")}
        </div>
      </details>`;
  }).join("");

  const taskDetailLeft = `
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:20px;margin-bottom:4px">
      <h2 style="font-size:26px;letter-spacing:-0.02em;margin:0">Task detail</h2>
      ${phasesTotal > 0 ? `<button type="button" id="v2-phase-toggle-all" class="v2-toggle-btn" onclick="
        var ds=document.querySelectorAll('[data-v2-phase]');
        var anyClosed=false;
        ds.forEach(function(d){ if(!d.open) anyClosed=true; });
        ds.forEach(function(d){ d.open=anyClosed; });
        document.getElementById('v2-phase-toggle-all').textContent=anyClosed?'Collapse all':'Expand all';
      " style="font-family:${FONT};font-weight:800;font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:6px 10px;border:1px solid ${C.divider};cursor:pointer;flex-shrink:0">Expand all</button>` : ""}
    </div>
    <p style="font-size:13px;color:${C.n700};margin:0 0 24px">${totalSubs > 0 ? `All ${totalSubs} task${totalSubs === 1 ? "" : "s"} by phase, for project stakeholders.` : "No tasks recorded for this project yet."}</p>
    ${phasesTotal === 0 ? `<div style="font-size:13px;color:${C.n700}">No milestones yet.</div>` : phaseBlocks}`;

  // Status log
  const updateTypeChip = (type?: string) => {
    if (type === "executive") return chipFilled("Executive");
    const labels: Record<string, string> = { update: "Update", "heads-up": "Heads up", blocked: "Blocked", win: "Win" };
    return chipOutline(labels[type ?? "update"] ?? "Update");
  };
  const renderUpdateRow = (u: (typeof project.updates)[number], withDivider: boolean) => `
        <div style="${withDivider ? `padding-bottom:12px;border-bottom:1px solid ${C.divider};margin-bottom:12px` : ""}">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px">
            ${updateTypeChip(u.type)}
            <span style="font-size:11px;color:${C.n700}">${esc(u.when)}</span>
          </div>
          <p style="font-size:14px;line-height:1.45;margin:8px 0 0">${esc(u.text)}</p>
        </div>`;
  const STATUS_LOG_SHOWN = 2;
  const shownUpdates = project.updates.slice(0, STATUS_LOG_SHOWN);
  const olderUpdates = project.updates.slice(STATUS_LOG_SHOWN);
  const statusLogHtml = project.updates.length === 0
    ? `<div style="font-size:13px;color:${C.n700}">No status updates yet.</div>`
    : shownUpdates.map((u, i) => renderUpdateRow(u, i < shownUpdates.length - 1 || olderUpdates.length > 0)).join("")
      + (olderUpdates.length === 0 ? "" : `
        <details style="margin-top:0">
          <summary style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.accent700}">Show ${olderUpdates.length} older update${olderUpdates.length === 1 ? "" : "s"}</summary>
          <div style="margin-top:12px">${olderUpdates.map((u, i) => renderUpdateRow(u, i < olderUpdates.length - 1)).join("")}</div>
        </details>`);

  // Internal team
  const members = project.members ?? [];
  const teamHtml = members.length === 0
    ? `<div style="font-size:13px;color:${C.n700};padding:8px 0">No team members added.</div>`
    : members.map((mem) => {
        const contact = contacts.find((c) => c.id === mem.contactId);
        if (!contact) return "";
        const isOwner = contact.name === project.owner;
        const avBg = isOwner ? C.text : C.n300;
        const avFg = isOwner ? C.bg : C.text;
        return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid ${C.divider}">
          <span style="width:26px;height:26px;background:${avBg};color:${avFg};font-family:${FONT};font-weight:800;font-size:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${esc(initialsOf(contact.name))}</span>
          <span style="font-size:14px;font-weight:600;flex:1">${esc(contact.name)}</span>
          ${isOwner ? `<span style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n700}">Owner</span>` : mem.role ? `<span style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n700}">${esc(mem.role)}</span>` : ""}
        </div>`;
      }).join("");

  // Stakeholders
  const stakeholders = project.stakeholders ?? [];
  const stakeholdersHtml = stakeholders.length === 0
    ? `<div style="font-size:13px;color:${C.n700};padding-top:8px">No stakeholders added.</div>`
    : stakeholders.map((s) => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid ${C.divider}">
          <span style="font-size:14px;font-weight:600;flex:1">${esc(s.name)}</span>
          ${s.role ? `<span style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n700}">${esc(s.role)}</span>` : ""}
        </div>`).join("");

  // Decisions
  const decisions = [...(project.decisions ?? [])].sort((a, b) => b.decidedDate.localeCompare(a.decidedDate));
  const renderDecisionRow = (d: (typeof decisions)[number], withDivider: boolean) => `
        <div style="${withDivider ? `padding-bottom:12px;border-bottom:1px solid ${C.divider};margin-bottom:12px` : ""}">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px">
            <span style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.accent700}">${d.owner ? `Decided · ${esc(d.owner)}` : "Decided"}</span>
            <span style="font-size:11px;color:${C.n700}">${esc(d.decidedDate)}</span>
          </div>
          <div style="font-size:14px;font-weight:600;line-height:1.4;margin-top:6px">${esc(d.title)}</div>
          ${d.description ? `<div style="font-size:13px;color:${C.n700};margin-top:3px">${esc(d.description)}</div>` : ""}
        </div>`;
  const DECISIONS_SHOWN = 3;
  const shownDecisions = decisions.slice(0, DECISIONS_SHOWN);
  const olderDecisions = decisions.slice(DECISIONS_SHOWN);
  const decisionsHtml = decisions.length === 0
    ? `<div style="font-size:13px;color:${C.n700}">No decisions logged.</div>`
    : shownDecisions.map((d, i) => renderDecisionRow(d, i < shownDecisions.length - 1 || olderDecisions.length > 0)).join("")
      + (olderDecisions.length === 0 ? "" : `
        <details style="margin-top:0">
          <summary style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.accent700}">Show ${olderDecisions.length} older decision${olderDecisions.length === 1 ? "" : "s"}</summary>
          <div style="margin-top:12px">${olderDecisions.map((d, i) => renderDecisionRow(d, i < olderDecisions.length - 1)).join("")}</div>
        </details>`);

  // Risk register
  const SEV_TEXT_COLOR: Record<string, string> = {
    critical: C.accent700,
    high: C.accent700,
    medium: RAG.amber.text,
    low: C.n700,
  };
  const risks = project.risks ?? [];
  const renderRiskRow = (r: (typeof risks)[number], withDivider: boolean) => {
    const sev = SEV_MATRIX[r.probability]?.[r.impact] ?? "low";
    return `
        <div style="${withDivider ? `padding-bottom:12px;border-bottom:1px solid ${C.divider};margin-bottom:12px` : ""}">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px">
            ${chipOutline(sev, SEV_TEXT_COLOR[sev])}
            <span style="font-size:11px;color:${C.n700};text-transform:capitalize">${esc(r.status)}</span>
          </div>
          <div style="font-size:14px;line-height:1.4;margin-top:6px">${esc(r.description)}</div>
          ${r.mitigation ? `<div style="font-size:13px;color:${C.n700};margin-top:3px">${esc(r.mitigation)}</div>` : ""}
        </div>`;
  };
  const RISKS_SHOWN = 2;
  const shownRisks = risks.slice(0, RISKS_SHOWN);
  const moreRisks = risks.slice(RISKS_SHOWN);
  const risksHtml = risks.length === 0
    ? `<div style="font-size:13px;color:${C.n700}">No risks logged.</div>`
    : shownRisks.map((r, i) => renderRiskRow(r, i < shownRisks.length - 1 || moreRisks.length > 0)).join("")
      + (moreRisks.length === 0 ? "" : `
        <details style="margin-top:0">
          <summary style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.accent700}">Show ${moreRisks.length} more risk${moreRisks.length === 1 ? "" : "s"}</summary>
          <div style="margin-top:12px">${moreRisks.map((r, i) => renderRiskRow(r, i < moreRisks.length - 1)).join("")}</div>
        </details>`);

  // Issues
  const issues = project.issues ?? [];
  const renderIssueRow = (iss: (typeof issues)[number], withDivider: boolean) => `
        <div style="${withDivider ? `padding-bottom:12px;border-bottom:1px solid ${C.divider};margin-bottom:12px` : ""}">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px">
            ${chipOutline(iss.severity, SEV_TEXT_COLOR[iss.severity])}
            <span style="font-size:11px;color:${C.n700};text-transform:capitalize">${esc(iss.status)}</span>
          </div>
          <div style="font-size:14px;font-weight:600;line-height:1.4;margin-top:6px">${esc(iss.title)}</div>
          ${iss.description ? `<div style="font-size:13px;color:${C.n700};margin-top:3px">${esc(iss.description)}</div>` : ""}
          ${iss.resolution ? `<div style="font-size:13px;color:${C.n700};margin-top:3px">${esc(iss.resolution)}</div>` : ""}
        </div>`;
  const ISSUES_SHOWN = 2;
  const shownIssues = issues.slice(0, ISSUES_SHOWN);
  const moreIssues = issues.slice(ISSUES_SHOWN);
  const issuesHtml = issues.length === 0
    ? `<div style="font-size:13px;color:${C.n700}">No issues logged.</div>`
    : shownIssues.map((iss, i) => renderIssueRow(iss, i < shownIssues.length - 1 || moreIssues.length > 0)).join("")
      + (moreIssues.length === 0 ? "" : `
        <details style="margin-top:0">
          <summary style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.accent700}">Show ${moreIssues.length} more issue${moreIssues.length === 1 ? "" : "s"}</summary>
          <div style="margin-top:12px">${moreIssues.map((iss, i) => renderIssueRow(iss, i < moreIssues.length - 1)).join("")}</div>
        </details>`);

  // Resources
  const resourcesList = project.resources ?? [];
  const resourcesHtml = resourcesList.length === 0
    ? `<div style="font-size:13px;color:${C.n700}">No resources added.</div>`
    : resourcesList.map((r, i) => `
        <div style="padding:7px 0;${i < resourcesList.length - 1 ? `border-bottom:1px solid ${C.divider}` : ""}">
          <a href="${esc(safeHref(r.url))}" target="_blank" rel="noopener noreferrer" style="font-size:14px;font-weight:600;color:${C.accent700}">${esc(r.label)}</a>
        </div>`).join("");

  // Open registers
  const risksCount = project.risks?.length ?? 0;
  const issuesCount = project.issues?.length ?? 0;
  const resourcesCount = resourcesList.length;
  let registerNote = "";
  if (risksCount === 0) {
    const flagged = ([
      ["Timeline", project.timelineRisk],
      ["Budget", project.budgetRisk],
      ["Resourcing", project.resourceRisk],
    ] as [string, "green" | "amber" | "red" | undefined][]).find(([, v]) => v === "amber" || v === "red");
    if (flagged) registerNote = `${flagged[0]} is flagged ${RAG[flagged[1]!].label.toLowerCase()} — no formal risk has been logged for it yet.`;
  }
  // Jump links also force the (now-collapsed-by-default) target section open, so the count
  // always lands somewhere visible rather than on a collapsed summary.
  const jumpLink = (targetId: string, count: number) =>
    `<a href="#${targetId}" onclick="var d=document.getElementById('${targetId}');if(d)d.open=true" style="font-family:${FONT};font-weight:800;color:inherit">${count}</a>`;
  const registersHtml = `
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid ${C.divider};font-size:14px">
      <span>Risks logged</span>${jumpLink("v2-risk-register", risksCount)}
    </div>
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid ${C.divider};font-size:14px">
      <span>Issues logged</span>${jumpLink("v2-issues", issuesCount)}
    </div>
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid ${C.divider};font-size:14px">
      <span>Resources attached</span>${jumpLink("v2-resources", resourcesCount)}
    </div>
    ${registerNote ? `<div style="font-size:13px;color:${C.n700};margin-top:10px;line-height:1.45">${esc(registerNote)}</div>` : ""}`;

  /** Whole-section accordion — the label is the toggle, shaded like the milestone headers
   *  (same font/style/underline, plus a background tint) so sections don't blend together. */
  const railSection = (label: string, body: string, opts: { marginBottom?: number; defaultOpen?: boolean; id?: string } = {}) => {
    const { marginBottom = 28, defaultOpen = false, id } = opts;
    return `
      <details${defaultOpen ? " open" : ""}${id ? ` id="${id}"` : ""} style="margin-bottom:${marginBottom}px">
        <summary style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};background:${C.n200};border-bottom:2px solid ${C.divider};padding:8px 10px;margin-bottom:12px">${esc(label)}</summary>
        ${body}
      </details>`;
  };

  const detailRight = [
    railSection("Open registers", registersHtml, { defaultOpen: true }),
    railSection("Status log", statusLogHtml),
    railSection("Internal team", teamHtml),
    railSection("Stakeholders", stakeholdersHtml),
    railSection("Decisions", decisionsHtml),
    railSection("Risk register", risksHtml, { id: "v2-risk-register" }),
    railSection("Issues", issuesHtml, { id: "v2-issues" }),
    railSection("Resources", resourcesHtml, { marginBottom: 0, id: "v2-resources" }),
  ].join("");

  const bandG = `
  <div id="v2-band-g" class="v2-2col v2-band-g" style="border-top:2px solid ${C.divider}">
    <div class="v2-band-g-left" style="padding:32px">${taskDetailLeft}</div>
    <div class="v2-right" style="padding:32px">${detailRight}</div>
  </div>`;

  /* ── Band H — Footer ──────────────────────────────────────────────────────────────────────── */
  const feedbackHtml = feedbackEmail
    ? `<a href="${esc(safeHref(`mailto:${feedbackEmail}?subject=${encodeURIComponent(`${project.title}: Report feedback`)}`))}" class="v2-feedback-link" style="font-family:${FONT};font-weight:800;font-size:11px;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;color:${C.accent}">Send feedback</a>`
    : "";
  const bandH = `
  <div style="border-top:2px solid ${C.divider};padding:16px 32px;display:flex;align-items:center;justify-content:space-between;gap:20px">
    <span style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600}">${esc(project.title)} · Generated ${esc(exportDate)}</span>
    ${feedbackHtml}
  </div>`;

  /* ── Full document ────────────────────────────────────────────────────────────────────────── */
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(project.title)} — Project Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&display=swap">
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{margin:0;background:${C.bg};color:${C.text};font-family:${FONT};font-size:15px;line-height:1.55}
    h1,h2,h3{font-family:${FONT};font-weight:800;margin:0}
    p{margin:0}
    a{text-decoration:none}
    .v2-toggle-btn{background:transparent;color:${C.text}}
    .v2-toggle-btn.v2-selected{background:${C.accent};color:${C.bg}}
    .v2-toggle-btn:hover:not(.v2-selected){background:rgba(32,30,29,0.1)}
    details>summary{list-style:none;cursor:pointer}
    details>summary::-webkit-details-marker{display:none}
    .v2-feedback-link:hover{color:${C.accent700}}
    :focus-visible{outline:2px solid ${C.accent};outline-offset:2px}
    .v2-2col{display:grid;grid-template-columns:1.85fr 1fr}
    .v2-band-b .v2-right,.v2-band-e .v2-right{border-left:2px solid ${C.divider}}
    .v2-band-g .v2-band-g-left{border-right:2px solid ${C.divider}}
    .v2-metrics{display:grid;grid-template-columns:repeat(var(--cols,4),1fr)}
    .v2-phase-grid{display:grid;grid-template-columns:repeat(4,1fr)}
    @media (max-width: 999px) {
      .v2-2col{grid-template-columns:1fr!important}
      .v2-band-b .v2-right,.v2-band-e .v2-right{border-left:none;border-top:2px solid ${C.divider}}
      .v2-band-g .v2-band-g-left{border-right:none;border-bottom:2px solid ${C.divider}}
      .v2-band-d-right{border-left:none!important;border-top:2px solid rgba(243,242,242,.45);padding-left:0!important;padding-top:24px}
      .v2-metrics{grid-template-columns:repeat(2,1fr)}
      .v2-phase-grid{grid-template-columns:repeat(2,1fr)}
      .v2-meta-row{grid-template-columns:repeat(2,1fr)}
      .v2-h1{font-size:44px!important}
      .v2-poster-stmt{font-size:26px!important}
    }
  </style>
</head>
<body>
<div style="max-width:1320px;margin:0 auto;background:${C.bg}">
  ${bandA}
  ${bandB}
  ${bandC}
  ${bandD}
  ${bandE}
  ${bandF}
  ${bandG}
  ${bandH}
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]/g, "")}-v2.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
