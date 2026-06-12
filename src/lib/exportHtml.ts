import type { Contact, Project } from "./types";

function esc(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function statusBadge(status: string): string {
  const map: Record<string, [string, string, string]> = {
    active:   ["#E6F1FB", "#185FA5", "Active"],
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

function daysRemaining(due: string): string {
  if (!due || due === "No date") return "";
  const d = new Date(due);
  if (isNaN(d.getTime())) return "";
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

export function exportProjectHtml(project: Project, contacts: Contact[]): void {
  const totalSubs = project.milestones.reduce((a, m) => a + m.subtasks.length, 0);
  const doneSubs  = project.milestones.reduce((a, m) => a + m.subtasks.filter((s) => s.done).length, 0);
  const exportDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const ragLabel = project.risk ? { green: "Green", amber: "Amber", red: "Red" }[project.risk] : "Not set";

  // ── Milestones ─────────────────────────────────────────────────────────────
  const milestonesHtml = project.milestones.length === 0
    ? `<div style="font-size:12.5px;color:#9CA3AF">No milestones yet.</div>`
    : project.milestones.map((m) => {
        const dotColor = m.status === "complete" ? "#10B981" : m.status === "active" ? "#4F6BED" : "#B4BAC4";
        const subtasksHtml = m.subtasks.length === 0 ? "" : `
          <div style="padding:6px 14px 8px">
            ${m.subtasks.map((s) => `
              <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:0.5px solid #F3F4F6">
                <div style="width:14px;height:14px;border-radius:50%;${s.done ? "background:#10B981;border:1.5px solid #10B981;display:flex;align-items:center;justify-content:center" : "border:1.5px solid #D1D5DB"};flex-shrink:0">
                  ${s.done ? `<span style="color:white;font-size:9px;font-weight:700">✓</span>` : ""}
                </div>
                <span style="font-size:12.5px;color:${s.done ? "#9CA3AF" : "#374151"};flex:1">${esc(s.t)}</span>
                ${s.due ? `<span style="font-size:11px;color:#9CA3AF">${esc(s.due)}</span>` : ""}
                <span style="font-size:10.5px;color:#9CA3AF">${esc(s.who)}</span>
              </div>
            `).join("")}
          </div>`;
        return `
          <details open style="border:0.5px solid #E7E9ED;border-radius:8px;margin-bottom:10px;overflow:hidden">
            <summary class="ms-summary" style="display:flex;align-items:center;gap:9px;padding:10px 14px;background:#EEF0F3;user-select:none">
              <span class="ms-chev">▶</span>
              <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0"></div>
              <div style="font-size:13px;font-weight:500;flex:1;color:#1A1D23">${esc(m.title)}</div>
              ${m.due && m.due !== "No date" ? `<span style="font-size:11px;color:#8A909B">${esc(m.due)}</span>` : ""}
              ${statusBadge(m.status)}
            </summary>
            ${subtasksHtml}
          </details>`;
      }).join("");

  // ── Risk register ───────────────────────────────────────────────────────────
  const risks = project.risks ?? [];
  const risksHtml = risks.length === 0
    ? `<div style="font-size:12.5px;color:#9CA3AF">No risks logged.</div>`
    : risks.map((r) => {
        const sev = SEV_MATRIX[r.probability]?.[r.impact] ?? "low";
        const [sevBg, sevColor] = SEV_STYLE[sev] ?? ["#F3F4F6", "#6B7280"];
        const statusColor = { open: "#DC2626", mitigated: "#B45309", closed: "#059669" }[r.status] ?? "#6B7280";
        return `
          <div style="display:flex;gap:10px;padding:7px 0;border-bottom:0.5px solid #F3F4F6;align-items:flex-start">
            <span style="font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:99px;background:${sevBg};color:${sevColor};white-space:nowrap;flex-shrink:0;text-transform:capitalize">${sev}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:12.5px;color:#374151">${esc(r.description)}</div>
              ${r.mitigation ? `<div style="font-size:11.5px;color:#9CA3AF;margin-top:2px">↳ ${esc(r.mitigation)}</div>` : ""}
            </div>
            <span style="font-size:10.5px;color:${statusColor};text-transform:capitalize;flex-shrink:0">${r.status}</span>
          </div>`;
      }).join("");

  // ── Team ────────────────────────────────────────────────────────────────────
  const members = project.members ?? [];
  const teamHtml = members.length === 0
    ? `<div style="font-size:12.5px;color:#9CA3AF;padding:6px 0">No team members added.</div>`
    : members.map((mem, i) => {
        const contact = contacts.find((c) => c.id === mem.contactId);
        if (!contact) return "";
        const initials = contact.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
        return `
          <div style="display:flex;align-items:center;gap:9px;padding:6px 0;border-bottom:0.5px solid #F3F4F6">
            ${avatar(initials, i)}
            <div style="font-size:12.5px;font-weight:500;color:#374151;flex:1">${esc(contact.name)}</div>
            ${mem.role ? `<div style="font-size:11.5px;color:#9CA3AF">${esc(mem.role)}</div>` : ""}
          </div>`;
      }).join("");

  // ── Status updates ──────────────────────────────────────────────────────────
  const updatesHtml = project.updates.length === 0
    ? `<div style="font-size:12.5px;color:#9CA3AF">No updates yet.</div>`
    : project.updates.map((u, i) => `
        <div style="padding:10px 14px;border:0.5px solid #E7E9ED;border-radius:8px;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            ${avatar(u.who, i)}
            <span style="font-size:12px;font-weight:500;color:#374151">${esc(u.who)}</span>
            <span style="font-size:11px;color:#9CA3AF;margin-left:auto">${esc(u.when)}</span>
          </div>
          <div style="font-size:12.5px;color:#4B5563;line-height:1.55">${esc(u.text)}</div>
        </div>`).join("");

  // ── Resources ───────────────────────────────────────────────────────────────
  const resources = project.resources ?? [];
  const resourcesHtml = resources.length === 0
    ? `<div style="font-size:12.5px;color:#9CA3AF">No resources added.</div>`
    : `<div style="border:0.5px solid #E7E9ED;border-radius:8px;padding:8px 12px">
        ${resources.map((r) => `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 0">
            <span style="font-size:13px;color:#9CA3AF">↗</span>
            <a href="${esc(r.url)}" style="font-size:12.5px;color:#185FA5;font-weight:500;text-decoration:none">${esc(r.label)}</a>
          </div>`).join("")}
      </div>`;

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
    .ms-chev{display:inline-block;font-size:9px;color:#B4BAC4;flex-shrink:0;transition:transform .18s;transform:rotate(90deg)}
    details:not([open])>.ms-summary .ms-chev{transform:rotate(0deg)}
  </style>
</head>
<body>
<div class="doc" style="background:#fff;max-width:900px;margin:0 auto;border:0.5px solid #E2E5EA;border-radius:12px;overflow:hidden">

  <div style="padding:28px 32px 24px;border-bottom:0.5px solid #E7E9ED">
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
      <div style="font-size:24px;font-weight:500;letter-spacing:-0.02em;flex:1;color:#1A1D23">${esc(project.title)}</div>
      ${statusBadge(project.status)}
    </div>
    <div style="font-size:13.5px;color:#6B7280;line-height:1.6;margin-bottom:14px;max-width:620px">${esc(project.desc)}</div>
    <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:12px;color:#8A909B">
      <span><strong style="color:#4A4F58;font-weight:500">Owner</strong>&nbsp;${esc(project.owner)}</span>
      ${project.due !== "No date" ? `<span><strong style="color:#4A4F58;font-weight:500">${project.start ? "Timeline" : "Due"}</strong>&nbsp;${timelineVal}</span>` : ""}
      <span><strong style="color:#4A4F58;font-weight:500">Progress</strong>&nbsp;${doneSubs} / ${totalSubs} tasks complete</span>
      <span><strong style="color:#4A4F58;font-weight:500">Exported</strong>&nbsp;${exportDate}</span>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(3,1fr);border-bottom:0.5px solid #E7E9ED">
    <div style="padding:16px 24px;border-right:0.5px solid #E7E9ED">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#B4BAC4;margin-bottom:5px">Timeline</div>
      <div style="font-size:15px;font-weight:500;color:#1A1D23">${timelineVal}</div>
      <div style="font-size:11.5px;color:#8A909B;margin-top:2px">${daysRemaining(project.due)}</div>
    </div>
    <div style="padding:16px 24px;border-right:0.5px solid #E7E9ED">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#B4BAC4;margin-bottom:5px">Budget</div>
      <div style="font-size:15px;font-weight:500;color:#1A1D23">${project.budget ? esc(project.budget) : "—"}</div>
      ${project.budget
        ? `<div style="font-size:11.5px;color:${project.onBudget !== false ? "#10B981" : "#EF4444"};margin-top:2px">${project.onBudget !== false ? "✓ On budget" : "⚠ Over budget"}</div>`
        : `<div style="font-size:11.5px;color:#B4BAC4;margin-top:2px">Not set</div>`}
    </div>
    <div style="padding:16px 24px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#B4BAC4;margin-bottom:5px">RAG status</div>
      <div style="font-size:15px;font-weight:500;color:#1A1D23">${ragDot(project.risk)}${ragLabel}</div>
      ${project.riskNote ? `<div style="font-size:11.5px;color:#8A909B;margin-top:2px">${esc(project.riskNote)}</div>` : ""}
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1.4fr 1fr">
    <div style="padding:24px 28px;border-right:0.5px solid #E7E9ED">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#B4BAC4;margin-bottom:12px">Milestones</div>
      ${milestonesHtml}
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#B4BAC4;margin:24px 0 10px">Risk register</div>
      <div style="border:0.5px solid #E7E9ED;border-radius:8px;padding:8px 12px">${risksHtml}</div>
    </div>
    <div style="padding:24px 24px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#B4BAC4;margin-bottom:10px">Team</div>
      <div style="border:0.5px solid #E7E9ED;border-radius:8px;padding:8px 12px;margin-bottom:20px">${teamHtml}</div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#B4BAC4;margin-bottom:10px">Status updates</div>
      <div style="margin-bottom:20px">${updatesHtml}</div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#B4BAC4;margin-bottom:10px">Resources</div>
      ${resourcesHtml}
    </div>
  </div>

  <div style="border-top:0.5px solid #E7E9ED;padding:12px 32px;display:flex;align-items:center;justify-content:space-between;background:#FAFBFC">
    <div style="font-size:11px;color:#B4BAC4">Generated ${exportDate} · ${esc(project.title)}</div>
    <div style="font-size:11px;font-weight:600;color:#D1D5DB;letter-spacing:.02em">MakeItHappen</div>
  </div>

</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
