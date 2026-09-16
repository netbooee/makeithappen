/**
 * Static HTML export of the Modernist portfolio report shown on the Executive Update page
 * (src/pages/ExecutiveUpdate.tsx). Mirrors that page's bands — title, metrics, editable
 * summary poster (rendered here as static text), all-projects matrix, per-project detail,
 * footer — but always renders full detail (no Executive/Full-detail toggle) and omits the
 * "Coming up next / Next action" band, which the live page no longer shows either.
 * Reuses the shared PortfolioSummary/PortfolioRow computation and RAG styling from
 * portfolioReport.ts rather than recomputing it, per this codebase's precedent of importing
 * shared pure-logic modules into export files (see exportHtmlV2.ts).
 */
import { formatMoneyShort, RAG, RAG_NAME, RAG_ORDER, type PortfolioRow, type PortfolioSummary, type Rag } from "./portfolioReport";
import { safeHref } from "./safeUrl";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const C = {
  bg: "#f3f2f2",
  ink: "#201e1d",
  divider: "rgba(32,30,29,0.4)",
  n300: "#d7d3d3",
  n600: "#7d7979",
  n700: "#605d5d",
  n800: "#444141",
  accent: "#ec3013",
  accent700: "#ae1800",
};
const FONT = "'Archivo', system-ui, sans-serif";

