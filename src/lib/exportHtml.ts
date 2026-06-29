import type { Contact, MeetingAgenda, Project, SubtaskStatus } from "./types";
import { toDateInputValue } from "../components/ui";

function esc(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
function remainingBudget(total: string | undefined, spent: string | undefined): { fmt: string; color: string } {
  const t = parseBudgetNum(total), s = parseBudgetNum(spent);
  if (t === null || s === null) return { fmt: "—", color: "#6B7280" };
  const r = t - s, abs = Math.abs(r);
  const fmt = (abs >= 1_000_000 ? `$${+(abs / 1_000_000).toFixed(1)}M` : abs >= 1_000 ? `$${+(abs / 1_000).toFixed(1)}K` : `$${Math.round(abs)}`);
  return { fmt: r < 0 ? `-${fmt}` : fmt, color: r < 0 ? "#EF4444" : "#10B981" };
}

function taskStatusPill(status: SubtaskStatus | undefined): string {
  if (!status) return "";
  const styles: Record<string, [string, string]> = {
    "not-started": ["#F6F7F9", "#8A909B"],
    "scheduled":   ["#EEF1FD", "#2E45B8"],
    "in-progress": ["#FBF3E3", "#97650B"],
    "completed":   ["#E7F7F1", "#0A7D58"],
  };
  const labels: Record<string, string> = {
    "not-started": "Not started",
    "scheduled":   "Scheduled",
    "in-progress": "In progress",
    "completed":   "Completed",
  };
  const [bg, color] = styles[status] ?? ["#F6F7F9", "#8A909B"];
  const label = labels[status] ?? status;
  return `<span style="display:inline-block;font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:99px;background:${bg};color:${color};white-space:nowrap;flex-shrink:0;align-self:flex-start">${label}</span>`;
}

function statusBadge(status: string): string {
  const map: Record<string, [string, string, string]> = {
    active:   ["#E6F1FB", "#185FA5", "Active"],
    waiting:  ["#EDE9FE", "#5B21B6", "Waiting"],
    hold:     ["#FAEEDA", "#854F0B", "On Hold"],
    complete: ["#EAF3DE", "#27500A", "Complete"],
  };
  const [bg, color, label] = map[status] ?? ["#F3F4F6", "#6B7280", status];
  return `<span style="display:inline-block;font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;background:${bg};color:${color}">${label}</span>`;
}

const AVATAR_PALETTE = [
  ["#E6F1FB", "#185FA5"],
  ["#E1F5EE", "#085041"],
  ["#FAEEDA", "#633806"],
  ["#EEEDFE", "#3C3489"],
  ["#FAECE7", "#712B13"],
];

function avatar(initials: string, idx = 0): string {
  const [bg, color] = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
  return `<div style="width:24px;height:24px;border-radius:50%;background:${bg};color:${color};font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0">${esc(initials.slice(0, 2).toUpperCase())}</div>`;
}

function ragDot(rag?: "green" | "amber" | "red"): string {
  if (!rag) return "";
  const c = { green: "#10B981", amber: "#F59E0B", red: "#EF4444" }[rag];
  return `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${c};margin-right:5px;vertical-align:middle"></span>`;
}

function feedbackPill(projectTitle: string, section: string, email: string): string {
  if (!email) return "";
  const subject = encodeURIComponent(`${projectTitle}: ${section}`);
  return `<a href="mailto:${email}?subject=${subject}" style="display:inline-flex;align-items:center;font-size:10px;font-weight:500;padding:2px 8px;border-radius:99px;background:#F3F4F6;color:#9CA3AF;text-decoration:none;border:0.5px solid #E7E9ED;white-space:nowrap;flex-shrink:0" onclick="event.stopPropagation()">Feedback</a>`;
}

const _MONTHS_EXP = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function parseExportDate(str: string): Date | null {
  if (!str || str === "No date" || str === "Not set") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, mo, d] = str.split("-").map(Number);
    return new Date(y, mo - 1, d);
  }
  const m = str.match(/^(\w{3})\s+(\d{1,2})(?:[,\s]+(\d{4}))?$/);
  if (m) {
    const mo = _MONTHS_EXP.findIndex(x => x === m[1]);
    if (mo >= 0) return new Date(m[3] ? +m[3] : new Date().getFullYear(), mo, +m[2]);
  }
  return null;
}

function daysRemaining(due: string): string {
  if (!due || due === "No date") return "";
  const d = parseExportDate(due);
  if (!d) return "";
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff === 0) return "Due today";
  return `${diff} days remaining`;
}

const SEV_MATRIX: Record<string, Record<string, string>> = {
  low:    { low: "low",    medium: "low",    high: "medium"   },
  medium: { low: "low",    medium: "medium", high: "high"     },
  high:   { low: "medium", medium: "high",   high: "critical" },
};

const SEV_STYLE: Record<string, [string, string]> = {
  low:      ["rgba(16,185,129,.14)",  "#059669"],
  medium:   ["rgba(245,158,11,.14)",  "#B45309"],
  high:     ["rgba(249,115,22,.14)",  "#C2410C"],
  critical: ["rgba(239,68,68,.14)",   "#A32D2D"],
};

