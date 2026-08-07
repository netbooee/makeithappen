import type { ExecEntry } from "../pages/ExecutiveUpdate";
import { execMetaLine, formatBudgetShort } from "../pages/ExecutiveUpdate";

/* ================= Executive update HTML export ================= */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const RISK_EMOJI: Record<string, string> = { green: "🟢", amber: "🟡", red: "🔴" };

const CHIP: Record<string, [string, string, string]> = {
  active: ["#E1F5EE", "#085041", "Active"],
  waiting: ["#FAEEDA", "#854F0B", "Waiting"],
  hold: ["#FAEEDA", "#854F0B", "On Hold"],
  complete: ["#E1F5EE", "#085041", "Complete"],
};

function pill(html: string, style: string): string {
  return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:500;padding:2px 8px;border-radius:20px;${style}">${html}</span>`;
}

function cardHtml(entry: ExecEntry): string {
  const { project, statement } = entry;
  const chip = CHIP[project.status] ?? CHIP.active;
  const budget = formatBudgetShort(project.budget);
  const subline = [
    project.owner,
    `due ${project.due}`,
    `${Math.round(project.progress * 100)}% complete`,
    budget ? `budget ${budget}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const doneMs = project.milestones.filter((m) => m.status === "complete");
  const upcomingMs = project.milestones.filter((m) => m.status !== "complete");
  const pills = [
    ...doneMs.map((m) => pill(`✓ ${esc(m.title)}`, "background:#E1F5EE;color:#085041")),
    ...upcomingMs.map((m) =>
      pill(esc(m.title + (m.due ? ` · ${m.due}` : "")), "border:0.5px solid #E2E5EA;color:#5A6070"),
    ),
  ];

  const statementHtml = `<div style="border-top:0.5px solid #E2E5EA;margin-top:10px;padding-top:10px">
    <div style="font-size:13.5px;line-height:1.62;color:#3A3F49;white-space:pre-wrap">${esc(statement)}</div>
    <div style="font-size:11px;color:#8A909B;margin-top:7px">${esc(execMetaLine(entry))}</div>
  </div>`;

  const titleHtml = project.webUrl
    ? `<a href="${esc(project.webUrl)}" style="color:#1A1D23;text-decoration:underline;text-underline-offset:2px">${esc(project.title)}</a>`
    : esc(project.title);

  return `<div style="border:0.5px solid #E2E5EA;border-radius:10px;padding:14px 16px;margin-bottom:10px;background:#fff">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style="font-size:14.5px;font-weight:600;color:#1A1D23">${RISK_EMOJI[project.risk ?? "green"]} ${titleHtml}</span>
      ${pill(chip[2], `background:${chip[0]};color:${chip[1]}`)}
    </div>
    <div style="font-size:12px;color:#8A909B;margin-top:3px">${esc(subline)}</div>
    ${pills.length ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px">${pills.join("")}</div>` : ""}
    ${statementHtml}
  </div>`;
}

export function exportExecUpdateHtml(entries: ExecEntry[]): void {
  const exportDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Program Management Office Project Snapshots — ${esc(exportDate)}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#F8F9FB;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#1A1D23;line-height:1.6;padding:32px 20px}
@media print{body{background:#fff;padding:0}}
</style>
</head>
<body>
<div style="max-width:820px;margin:0 auto">
  <div style="margin-bottom:16px">
    <div style="font-size:19px;font-weight:600">Program Management Office Project Snapshots</div>
    <div style="font-size:12px;color:#8A909B;margin-top:2px">${entries.length} project${entries.length === 1 ? "" : "s"} · ${esc(exportDate)}</div>
  </div>
  ${entries.map(cardHtml).join("\n")}
  <div style="display:flex;justify-content:space-between;font-size:11px;color:#8A909B;border-top:0.5px solid #E2E5EA;padding-top:10px;margin-top:16px">
    <span>Generated ${esc(exportDate)} · Program Management Office Project Snapshots</span>
    <span>MakeItHappen</span>
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `executive-update-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