function fmtLongDate(d: Date): string {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function ragChip(rag: Rag): string {
  return `<span style="width:12px;height:12px;display:inline-block;background:${RAG[rag].swatch};flex-shrink:0"></span>`;
}

function phaseStepper(row: PortfolioRow): string {
  if (row.phases === 0) {
    return `<div style="font-size:12px;color:${C.n700}">No milestones yet</div>`;
  }
  const cells = row.phaseCells
    .map((c) => `<span style="flex:1;display:block;height:${c.height};background:${c.color}"></span>`)
    .join("");
  return `
    <div>
      <div style="display:flex;align-items:flex-end;gap:2px;height:12px">${cells}</div>
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:6px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">
        <span style="color:${RAG[row.rag].text}">Phase ${row.phase} of ${row.phases} · ${esc(row.stage)}</span>
        <span style="color:${C.n700};flex-shrink:0">${row.done} / ${row.total} tasks</span>
      </div>
    </div>`;
}

export function exportExecUpdateHtml(report: PortfolioSummary, programmeOwner: string, feedbackEmail?: string): void {
  const today = new Date();
  const exportDate = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const asOf = fmtLongDate(today);

  const bandB = `
  <div style="display:grid;grid-template-columns:1.85fr 1fr;border-bottom:2px solid ${C.divider};margin-top:20px">
    <div style="padding:20px 32px 32px">
      <h1 style="font-family:${FONT};font-size:56px;line-height:1;letter-spacing:-0.03em;margin:0 0 16px;font-weight:800">Portfolio update</h1>
      <p style="font-size:17px;line-height:1.45;max-width:56ch;margin:0 0 24px">${esc(report.lede)}</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;border-top:1px solid ${C.divider};padding-top:16px">
        <div>
          <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:4px">Projects active</div>
          <div style="font-family:${FONT};font-weight:800;font-size:15px">${report.totalProjects}</div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:4px">Needs attention</div>
          <div style="font-family:${FONT};font-weight:800;font-size:15px;color:${C.accent700}">${report.needsAttention} project${report.needsAttention === 1 ? "" : "s"}</div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:4px">Programme owner</div>
          <div style="font-family:${FONT};font-weight:800;font-size:15px">${esc(programmeOwner)}</div>
        </div>
      </div>
    </div>
    <div style="border-left:2px solid ${C.divider};padding:20px 32px 32px;display:flex;flex-direction:column;justify-content:space-between;gap:24px">
      <div>
        <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:10px">Portfolio completion</div>
        <div style="display:flex;align-items:baseline;gap:10px">
          <span style="font-family:${FONT};font-weight:800;font-size:72px;line-height:.85;letter-spacing:-0.04em">${report.pct}</span>
          <span style="font-family:${FONT};font-weight:800;font-size:24px;line-height:1">%</span>
        </div>
        <div style="height:10px;background:${C.n300};margin-top:18px;display:flex">
          <div style="width:${report.pct}%;background:${C.accent}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n600}">
          <span>${report.doneTasks} of ${report.totalTasks} tasks complete</span>
          <span>${report.phasesOpen} phases open</span>
        </div>
      </div>
      <div style="border-top:1px solid ${C.divider};padding-top:16px">
        <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:6px">Next portfolio milestone</div>
        ${report.nextMilestone
          ? `<div style="font-family:${FONT};font-weight:800;font-size:22px;letter-spacing:-0.01em">${esc(report.nextMilestone.date)}</div>
             <div style="font-size:13px;color:${C.n700};margin-top:2px">${esc(report.nextMilestone.label)} · ${report.nextMilestone.daysOut <= 0 ? "due now" : `${report.nextMilestone.daysOut} days`}</div>`
          : `<div style="font-size:13px;color:${C.n700}">No upcoming gates on the books.</div>`}
      </div>
    </div>
  </div>`;

  const ragScale = RAG_ORDER
    .map((k) => `<span style="flex:1;height:8px;background:${k === report.portfolioRag ? RAG[k].swatch : C.n300};display:block"></span>`)
    .join("");
  const ragScaleLabels = RAG_ORDER.map((k) => `<span style="flex:1">${RAG_NAME[k]}</span>`).join("");

  const catLabel = (cat: "timeline" | "budget" | "resourcing") =>
    cat === "timeline" ? "Timeline" : cat === "budget" ? "Budget" : "Resourcing";
  const riskRowsHtml = (["timeline", "budget", "resourcing"] as const)
    .map((cat) => {
      const counts = report.categoryCounts[cat];
      const worst: Rag = counts.red > 0 ? "red" : counts.amber > 0 ? "amber" : "green";
      return `
        <div style="display:flex;align-items:center;gap:9px">
          <span style="width:11px;height:11px;background:${RAG[worst].swatch};display:block;flex-shrink:0"></span>
          <span style="font-size:13px;flex:1">${catLabel(cat)}</span>
          <span style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n700}">${counts.green}G · ${counts.amber}A · ${counts.red}R</span>
        </div>`;
    })
    .join("");

  const bandC = `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:2px solid ${C.divider}">
    <div style="padding:20px 32px 22px">
      <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:8px">Portfolio health</div>
      <div style="display:flex;align-items:center;gap:9px">
        ${ragChip(report.portfolioRag)}
        <span style="font-family:${FONT};font-weight:800;font-size:22px;letter-spacing:-0.01em">${RAG_NAME[report.portfolioRag]}</span>
        <span style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n700}">${RAG[report.portfolioRag].label}</span>
      </div>
      <div style="display:flex;gap:2px;margin-top:12px">${ragScale}</div>
      <div style="display:flex;gap:2px;margin-top:5px;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600}">${ragScaleLabels}</div>
      <p style="font-size:13px;line-height:1.45;color:${C.n800};margin:10px 0 0">${esc(report.healthNote)}</p>
    </div>
    <div style="padding:20px 24px 22px;border-left:1px solid ${C.divider}">
      <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:8px">Risk breakdown · all projects</div>
      <div style="display:flex;flex-direction:column;gap:7px">${riskRowsHtml}</div>
      <p style="font-size:13px;line-height:1.45;color:${C.n800};margin:10px 0 0">${esc(report.riskNote)}</p>
    </div>
    <div style="padding:20px 24px 22px;border-left:1px solid ${C.divider}">
      <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:8px">Schedule</div>
      <div style="font-family:${FONT};font-weight:800;font-size:22px;letter-spacing:-0.01em">${report.onDateCount} of ${report.totalProjects} on date</div>
      <div style="font-size:13px;color:${C.n700};margin-top:2px">${report.gatesClosingSoon} gate${report.gatesClosingSoon === 1 ? "" : "s"} close before ${esc(report.gatesClosingBy)}</div>
      <p style="font-size:13px;line-height:1.45;color:${C.n800};margin:10px 0 0">${esc(report.scheduleNote)}</p>
    </div>
    <div style="padding:20px 32px 22px;border-left:1px solid ${C.divider}">
      <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:8px">Budget</div>
      <div style="font-family:${FONT};font-weight:800;font-size:22px;letter-spacing:-0.01em">${report.drawnPct === null ? "No budget set" : `${report.drawnPct}% drawn`}</div>
      <div style="display:flex;gap:20px;margin-top:10px">
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n600}">Approved</div>
          <div style="font-family:${FONT};font-weight:800;font-size:15px">${formatMoneyShort(report.approvedTotal)}</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n600}">Spent</div>
          <div style="font-family:${FONT};font-weight:800;font-size:15px">${formatMoneyShort(report.spentTotal)}</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n600}">Remaining</div>
          <div style="font-family:${FONT};font-weight:800;font-size:15px">${formatMoneyShort(Math.max(report.approvedTotal - report.spentTotal, 0))}</div>
        </div>
      </div>
    </div>
  </div>`;

  // Executive poster — the summary is user-editable in the app; here it's rendered as static text.
  const bandD = `
  <div style="background:${C.accent};color:${C.bg};padding:36px 32px 32px;border-bottom:2px solid ${C.divider}">
    <div style="font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-bottom:16px">Executive summary · ${esc(asOf)}</div>
    <p style="font-family:${FONT};font-weight:800;font-size:28px;line-height:1.18;letter-spacing:-0.02em;margin:0;max-width:62ch">${esc(report.summary)}</p>
  </div>`;

  const detailBlocks = report.rows
    .map((row) => {
      const href = safeHref(row.project.webUrl);
      const linked = href !== "#";
      const titleHtml = linked
        ? `<a href="${esc(href)}" style="color:${C.ink};text-decoration:underline;text-underline-offset:2px">${esc(row.project.title)}</a>`
        : esc(row.project.title);
      const riskRows = ([
        ["Timeline", row.timeline],
        ["Budget", row.budget],
        ["Resourcing", row.resourcing],
      ] as [string, Rag][])
        .map(
          ([lbl, rag]) => `
        <div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid ${C.divider};font-size:13px">
          <span style="color:${C.n700}">${lbl}</span>
          <span style="font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${RAG[rag].text}">${RAG[rag].label}</span>
        </div>`,
        )
        .join("");
      const actionHtml = row.actionTitle
        ? `
        <div style="display:flex;align-items:flex-start;gap:10px;margin-top:14px">
          <span style="display:inline-block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:3px 7px;background:${C.accent};color:${C.bg};flex-shrink:0">Next</span>
          <div>
            <div style="font-family:${FONT};font-weight:800;font-size:13px;line-height:1.3">${esc(row.actionTitle)}</div>
            ${row.actionMeta ? `<div style="font-size:12px;color:${C.n700};margin-top:3px">${esc(row.actionMeta)}</div>` : ""}
          </div>
        </div>`
        : "";

      return `
    <div style="border-top:2px solid ${C.divider};padding:18px 0 24px">
      <div style="display:grid;grid-template-columns:1.85fr 1fr;gap:32px;align-items:start">
        <div>
          <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:10px">
            ${ragChip(row.rag)}
            <h3 style="font-family:${FONT};font-size:17px;letter-spacing:-0.01em;margin:0;flex:1;font-weight:800">${titleHtml}</h3>
            <span style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n700}">Phase ${row.phase} of ${row.phases} · ${esc(row.stage)} · ${row.pct}%</span>
          </div>
          <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:6px">Executive update${row.updateDate ? ` · ${esc(row.updateDate)}` : ""}</div>
          <p style="font-size:14px;line-height:1.5;margin:0 0 14px;max-width:62ch">${esc(row.update)}</p>
          <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.n600};margin-bottom:6px">Coming up next</div>
          <p style="font-size:13px;line-height:1.5;margin:0;max-width:62ch;color:${C.n800}">${esc(row.next || "No upcoming step recorded.")}</p>
        </div>
        <div style="border-left:2px solid ${C.divider};padding-left:24px">
          <div style="padding-bottom:14px;border-bottom:1px solid ${C.divider};margin-bottom:4px">${phaseStepper(row)}</div>
          ${riskRows}
          <div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid ${C.divider};font-size:13px">
            <span style="color:${C.n700}">Spend</span>
            <span style="font-family:${FONT};font-weight:800">${esc(row.spendLabel)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid ${C.divider};font-size:13px">
            <span style="color:${C.n700}">Gate</span>
            <span style="font-family:${FONT};font-weight:800">${esc(row.gate)}</span>
          </div>
          ${actionHtml}
        </div>
      </div>
    </div>`;
    })
    .join("");

  const bandG = `
  <div style="border-top:2px solid ${C.divider};padding:32px 32px 0">
    <h2 style="font-family:${FONT};font-size:24px;letter-spacing:-0.02em;margin:0 0 4px;font-weight:800">Project detail</h2>
    <p style="font-size:13px;color:${C.n700};margin:0 0 24px">Latest executive update, health, schedule, budget and next step for each project.</p>
  </div>
  <div style="padding:0 32px 8px">${detailBlocks}</div>`;

  const bandH = `
  <div style="border-top:2px solid ${C.divider};padding:16px 32px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap">
    <span style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.n600}">Portfolio update generated ${esc(asOf)}</span>
    ${feedbackEmail
      ? `<a href="${esc(safeHref(`mailto:${feedbackEmail}?subject=${encodeURIComponent("Portfolio update feedback")}`))}" style="font-family:${FONT};font-weight:800;font-size:11px;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;color:${C.accent}">Send feedback</a>`
      : ""}
  </div>`;

  const body =
    report.totalProjects === 0
      ? `<div style="padding:40px 32px;font-size:15px;color:${C.n700}">No active projects to report on.</div>`
      : `${bandB}${bandC}${bandD}${bandG}${bandH}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portfolio update — ${esc(exportDate)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&display=swap">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:${C.bg};font-family:${FONT};color:${C.ink};line-height:1.4}
@media print{body{background:#fff}}
</style>
</head>
<body>
<div style="max-width:1320px;margin:0 auto">${body}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `portfolio-update-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