export function exportProjectHtml(project: Project, contacts: Contact[], feedbackEmail = ""): void {
  const totalSubs = project.milestones.reduce((a, m) => a + m.subtasks.length, 0);
  const doneSubs  = project.milestones.reduce((a, m) => a + m.subtasks.filter((s) => s.done).length, 0);
  const exportDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const pct = totalSubs > 0 ? doneSubs / totalSubs : 0;
  const fillArc = (pct * 141.4).toFixed(1);
  const fillGap = (188.5 - pct * 141.4).toFixed(1);
  const dialSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 76" width="76" height="76" style="display:block"><circle cx="38" cy="38" r="30" fill="none" stroke="#E5E7EB" stroke-width="4.5" stroke-dasharray="141.4 47.1" stroke-linecap="round" transform="rotate(135 38 38)"/><circle cx="38" cy="38" r="30" fill="none" stroke="#4F6BED" stroke-width="4.5" stroke-dasharray="${fillArc} ${fillGap}" stroke-linecap="round" transform="rotate(135 38 38)"/><text x="38" y="38" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="500" fill="#1A1D23">${Math.round(pct * 100)}%</text></svg>`;
  const ragLabel = project.risk ? { green: "Green", amber: "Amber", red: "Red" }[project.risk] : "Not set";

  // ── Milestones ─────────────────────────────────────────────────────────────
  const sortedMilestones = [...project.milestones].sort((a, b) => {
    const da = toDateInputValue(a.due);
    const db = toDateInputValue(b.due);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  });

  const milestonesHtml = sortedMilestones.length === 0
    ? `<div style="font-size:12.5px;color:#6B7280">No milestones yet.</div>`
    : sortedMilestones.map((m) => {
        const dotColor = m.status === "active" ? "#4F6BED" : "#6B7280";
        const statusDot = m.status === "complete"
          ? `<span style="font-size:13px;line-height:1;flex-shrink:0;align-self:flex-start;margin-top:2px">✅</span>`
          : `<div style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0;align-self:flex-start;margin-top:4px"></div>`;
        const sorted = [...m.subtasks].sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return new Date(a.due).getTime() - new Date(b.due).getTime();
        });
        const subtasksHtml = sorted.length === 0 ? "" : `
          <div style="padding:6px 14px 8px">
            ${sorted.map((s) => `
              <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:0.5px solid #F3F4F6">
                <div style="width:14px;height:14px;border-radius:50%;${s.done ? "background:#10B981;border:1.5px solid #10B981;display:flex;align-items:center;justify-content:center" : "border:1.5px solid #9CA3AF"};flex-shrink:0;margin-top:1px;align-self:flex-start">
                  ${s.done ? `<span style="color:white;font-size:9px;font-weight:700">✓</span>` : ""}
                </div>
                <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
                  <span style="font-size:12.5px;color:${s.done ? "#6B7280" : "#374151"}">${esc(s.t)}</span>
                  ${s.notes ? `<span style="font-size:11px;color:#9CA3AF">${esc(s.notes)}</span>` : ""}
                </div>
                ${taskStatusPill(s.taskStatus)}
                ${s.due ? `<span style="font-size:11px;color:#6B7280;white-space:nowrap;align-self:flex-start">${esc(s.due)}</span>` : ""}
                <span style="font-size:10.5px;color:#6B7280;align-self:flex-start">${esc(s.who)}</span>
              </div>
            `).join("")}
          </div>`;
        return `
          <details style="border:0.5px solid #E7E9ED;border-radius:8px;margin-bottom:10px;overflow:hidden">
            <summary class="ms-summary" style="display:flex;align-items:center;gap:9px;padding:10px 14px;background:#EEF0F3;user-select:none">
              <span class="ms-chev" style="align-self:flex-start;margin-top:2px">▶</span>
              ${statusDot}
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:500;color:#1A1D23">${esc(m.title)}</div>
                ${m.desc ? `<div style="font-size:11px;color:#6B7280;margin-top:2px">${esc(m.desc)}</div>` : ""}
              </div>
              ${m.start ? `<span style="font-size:11px;color:#6B7280;white-space:nowrap">${esc(m.start)} →</span>` : ""}
              ${m.due && m.due !== "No date" ? `<span style="font-size:11px;color:#6B7280;white-space:nowrap">${esc(m.due)}</span>` : ""}
              ${statusBadge(m.status)}
            </summary>
            ${subtasksHtml}
          </details>`;
      }).join("");

  // ── Risk register ───────────────────────────────────────────────────────────
  const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const risks = [...(project.risks ?? [])].sort((a, b) => {
    const sa = SEV_MATRIX[a.probability]?.[a.impact] ?? "low";
    const sb = SEV_MATRIX[b.probability]?.[b.impact] ?? "low";
    return (SEV_ORDER[sa] ?? 3) - (SEV_ORDER[sb] ?? 3);
  });
  const risksHtml = risks.length === 0
    ? `<div style="font-size:12.5px;color:#6B7280">No risks logged.</div>`
    : risks.map((r) => {
        const sev = SEV_MATRIX[r.probability]?.[r.impact] ?? "low";
        const [sevBg, sevColor] = SEV_STYLE[sev] ?? ["#F3F4F6", "#6B7280"];
        const statusColor = { open: "#DC2626", mitigated: "#B45309", closed: "#059669" }[r.status] ?? "#6B7280";
        return `
          <div style="display:flex;gap:10px;padding:7px 0;border-bottom:0.5px solid #F3F4F6;align-items:flex-start">
            <span style="font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:99px;background:${sevBg};color:${sevColor};white-space:nowrap;flex-shrink:0;text-transform:capitalize">${sev}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;color:#374151">${esc(r.description)}</div>
              ${r.mitigation ? `<div style="font-size:11.5px;color:#6B7280;margin-top:2px">↳ ${esc(r.mitigation)}</div>` : ""}
            </div>
            <span style="font-size:10.5px;color:${statusColor};text-transform:capitalize;flex-shrink:0">${r.status}</span>
          </div>`;
      }).join("");

  // ── Issue tracker ───────────────────────────────────────────────────────────
  const issues = project.issues ?? [];
  const ISSUE_STATUS_COLOR: Record<string, string> = {
    "open": "#DC2626",
    "in-progress": "#B45309",
    "resolved": "#059669",
  };
  const issuesHtml = issues.length === 0
    ? `<div style="font-size:12.5px;color:#6B7280">No issues logged.</div>`
    : issues.map((iss) => {
        const [sevBg, sevColor] = SEV_STYLE[iss.severity] ?? ["#F3F4F6", "#6B7280"];
        const statusColor = ISSUE_STATUS_COLOR[iss.status] ?? "#6B7280";
        const statusLabel = iss.status === "in-progress" ? "In Progress" : iss.status.charAt(0).toUpperCase() + iss.status.slice(1);
        return `
          <div style="display:flex;gap:10px;padding:7px 0;border-bottom:0.5px solid #F3F4F6;align-items:flex-start">
            <span style="font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:99px;background:${sevBg};color:${sevColor};white-space:nowrap;flex-shrink:0;text-transform:capitalize">${esc(iss.severity)}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;color:#374151">${esc(iss.title)}</div>
              ${iss.description ? `<div style="font-size:11.5px;color:#6B7280;margin-top:2px">${esc(iss.description)}</div>` : ""}
              ${iss.resolution ? `<div style="font-size:11.5px;color:#6B7280;margin-top:2px">↳ ${esc(iss.resolution)}</div>` : ""}
            </div>
            <span style="font-size:10.5px;color:${statusColor};flex-shrink:0;white-space:nowrap">${statusLabel}</span>
          </div>`;
      }).join("");

  // ── Team ────────────────────────────────────────────────────────────────────
  const members = project.members ?? [];
  const teamHtml = members.length === 0
    ? `<div style="font-size:12.5px;color:#6B7280;padding:6px 0">No team members added.</div>`
    : members.map((mem, i) => {
        const contact = contacts.find((c) => c.id === mem.contactId);
        if (!contact) return "";
        const initials = contact.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
        return `
          <div style="display:flex;align-items:center;gap:9px;padding:6px 0;border-bottom:0.5px solid #F3F4F6">
            ${avatar(initials, i)}
            <div style="font-size:12.5px;font-weight:500;color:#374151;flex:1">${esc(contact.name)}</div>
            ${mem.role ? `<div style="font-size:11.5px;color:#6B7280">${esc(mem.role)}</div>` : ""}
          </div>`;
      }).join("");

  // ── Status updates ──────────────────────────────────────────────────────────
  const UPDATE_TYPE_STYLE: Record<string, [string, string, string]> = {
    "update":    ["var(--surface-2,#F6F7F9)", "#6B7280", "Update"],
    "heads-up":  ["rgba(245,158,11,.13)",      "#B45309", "Heads up"],
    "blocked":   ["rgba(239,68,68,.13)",        "#DC2626", "Blocked"],
    "win":       ["rgba(16,185,129,.13)",       "#059669", "Win"],
    "executive": ["rgba(99,102,241,.13)",       "#4338CA", "Executive Status"],
  };
  const updateTypePill = (type?: string) => {
    const [bg, color, label] = UPDATE_TYPE_STYLE[type ?? "update"] ?? UPDATE_TYPE_STYLE["update"];
    return `<span style="font-size:11px;font-weight:600;padding:2px 9px;border-radius:99px;background:${bg};color:${color};flex-shrink:0">${label}</span>`;
  };
  const updatesHtml = project.updates.length === 0
    ? `<div style="font-size:12.5px;color:#6B7280">No updates yet.</div>`
    : project.updates.map((u) => `
        <div style="padding:10px 14px;border:0.5px solid #E7E9ED;border-radius:8px;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            ${updateTypePill(u.type)}
            <span style="font-size:11px;color:#6B7280;margin-left:auto">${esc(u.when)}</span>
          </div>
          <div style="font-size:12.5px;color:#4B5563;line-height:1.55">${esc(u.text)}</div>
        </div>`).join("");

  // ── Executive update KPI ────────────────────────────────────────────────────
  const execUpdate = project.updates.find((u) => u.type === "executive") ?? null;
  const execUpdateHtml = execUpdate
    ? (() => {
        const needsToggle = execUpdate.text.length > 180;
        const body = needsToggle
          ? `<div style="font-size:13px;color:#374151;line-height:1.55;max-height:4.7em;overflow:hidden">${esc(execUpdate.text)}</div>
             <a href="#" onclick="var d=this.previousElementSibling;var c=d.style.maxHeight==='4.7em';d.style.maxHeight=c?'':'4.7em';d.style.overflow=c?'visible':'hidden';this.textContent=c?'Show less':'Read more';return false;" style="font-size:11px;color:#6366F1;cursor:pointer;display:inline-block;margin-top:4px;text-decoration:none">Read more</a>`
          : `<div style="font-size:13px;color:#374151;line-height:1.55">${esc(execUpdate.text)}</div>`;
        return `${body}<div style="font-size:11px;color:#6B7280;margin-top:6px">${esc(execUpdate.when)}</div>`;
      })()
    : `<div style="font-size:12.5px;color:#6B7280;font-style:italic">No executive updates yet.</div>`;

  // ── External Team ────────────────────────────────────────────────────────────
  const externalTeam = project.externalTeam ?? [];
  const extTeamBody = externalTeam.length === 0
    ? `<div style="font-size:12.5px;color:#6B7280;padding:6px 0">No external team members added.</div>`
    : externalTeam.map((m, i) => {
        const ini = m.name.split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
        return `
          <div style="display:flex;align-items:center;gap:9px;padding:6px 0;border-bottom:0.5px solid #F3F4F6">
            ${avatar(ini, i)}
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;font-weight:500;color:#374151">${esc(m.name)}</div>
              <div style="font-size:11px;color:#6B7280;margin-top:1px">${[m.role, m.company].filter(Boolean).map(esc).join(" · ")}</div>
            </div>
          </div>`;
      }).join("");
  const extTeamHtml = `
    <details style="margin-bottom:20px;border:0.5px solid #E7E9ED;border-radius:8px;overflow:hidden">
      <summary style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#EEF0F3;cursor:pointer;list-style:none;user-select:none">
        <span style="display:inline-block;font-size:9px;color:#6B7280;flex-shrink:0;transition:transform .18s" class="ext-chev">▶</span>
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280">External Team</span>
        <div style="margin-left:auto;display:flex;align-items:center;gap:6px">
          ${externalTeam.length > 0 ? `<span style="font-size:10px;color:#6B7280">${externalTeam.length}</span>` : ""}
          ${feedbackPill(project.title, "External Team", feedbackEmail)}
        </div>
      </summary>
      <div style="padding:4px 12px 4px">${extTeamBody}</div>
    </details>`;

  // ── Stakeholders ────────────────────────────────────────────────────────────
  const SAT_ORDER: Record<string, number> = { dissatisfied: 0, neutral: 1, satisfied: 2, delighted: 3 };
  const stakeholders = [...(project.stakeholders ?? [])].sort((a, b) =>
    (SAT_ORDER[a.satisfaction] ?? 1) - (SAT_ORDER[b.satisfaction] ?? 1)
  );
  const SAT_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
    dissatisfied: { icon: "😟", label: "Dissatisfied", color: "#A32D2D", bg: "#FCEBEB" },
    neutral:  { icon: "😐", label: "Neutral",  color: "#5F5E5A", bg: "#F1EFE8" },
    satisfied:{ icon: "🙂", label: "Satisfied", color: "#3B6D11", bg: "#EAF3DE" },
    delighted:{ icon: "😄", label: "Delighted",color: "#085041", bg: "#E1F5EE" },
  };
  const stakeholdersHtml = stakeholders.length === 0
    ? `<div style="font-size:12.5px;color:#6B7280;padding:6px 0">No stakeholders added.</div>`
    : stakeholders.map((s) => {
        const sat = SAT_META[s.satisfaction] ?? SAT_META.neutral;
        return `
        <div style="display:flex;flex-direction:column;gap:2px;padding:6px 0;border-bottom:0.5px solid #F3F4F6">
          <div style="display:flex;align-items:center;gap:6px;min-width:0">
            <div style="font-size:12.5px;font-weight:500;color:#374151;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.name)}</div>
            <span style="display:inline-flex;align-items:center;gap:4px;border:1.5px solid ${sat.color};border-radius:20px;background:${sat.bg};padding:2px 8px 2px 5px;flex-shrink:0">
              <span style="font-size:12px;line-height:1">${sat.icon}</span>
              <span style="font-size:11px;font-weight:500;color:${sat.color}">${sat.label}</span>
            </span>
          </div>
          ${s.role ? `<div style="font-size:11px;color:#6B7280">${esc(s.role)}</div>` : ""}
        </div>`;
      }).join("");

  // ── Resources ───────────────────────────────────────────────────────────────
  const resources = project.resources ?? [];
  const resourcesHtml = resources.length === 0
    ? `<div style="font-size:12.5px;color:#6B7280">No resources added.</div>`
    : `<div style="border:0.5px solid #E7E9ED;border-radius:8px;padding:8px 12px">
        ${resources.map((r) => `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 0">
            <span style="font-size:13px;color:#6B7280">↗</span>
            <a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" style="font-size:12.5px;color:#185FA5;font-weight:500;text-decoration:none">${esc(r.label)}</a>
          </div>`).join("")}
      </div>`;

  // ── Meeting Agendas ─────────────────────────────────────────────────────────
  const sortedAgendas = [...(project.agendas ?? [])].sort((a, b) => {
    const da = toDateInputValue(a.date), db = toDateInputValue(b.date);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db.localeCompare(da);
  });
  const fmtADate = (str: string) => {
    if (!str) return "";
    const iso = toDateInputValue(str);
    if (!iso) return str;
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) return str;
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const agendasHtml = sortedAgendas.length === 0 ? "" : `
    <details style="border-top:0.5px solid #E7E9ED">
      <summary style="display:flex;align-items:center;gap:8px;padding:14px 32px;cursor:pointer;list-style:none;user-select:none;background:#FAFBFC">
        <span class="ag-chev" style="display:inline-block;font-size:9px;color:#6B7280">▶</span>
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6B7280">Meeting Agendas</span>
        <span style="font-size:11px;color:#6B7280;margin-left:2px">(${sortedAgendas.length})</span>
        <div style="margin-left:auto">${feedbackPill(project.title, "Meeting Agendas", feedbackEmail)}</div>
      </summary>
      <div style="padding:16px 32px 24px;display:flex;flex-direction:column;gap:8px">
        ${sortedAgendas.map((ag) => {
          const attsHtml = ag.attendees.map((att, idx) => {
            const name = att.kind === "internal"
              ? (contacts.find((c) => c.id === att.id)?.name ?? "")
              : ((project.externalTeam ?? []).find((e) => e.id === att.id)?.name ?? "");
            if (!name) return "";
            const ini = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
            return `<span title="${esc(name)}">${avatar(ini, idx)}</span>`;
          }).join("");
          const itemsHtml = ag.items.length === 0 ? "" : ag.items.map((it) => `
                <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
                  <div style="width:13px;height:13px;border:1.5px solid #9CA3AF;border-radius:3px;flex-shrink:0"></div>
                  <span style="font-size:12.5px;color:#374151">${esc(it.text)}</span>
                </div>`).join("");
          const notesHtml = ag.notes ? `
            <div style="border-top:0.5px solid #E7E9ED;margin-top:8px;padding-top:8px">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;margin-bottom:5px">Meeting Notes</div>
              <p style="font-size:12.5px;color:#374151;line-height:1.6;white-space:pre-wrap">${esc(ag.notes)}</p>
            </div>` : "";
          const resourcesHtml = (ag.resources ?? []).length === 0 ? "" : `
            <div style="border-top:0.5px solid #E7E9ED;margin-top:8px;padding-top:8px;display:flex;flex-direction:column;gap:5px">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6B7280">Links</div>
              ${(ag.resources ?? []).map((r) => `
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="color:#4F8EF7;font-size:11px">🔗</span>
                  <a href="${esc(r.url)}" target="_blank" style="font-size:12px;color:#4F8EF7;text-decoration:none">${esc(r.label)}</a>
                </div>`).join("")}
            </div>`;
          return `
            <details style="border:0.5px solid #E7E9ED;border-radius:8px;overflow:hidden">
              <summary style="display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;list-style:none;user-select:none;background:#FAFBFC">
                <span style="font-size:9px;color:#6B7280">▶</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span style="font-size:13px;font-weight:500;color:#1A1D23;flex:1">${esc(ag.title)}</span>
                ${ag.date ? `<span style="font-size:11.5px;color:#6B7280">${fmtADate(ag.date)}</span>` : ""}
                ${attsHtml ? `<div style="display:flex;gap:3px">${attsHtml}</div>` : ""}
              </summary>
              <div style="padding:10px 14px 12px">
                ${itemsHtml}
                ${notesHtml}
                ${resourcesHtml}
              </div>
            </details>`;
        }).join("")}
      </div>
    </details>`;

  // ── Full document ───────────────────────────────────────────────────────────
  const timelineVal = project.start && project.due !== "No date"
    ? `${esc(project.start)} → ${esc(project.due)}`
    : project.due !== "No date" ? esc(project.due) : "—";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(project.title)} — Project Report</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#F8F9FB;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;font-size:13px;color:#1A1D23;line-height:1.6;padding:32px 20px}
    @media print{body{background:#fff;padding:0}.doc{border:none;border-radius:0}}
    details>summary{list-style:none;cursor:pointer}
    details>summary::-webkit-details-marker{display:none}
    .ms-chev{display:inline-block;font-size:9px;color:#6B7280;flex-shrink:0;transition:transform .18s;transform:rotate(90deg)}
    details:not([open])>.ms-summary .ms-chev{transform:rotate(0deg)}
    .ext-chev{transform:rotate(0deg)}
    details[open]>summary .ext-chev{transform:rotate(90deg)}
    .ag-chev{transform:rotate(0deg)}
    details[open]>summary .ag-chev{transform:rotate(90deg)}
  </style>
</head>
<body>
<div class="doc" style="background:#fff;max-width:1100px;margin:0 auto;border:0.5px solid #E2E5EA;border-radius:12px;overflow:hidden">

  <div style="padding:28px 32px 24px;border-bottom:0.5px solid #E7E9ED;display:flex;justify-content:space-between;align-items:flex-start;gap:20px">
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
        ${project.clientLogo ? `<img src="${project.clientLogo}" style="width:44px;height:44px;border-radius:8px;object-fit:contain;background:#F3F4F6;padding:4px;flex-shrink:0" alt="">` : ""}
        <div style="font-size:24px;font-weight:500;letter-spacing:-0.02em;flex:1;color:#1A1D23">${esc(project.title)}</div>
        ${statusBadge(project.status)}
      </div>
      <div style="font-size:13.5px;color:#6B7280;line-height:1.6;margin-bottom:14px">${esc(project.desc)}</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:12px;color:#6B7280">
        <span><strong style="color:#4A4F58;font-weight:500">Owner</strong>&nbsp;${esc(project.owner)}</span>
        ${project.due !== "No date" ? `<span><strong style="color:#4A4F58;font-weight:500">${project.start ? "Timeline" : "Due"}</strong>&nbsp;${timelineVal}</span>` : ""}
        <span><strong style="color:#4A4F58;font-weight:500">Progress</strong>&nbsp;${doneSubs} / ${totalSubs} tasks complete</span>
        <span><strong style="color:#4A4F58;font-weight:500">Exported</strong>&nbsp;${exportDate}</span>
      </div>
    </div>
    <div style="flex-shrink:0;padding-top:6px">${dialSvg}</div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 2fr;border-bottom:0.5px solid #E7E9ED">
    <div style="padding:12px 16px;border-right:0.5px solid #E7E9ED">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280;margin-bottom:5px">RAG status</div>
      <div style="font-size:15px;font-weight:500;color:#1A1D23">${ragDot(project.risk)}${ragLabel}</div>
      ${project.riskNote ? `<div style="font-size:11.5px;color:#6B7280;margin-top:2px">${esc(project.riskNote)}</div>` : ""}
    </div>
    <div style="padding:12px 16px;border-right:0.5px solid #E7E9ED">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280;margin-bottom:8px">Timeline</div>
      ${project.start ? `
      <div style="margin-bottom:5px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6B7280">Start</div>
        <div style="font-size:13px;font-weight:500;color:#1A1D23">${esc(project.start)}</div>
      </div>` : ""}
      <div style="margin-bottom:4px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6B7280">Due</div>
        <div style="font-size:13px;font-weight:500;color:#1A1D23">${project.due !== "No date" ? esc(project.due) : "—"}</div>
      </div>
      <div style="font-size:11px;color:#6B7280">${daysRemaining(project.due)}</div>
    </div>
    <div style="padding:12px 16px;border-right:0.5px solid #E7E9ED">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280;margin-bottom:8px">Budget</div>
      ${([ ["Total Budget", project.budget], ["Actual Cost", project.budgetSpent] ] as [string, string | undefined][]).map(([sub, val]) => `
        <div style="margin-bottom:5px">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6B7280">${sub}</div>
          <div style="font-size:13px;font-weight:500;color:#1A1D23">${formatBudget(val)}</div>
        </div>`).join("")}
      ${(() => { const r = remainingBudget(project.budget, project.budgetSpent); return `
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6B7280">Remaining</div>
          <div style="font-size:13px;font-weight:600;color:${r.color}">${r.fmt}</div>
        </div>`; })()}
    </div>
    <div style="padding:12px 16px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6366F1;margin-bottom:5px">Executive Update</div>
      ${execUpdateHtml}
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1.4fr 1fr">
    <div style="padding:24px 28px;border-right:0.5px solid #E7E9ED">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280">Milestones</div>${feedbackPill(project.title, "Milestones", feedbackEmail)}</div>
      ${milestonesHtml}
      <div style="display:flex;align-items:center;justify-content:space-between;margin:24px 0 10px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280">Risk register</div>${feedbackPill(project.title, "Risk register", feedbackEmail)}</div>
      <div style="border:0.5px solid #E7E9ED;border-radius:8px;padding:8px 12px">${risksHtml}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin:24px 0 10px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280">Issue Tracker</div>${feedbackPill(project.title, "Issue Tracker", feedbackEmail)}</div>
      <div style="border:0.5px solid #E7E9ED;border-radius:8px;padding:8px 12px">${issuesHtml}</div>
    </div>
    <div style="padding:24px 24px">
      <details style="margin-bottom:20px;border:0.5px solid #E7E9ED;border-radius:8px;overflow:hidden">
        <summary class="ms-summary" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#EEF0F3;cursor:pointer;list-style:none;user-select:none">
          <span class="ms-chev">▶</span>
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280">Internal Team</span>
          <div style="margin-left:auto">${feedbackPill(project.title, "Internal Team", feedbackEmail)}</div>
        </summary>
        <div style="padding:4px 12px 4px">${teamHtml}</div>
      </details>
      ${extTeamHtml}
      <details style="margin-bottom:20px;border:0.5px solid #E7E9ED;border-radius:8px;overflow:hidden">
        <summary class="ms-summary" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#EEF0F3;cursor:pointer;list-style:none;user-select:none">
          <span class="ms-chev">▶</span>
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280">Stakeholders</span>
          <div style="margin-left:auto;display:flex;align-items:center;gap:6px">
            ${stakeholders.length > 0 ? `<span style="font-size:10px;color:#6B7280">${stakeholders.length}</span>` : ""}
            ${feedbackPill(project.title, "Stakeholders", feedbackEmail)}
          </div>
        </summary>
        <div style="padding:4px 12px 4px">${stakeholdersHtml}</div>
      </details>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280">Resources</div>${feedbackPill(project.title, "Resources", feedbackEmail)}</div>
      <div style="margin-bottom:20px">${resourcesHtml}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6B7280">Status updates</div>${feedbackPill(project.title, "Status updates", feedbackEmail)}</div>
      ${updatesHtml}
    </div>
  </div>

  ${agendasHtml}
  <div style="border-top:0.5px solid #E7E9ED;padding:12px 32px;display:flex;align-items:center;justify-content:space-between;background:#FAFBFC">
    <div style="font-size:11px;color:#6B7280">Generated ${exportDate} · ${esc(project.title)}</div>
    <div style="font-size:11px;font-weight:600;color:#9CA3AF;letter-spacing:.02em">MakeItHappen</div>
  </div>

</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]/g, "")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportProjectPdf(project: Project, contacts: Contact[]): void {
  const totalSubs = project.milestones.reduce((a, m) => a + m.subtasks.length, 0);
  const doneSubs  = project.milestones.reduce((a, m) => a + m.subtasks.filter((s) => s.done).length, 0);
  const exportDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const ragLabel = project.risk ? { green: "Green", amber: "Amber", red: "Red" }[project.risk] : "Not set";
  const timelineVal = project.start && project.due !== "No date"
    ? `${esc(project.start)} → ${esc(project.due)}`
    : project.due !== "No date" ? esc(project.due) : "—";

  const sortedMilestones = [...project.milestones].sort((a, b) => {
    const da = toDateInputValue(a.due);
    const db = toDateInputValue(b.due);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  });

  const msHtml = sortedMilestones.length === 0
    ? `<div style="font-size:10px;color:#6B7280">No milestones.</div>`
    : sortedMilestones.map((m) => {
        const dot = m.status === "active" ? "#4F6BED" : m.status === "waiting" ? "#8B5CF6" : "#F59E0B";
        const pdfStatusDot = m.status === "complete"
          ? `<span style="font-size:11px;line-height:1;flex-shrink:0;align-self:flex-start;margin-top:2px">✅</span>`
          : `<div style="width:7px;height:7px;border-radius:50%;background:${dot};flex-shrink:0;align-self:flex-start;margin-top:3px"></div>`;
        return `<div style="display:flex;align-items:center;gap:7px;padding:5px 8px;border-radius:5px;background:#F9FAFB;border:0.5px solid #F0F1F3;margin-bottom:4px">
          ${pdfStatusDot}
          <div style="flex:1;min-width:0">
            <div style="font-size:10.5px;font-weight:500;color:#1A1D23">${esc(m.title)}</div>
            ${m.desc ? `<div style="font-size:9.5px;color:#6B7280;margin-top:1px">${esc(m.desc)}</div>` : ""}
          </div>
          ${m.due && m.due !== "No date" ? `<span style="font-size:9.5px;color:#6B7280;white-space:nowrap">${esc(m.due)}</span>` : ""}
          ${statusBadge(m.status)}
        </div>`;
      }).join("");

  const execUpdate = project.updates.find((u) => u.type === "executive") ?? null;
  const execHtml = execUpdate
    ? `<div style="padding:9px 11px;background:#F9FAFB;border:0.5px solid #F0F1F3;border-radius:6px">
        <div style="font-size:10.5px;color:#374151;line-height:1.5">${esc(execUpdate.text)}</div>
        <div style="font-size:9.5px;color:#6B7280;margin-top:5px">${esc(execUpdate.when)}</div>
       </div>`
    : `<div style="font-size:10px;color:#6B7280;font-style:italic">No executive update yet.</div>`;

  const members = project.members ?? [];
  const teamHtml = members.length === 0
    ? `<div style="font-size:10px;color:#6B7280">No members added.</div>`
    : members.map((mem, i) => {
        const c = contacts.find((x) => x.id === mem.contactId);
        if (!c) return "";
        const ini = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
        const [bg, color] = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
        return `<div style="display:flex;align-items:center;gap:7px;padding:4px 0;border-bottom:0.5px solid #F3F4F6">
          <div style="width:20px;height:20px;border-radius:50%;background:${bg};color:${color};font-size:8px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0">${ini}</div>
          <div style="font-size:10.5px;font-weight:500;color:#374151;flex:1">${esc(c.name)}</div>
          ${mem.role ? `<div style="font-size:9.5px;color:#6B7280">${esc(mem.role)}</div>` : ""}
        </div>`;
      }).join("");

  const resources = project.resources ?? [];
  const resHtml = resources.length === 0 ? "" : resources.map((r) =>
    `<div style="display:flex;align-items:center;gap:6px;padding:3px 0">
      <span style="font-size:10px;color:#6B7280">↗</span>
      <span style="font-size:10.5px;color:#185FA5">${esc(r.label)}</span>
    </div>`
  ).join("");

  const externalTeam = project.externalTeam ?? [];
  const extTeamPdf = externalTeam.length === 0 ? "" : `
    <details style="margin-top:6px;border:0.5px solid #E7E9ED;border-radius:6px;overflow:hidden">
      <summary style="display:flex;align-items:center;gap:6px;padding:5px 9px;background:#F3F4F6;cursor:pointer;list-style:none;user-select:none">
        <span style="font-size:8px;color:#6B7280">▶</span>
        <span style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6B7280">External Team (${externalTeam.length})</span>
      </summary>
      <div style="padding:2px 9px 4px">
        ${externalTeam.map((m, i) => {
          const ini = m.name.split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
          const [bg, color] = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
          return `<div style="display:flex;align-items:center;gap:7px;padding:4px 0;border-bottom:0.5px solid #F3F4F6">
            <div style="width:18px;height:18px;border-radius:50%;background:${bg};color:${color};font-size:7px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0">${ini}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:10px;font-weight:500;color:#374151">${esc(m.name)}</div>
              <div style="font-size:8.5px;color:#6B7280">${[m.role, m.company].filter(Boolean).map(esc).join(" · ")}</div>
            </div>
          </div>`;
        }).join("")}
      </div>
    </details>`;

  const budgetRemaining = remainingBudget(project.budget, project.budgetSpent);
  const progPct = Math.round((doneSubs / Math.max(totalSubs, 1)) * 100);

  const pdf = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(project.title)} — Project Report</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4 landscape;margin:11mm 14mm}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;font-size:10px;color:#1A1D23;line-height:1.4;background:#fff}
  .page{display:flex;flex-direction:column;min-height:calc(297mm - 22mm)}
  .header{display:flex;align-items:center;gap:12px;padding-bottom:10px;border-bottom:0.5px solid #E7E9ED}
  .kpi-strip{display:flex;border-bottom:0.5px solid #E7E9ED;background:#F9FAFB}
  .kpi{flex:1;padding:7px 12px;border-right:0.5px solid #E7E9ED}
  .kpi:last-child{border-right:none}
  .kpi-label{font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6B7280;margin-bottom:2px}
  .kpi-val{font-size:11px;font-weight:500;color:#1A1D23}
  .body{display:grid;grid-template-columns:55% 45%;flex:1;border-bottom:0.5px solid #E7E9ED}
  .col{padding:11px 13px}
  .col-left{border-right:0.5px solid #E7E9ED}
  .sec{font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;margin-bottom:6px;margin-top:12px}
  .sec:first-child{margin-top:0}
  .footer{display:flex;align-items:center;justify-content:space-between;padding:5px 0}
  .prog-track{height:4px;background:#E5E7EB;border-radius:99px;overflow:hidden;display:inline-block;width:48px;vertical-align:middle;margin:0 4px}
  .prog-fill{height:100%;background:#4F6BED;border-radius:99px}
</style>
</head>
<body>
<div class="page">

  <div class="header">
    ${project.clientLogo ? `<img src="${project.clientLogo}" style="width:34px;height:34px;border-radius:5px;object-fit:contain;background:#F3F4F6;padding:3px;flex-shrink:0" alt="">` : ""}
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="font-size:16px;font-weight:500;color:#1A1D23;letter-spacing:-0.02em">${esc(project.title)}</div>
        ${statusBadge(project.status)}
      </div>
      <div style="font-size:10px;color:#6B7280;margin-top:2px">${esc(project.desc)}</div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div style="font-size:8.5px;color:#6B7280">Exported ${exportDate}</div>
      <div style="font-size:8.5px;color:#6B7280;margin-top:1px">MakeItHappen</div>
    </div>
  </div>

  <div class="kpi-strip">
    <div class="kpi"><div class="kpi-label">Owner</div><div class="kpi-val">${esc(project.owner)}</div></div>
    <div class="kpi"><div class="kpi-label">Timeline</div><div class="kpi-val">${timelineVal}</div></div>
    <div class="kpi">
      <div class="kpi-label">Progress</div>
      <div class="kpi-val">${progPct}%<span class="prog-track"><span class="prog-fill" style="width:${progPct}%"></span></span>${doneSubs}/${totalSubs} tasks</div>
    </div>
    <div class="kpi"><div class="kpi-label">Budget</div><div class="kpi-val">${formatBudget(project.budget)}<span style="font-size:9px;color:#6B7280;margin-left:6px">total</span> · <span style="color:${budgetRemaining.color}">${budgetRemaining.fmt}</span><span style="font-size:9px;color:#6B7280;margin-left:4px">remaining</span></div></div>
    <div class="kpi"><div class="kpi-label">RAG status</div><div class="kpi-val">${ragDot(project.risk)}${ragLabel}</div></div>
  </div>

  <div class="body">
    <div class="col col-left">
      <div class="sec">Milestones</div>
      ${msHtml}
      ${project.riskNote ? `<div class="sec">Risk note</div><div style="font-size:10.5px;color:#374151;line-height:1.5;padding:7px 10px;background:#FEF3F2;border-radius:5px;border:0.5px solid #FEE2E2">${esc(project.riskNote)}</div>` : ""}
    </div>
    <div class="col">
      <div class="sec">Executive update</div>
      ${execHtml}
      ${members.length > 0 ? `<div class="sec">Internal Team</div><div>${teamHtml}</div>` : ""}
      ${externalTeam.length > 0 ? `<div class="sec">External Team</div>${extTeamPdf}` : ""}
      ${resources.length > 0 ? `<div class="sec">Resources</div>${resHtml}` : ""}
    </div>
  </div>

  <div class="footer">
    <div style="font-size:8.5px;color:#6B7280">${esc(project.title)} · ${exportDate}</div>
    <div style="font-size:8.5px;font-weight:600;color:#9CA3AF;letter-spacing:.03em">Confidential</div>
  </div>

</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},300)});</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Allow pop-ups to export PDF."); return; }
  win.document.write(pdf);
  win.document.close();
}

// ── Agenda HTML export ───────────────────────────────────────────────────────

export function exportAgendaHtml(project: Project, agenda: MeetingAgenda, contacts: Contact[], feedbackEmail = ""): void {
  // Dates are stored in display format ("Jun 20, 2026") by DateInput — normalize to ISO first
  const dateIso = toDateInputValue(agenda.date) || new Date().toISOString().slice(0, 10);

  const fmtDate = (iso: string) => {
    if (!iso) return "";
    const normalized = toDateInputValue(iso) || iso;
    const [y, m, d] = normalized.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) return iso;
    return dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const resolvedAttendees = agenda.attendees.flatMap((att, i) => {
    const name = att.kind === "internal"
      ? (contacts.find((c) => c.id === att.id)?.name ?? "")
      : ((project.externalTeam ?? []).find((e) => e.id === att.id)?.name ?? "");
    if (!name) return [];
    const ini = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    return [{ name, ini, i }];
  });

  const attendeesHtml = resolvedAttendees.length === 0 ? "" : `
    <div style="display:flex;align-items:center;gap:10px;margin-top:18px;flex-wrap:wrap">
      ${resolvedAttendees.map((a) => `
        <div style="display:flex;align-items:center;gap:6px">
          ${avatar(a.ini, a.i)}
          <span style="font-size:13px;color:#4B5563">${esc(a.name)}</span>
        </div>`).join(`<span style="color:#9CA3AF;font-size:12px">·</span>`)}
    </div>`;

  const itemsHtml = agenda.items.length === 0
    ? `<p style="color:#6B7280;font-style:italic;padding:24px 0">No agenda items added.</p>`
    : agenda.items.map((item, idx) => `
        <div style="display:flex;align-items:flex-start;gap:16px;padding:22px 0;border-bottom:0.5px solid #E7E9ED">
          <span style="font-size:18px;font-weight:400;color:#9CA3AF;min-width:28px;text-align:right;flex-shrink:0;padding-top:2px">${idx + 1}.</span>
          <div>
            <h2 style="font-size:20px;font-weight:500;color:#1A1D23;letter-spacing:-0.01em;line-height:1.3">${esc(item.text)}</h2>
            ${item.detail ? `<p style="font-size:14px;color:#6B7280;margin:8px 0 0;line-height:1.55;white-space:pre-wrap">${esc(item.detail)}</p>` : ""}
          </div>
        </div>`).join("");

  const mailSubject = encodeURIComponent(`Additional Topic – ${agenda.title}`);
  const agendaLines = agenda.items.length > 0
    ? `\n\nCurrent agenda:\n${agenda.items.map((item, i) => `${i + 1}. ${item.text}`).join("\n")}`
    : "";
  const mailBody = encodeURIComponent(`Meeting: ${agenda.title}\nDate: ${fmtDate(dateIso)}\nProject: ${project.title}${agendaLines}\n\nProposed additional topic:\n`);
  const mailto = feedbackEmail ? `mailto:${feedbackEmail}?subject=${mailSubject}&body=${mailBody}` : "#";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(agenda.title)} — Agenda</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#F8F9FB;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;font-size:13px;color:#1A1D23;line-height:1.6;padding:32px 20px}
    @media print{body{background:#fff;padding:0}.doc{border:none;border-radius:0}.cta{display:none}}
  </style>
</head>
<body>
<div class="doc" style="background:#fff;max-width:760px;margin:0 auto;border:0.5px solid #E2E5EA;border-radius:12px;overflow:hidden">

  <div style="padding:36px 44px 32px;border-bottom:0.5px solid #E7E9ED">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      ${project.clientLogo ? `<img src="${esc(project.clientLogo)}" style="width:44px;height:44px;border-radius:8px;object-fit:contain;background:#F3F4F6;padding:4px;flex-shrink:0" alt="">` : ""}
      <div style="font-size:22px;font-weight:600;color:#1A1D23;letter-spacing:-0.02em">${project.webUrl ? `<a href="${esc(project.webUrl)}" target="_blank" style="color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:6px">${esc(project.title)}<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>` : esc(project.title)}</div>
    </div>
    <h1 style="font-size:40px;font-weight:600;letter-spacing:-0.03em;color:#1A1D23;line-height:1.05">Agenda</h1>
    <div style="font-size:16px;font-weight:500;color:#374151;margin-top:10px">
      ${esc(agenda.title)}${agenda.date ? `<span style="font-weight:400;color:#6B7280;margin-left:10px">${fmtDate(dateIso)}</span>` : ""}
    </div>
    ${attendeesHtml}
  </div>

  <div style="padding:0 44px">
    ${itemsHtml}
  </div>

  ${agenda.notes ? `
  <div style="padding:28px 44px 24px;border-top:0.5px solid #E7E9ED">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;margin-bottom:10px">Meeting Notes</div>
    <p style="font-size:14px;color:#374151;line-height:1.65;white-space:pre-wrap">${esc(agenda.notes)}</p>
  </div>` : ""}

  ${(agenda.resources ?? []).length > 0 ? `
  <div style="padding:20px 44px 24px;border-top:0.5px solid #E7E9ED">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;margin-bottom:10px">Resources</div>
    <div style="display:flex;flex-direction:column;gap:7px">
      ${(agenda.resources ?? []).map((r) => `
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#4F8EF7;font-size:12px">🔗</span>
          <a href="${esc(r.url)}" target="_blank" style="font-size:13px;color:#4F8EF7;text-decoration:none">${esc(r.label)}</a>
        </div>`).join("")}
    </div>
  </div>` : ""}

  ${feedbackEmail ? `<div class="cta" style="margin-top:8px;padding:28px 44px 36px;text-align:center;border-top:0.5px solid #E7E9ED;background:#FAFBFC">
    <div style="font-size:14px;color:#6B7280;margin-bottom:16px">Have a topic you'd like to add to this agenda?</div>
    <a href="${mailto}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:11px 28px;background:#4F6BED;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.01em">Suggest a Topic →</a>
  </div>` : ""}

  <div style="border-top:0.5px solid #E7E9ED;padding:10px 44px;display:flex;align-items:center;justify-content:space-between;background:#FAFBFC">
    <div style="font-size:11px;color:#6B7280">${esc(project.title)} · ${esc(agenda.title)}</div>
    <div style="font-size:11px;font-weight:600;color:#9CA3AF;letter-spacing:.02em">MakeItHappen</div>
  </div>

</div>
</body>
</html>`;

  const sanitize = (s: string) => s.replace(/[/\\:*?"<>|]/g, "").trim();
  const filename = `${dateIso}_${sanitize(project.title)}_${sanitize(agenda.title)}.html`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
