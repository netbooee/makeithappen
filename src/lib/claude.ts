import { fmtDue } from "../components/ui";
import { supabase, supabaseConfigured } from "./supabase";
import type { Project, StatusUpdate, User, Workspace, WorkspaceData } from "./types";

const devApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const MODEL = "claude-sonnet-4-6";

/** True when the AI will actually work (either a dev key or the proxy endpoint is available). */
export const claudeConfigured = Boolean(devApiKey) || supabaseConfigured;

// ---- direct browser call (local dev with VITE_ANTHROPIC_API_KEY) ----

async function callClaudeDirect(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": devApiKey!,
      "anthropic-version": "2023-06-01",
      // personal single-user app; key stays on the user's own machine via .env.local
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 2048, system, messages }),
  });
  if (!res.ok) throw new Error(`Claude API error ${res.status}`);
  const json = await res.json();
  return json.content?.[0]?.text ?? "";
}

// ---- Netlify proxy call (production — key never leaves the server) ----

async function callClaudeProxy(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  const { data: { session } } = await supabase!.auth.getSession();
  if (!session) throw new Error("not_authenticated");

  const res = await fetch(`${supabaseUrl}/functions/v1/ai`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ system, messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; message?: string; detail?: string };
    if (err.error === "no_key") {
      return err.message ?? "No Anthropic API key saved. Open Settings (⚙) to add yours.";
    }
    console.error("proxy error", res.status, err);
    throw new Error(`proxy_${res.status}`);
  }

  const json = await res.json() as { text?: string };
  return json.text ?? "";
}

// ---- pick the right call path ----

async function callClaude(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  if (devApiKey) return callClaudeDirect(system, messages);
  if (supabaseConfigured) return callClaudeProxy(system, messages);
  throw new Error("no_claude");
}

/* ---------- email drafting ---------- */

function emailContext(project: Project) {
  const ragLabel = project.risk
    ? ({ green: "🟢 Green — on track", amber: "🟡 Amber — some risk", red: "🔴 Red — at risk" } as const)[project.risk]
    : "Not set";
  const timeline =
    project.start && project.due !== "No date"
      ? `${project.start} → ${project.due}`
      : project.due !== "No date"
      ? `Due ${project.due}`
      : "No date set";
  const budget = project.budget
    ? `${project.budget}${project.onBudget !== false ? " (on budget)" : " (over budget)"}`
    : "Not set";
  const totalSubtasks = project.milestones.reduce((a, m) => a + m.subtasks.length, 0);
  const doneSubtasks = project.milestones.reduce((a, m) => a + m.subtasks.filter((s) => s.done).length, 0);
  const statusEmoji = { complete: "✅", active: "➡️", hold: "⏳", waiting: "⏳" } as const;
  const milestoneLines = project.milestones
    .map((m) => `${fmtDue(m.due).padEnd(7)}${statusEmoji[m.status]}   ${m.title.toUpperCase()}`)
    .join("\n");
  const nameLine = project.webUrl ? `${project.title} — ${project.webUrl}` : project.title;
  return { ragLabel, timeline, budget, totalSubtasks, doneSubtasks, milestoneLines, nameLine };
}

function localEmailDraft(project: Project, update: StatusUpdate, user: User): string {
  const { ragLabel, timeline, budget, totalSubtasks, doneSubtasks, milestoneLines, nameLine } = emailContext(project);
  return `Hi [recipient],

${update.text}

Project details:
${nameLine}
${project.desc}
Timeline:  ${timeline}
Budget:    ${budget}
RAG:       ${ragLabel}
Progress:  ${doneSubtasks}/${totalSubtasks} tasks complete

Milestones:
${milestoneLines}

Let me know if you have any questions.

${user.name.split(" ")[0]}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** HTML version of the same draft, for pasting into rich-text clients (e.g. Outlook). */
export function draftStatusEmailHtml(project: Project, update: StatusUpdate, user: User): string {
  const { ragLabel, timeline, budget, totalSubtasks, doneSubtasks, nameLine } = emailContext(project);
  const statusEmoji = { complete: "✅", active: "➡️", hold: "⏳", waiting: "⏳" } as const;
  const nameLineHtml = project.webUrl
    ? `<a href="${escapeHtml(project.webUrl)}">${escapeHtml(project.title)}</a>`
    : escapeHtml(project.title);
  const milestoneRows = project.milestones
    .map(
      (m) =>
        `<tr><td style="padding:2px 8px 2px 0;white-space:nowrap;">${escapeHtml(fmtDue(m.due))}</td><td style="padding:2px 6px;">${statusEmoji[m.status]}</td><td style="padding:2px 0;">${escapeHtml(m.title.toUpperCase())}</td></tr>`,
    )
    .join("");
  const mono = 'font-family:Courier, monospace;';
  const p = 'margin:0 0 16px 0;';
  return `<p style="${p}">Hi [recipient],</p>
<p style="${p}">${escapeHtml(update.text).replace(/\n/g, "<br>")}</p>
<p style="${p}"><b>Project details:</b><br>
${nameLineHtml}<br>
${escapeHtml(project.desc)}</p>
<p style="${p}${mono}">
<b>Timeline:</b> ${escapeHtml(timeline)}<br>
<b>Budget:</b> ${escapeHtml(budget)}<br>
<b>RAG:</b> ${escapeHtml(ragLabel)}<br>
<b>Progress:</b> ${doneSubtasks}/${totalSubtasks} tasks complete</p>
<p style="${p}"><b>Milestones:</b></p>
<table style="border-collapse:collapse;margin:0 0 16px 0;${mono}">${milestoneRows}</table>
<p style="${p}">Let me know if you have any questions.</p>
<p style="margin:0;">${escapeHtml(user.name.split(" ")[0])}</p>`;
}

export async function draftStatusEmail(
  project: Project,
  update: StatusUpdate,
  user: User,
): Promise<string> {
  if (!devApiKey && !supabaseConfigured) {
    await new Promise((r) => setTimeout(r, 1100));
    return localEmailDraft(project, update, user);
  }
  const { ragLabel, timeline, budget, totalSubtasks, doneSubtasks, milestoneLines, nameLine } = emailContext(project);
  const system = `You draft concise, professional status-update emails for ${user.name}. Plain text only, no subject line. Sign off with the sender's first name. Follow the exact structure provided — do not rearrange, paraphrase the update text, or add extra commentary.`;
  const prompt = `Write a status update email for "${project.title}" using this exact structure:

1. Greeting: "Hi [recipient],"
2. Blank line, then the status update text verbatim (copy it exactly):
   "${update.text}"
3. Blank line, then these project details exactly (no indentation, keep the label padding as shown):
   Project details:
   ${nameLine}
   ${project.desc}
   Timeline:  ${timeline}
   Budget:    ${budget}
   RAG:       ${ragLabel}
   Progress:  ${doneSubtasks}/${totalSubtasks} tasks complete
4. Blank line, then this milestones section exactly:
   Milestones:
${milestoneLines}
5. One short closing sentence (e.g. "Let me know if you have any questions.")
6. Sign off: "${user.name.split(" ")[0]}"

Output only the email body. No extra commentary.`;
  try {
    return await callClaude(system, [{ role: "user", content: prompt }]);
  } catch {
    return localEmailDraft(project, update, user);
  }
}

/* ---------- status update drafting ---------- */

function localStatusUpdateDraft(project: Project): string {
  const done = project.milestones.filter((m) => m.status === "complete").length;
  const active = project.milestones.find((m) => m.status === "active");
  return active
    ? `Progress continues on ${project.title}. ${done}/${project.milestones.length} milestones complete; currently focused on "${active.title}" (due ${active.due}).`
    : `Progress continues on ${project.title}. ${done}/${project.milestones.length} milestones complete.`;
}

/** Generates a fresh, short status update from project context. */
export async function draftStatusUpdate(project: Project): Promise<string> {
  if (!devApiKey && !supabaseConfigured) {
    await new Promise((r) => setTimeout(r, 900));
    return localStatusUpdateDraft(project);
  }
  const { ragLabel, timeline, budget, totalSubtasks, doneSubtasks, milestoneLines } = emailContext(project);
  const recentUpdates = (project.updates ?? []).slice(0, 3).map((u) => `- [${u.type ?? "update"}] ${u.when}: ${u.text}`).join("\n") || "None yet.";
  const system = `You write short, sharp project status updates for a busy PM. Plain text, 2-4 sentences max, no greeting or sign-off, no headers. Output only the update text.`;
  const prompt = `Draft a short status update for "${project.title}".

Context:
${project.desc}
Timeline: ${timeline}
Budget: ${budget}
RAG: ${ragLabel}
Progress: ${doneSubtasks}/${totalSubtasks} tasks complete
Milestones:
${milestoneLines}

Recent updates (most recent first):
${recentUpdates}

Write a fresh, short status update (not a duplicate of recent ones). Output only the update text, no preamble.`;
  try {
    return await callClaude(system, [{ role: "user", content: prompt }]);
  } catch {
    return localStatusUpdateDraft(project);
  }
}

/** Suggests corrections/improvements to a draft the user has already typed. */
export async function suggestStatusUpdateEdits(project: Project, currentText: string): Promise<string> {
  if (!currentText.trim()) return currentText;
  if (!devApiKey && !supabaseConfigured) {
    await new Promise((r) => setTimeout(r, 900));
    return currentText.trim();
  }
  const system = `You lightly edit project status updates for clarity, concision, and professionalism. Preserve the author's meaning, facts, and tone — do not invent new information. Plain text, no greeting or sign-off, no headers, no commentary. Output only the corrected text.`;
  const prompt = `Project: "${project.title}"

Here is a draft status update the author typed:
"${currentText}"

Improve clarity and concision without changing the meaning or adding new facts. Output only the corrected update text.`;
  try {
    return await callClaude(system, [{ role: "user", content: prompt }]);
  } catch {
    return currentText.trim();
  }
}

/* ---------- assistant chat ---------- */

export function serializeContext(ws: Workspace, data: WorkspaceData, user: User): string {
  const projects = data.projects
    .map((p) => {
      const ragLabel = p.risk ? { green: "Green — on track", amber: "Amber — some risk", red: "Red — at risk" }[p.risk] : "Not set";
      const budgetParts = [p.budget ? `Total: ${p.budget}` : null, p.budgetSpent ? `Spent: ${p.budgetSpent}` : null].filter(Boolean).join(", ");
      const budget = budgetParts || "Not set";

      const ms = p.milestones
        .map((m) => {
          const tasks = m.subtasks.map((s) => `${s.done ? "✓" : "○"} ${s.t}${s.next ? " (NEXT)" : ""}${s.state === "waiting" ? ` (waiting: ${s.waitFor ?? "?"})` : ""}${s.state === "delegated" ? ` (delegated to ${s.to ?? "?"})` : ""}`).join("; ");
          return `    Milestone [${m.status}] "${m.title}" due ${m.due}${tasks ? `\n      Tasks: ${tasks}` : ""}`;
        })
        .join("\n");

      const updates = (p.updates ?? []).slice(0, 5)
        .map((u) => `    [${u.type ?? "update"}] ${u.when}: ${u.text}`)
        .join("\n");

      const sortedAgendas = [...(p.agendas ?? [])].sort((a, b) => a.date.localeCompare(b.date));
      const agendas = sortedAgendas.slice(-3)
        .map((a) => {
          const items = a.items.map((i) => i.text).join("; ");
          return `    "${a.title}"${a.date ? ` on ${a.date}` : ""}${items ? ` — Items: ${items}` : ""}`;
        })
        .join("\n");

      const openRisks = (p.risks ?? []).filter((r) => r.status === "open")
        .map((r) => `    ${r.description} (prob: ${r.probability}, impact: ${r.impact}${r.mitigation ? `, mitigation: ${r.mitigation}` : ""})`)
        .join("\n");

      let out = `PROJECT: ${p.title}\n  Status: ${p.status} | Due: ${p.due} | Progress: ${Math.round(p.progress * 100)}% | RAG: ${ragLabel} | Budget: ${budget}`;
      if (p.riskNote) out += `\n  Risk note: ${p.riskNote}`;
      if (p.desc) out += `\n  Description: ${p.desc}`;
      if (ms) out += `\n  Milestones:\n${ms}`;
      if (updates) out += `\n  Status updates (most recent first):\n${updates}`;
      if (agendas) out += `\n  Recent meeting agendas:\n${agendas}`;
      if (openRisks) out += `\n  Open risks:\n${openRisks}`;
      return out;
    })
    .join("\n\n");

  const tasks = [...data.todayTasks, ...data.upcoming]
    .filter((t) => !t.done)
    .map((t) => `  - ${t.text}${t.next ? " (NEXT ACTION)" : ""}${t.due ? ` due ${t.due}` : ""} ${t.context}${t.project ? ` [${t.project}]` : ""}`)
    .join("\n");
  const contacts = data.contacts
    .map((c) => `  - ${c.name} (${c.rel}${c.company ? `, ${c.company}` : ""}) last contact ${c.lastDate}${c.followUp ? " — FOLLOW-UP FLAGGED" : ""}`)
    .join("\n");
  const habits = data.habits
    .map((h) => `  - ${h.icon} ${h.name}: ${h.streak}-day streak, ${h.doneToday ? "done" : "not done"} today (${h.cadence})`)
    .join("\n");
  return `User: ${user.name}. Active workspace: ${ws}. Today is ${new Date().toDateString()}.

PROJECTS:
${projects}

OPEN TASKS (standalone and cross-project):
${tasks}

CONTACTS:
${contacts}

HABITS:
${habits}`;
}

export interface ImportContact { name: string; company: string; email: string; role: string; }

export function parseContactRows(text: string): ImportContact[] | null {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const sep = lines[0].includes("\t") ? "\t" : ",";
  const contacts: ImportContact[] = [];
  for (const line of lines) {
    const parts = line.split(sep).map((p) => p.trim().replace(/^["']|["']$/g, ""));
    if (parts.length < 3) continue;
    const [company, name, email, role = ""] = parts;
    if (!email.includes("@")) continue; // skip header rows or non-email columns
    if (!name || !company) continue;
    contacts.push({ company, name, email, role });
  }
  return contacts.length > 0 ? contacts : null;
}

/** Offline assistant: answers the suggested prompts directly from the data snapshot. */
function localAssistant(question: string, data: WorkspaceData): string {
  const q = question.toLowerCase();
  if (q.includes("import") && q.includes("contact")) {
    return "Paste your contact rows directly into this chat — one contact per line with columns: Company, Name, Email, Role (tab or comma separated). I'll detect them and show you an import button.";
  }
  if (q.includes("next action")) {
    const lines = data.nextActions.map((n) => `• ${n.text}\n   ${n.project || "Standalone"} · ${n.due}`);
    return `Here are your next actions across all projects:\n\n${lines.join("\n")}\n\nThe top one is "${data.nextActions[0].text}" — it's due ${data.nextActions[0].due.toLowerCase()}.`;
  }
  if (q.includes("contact") || q.includes("haven't i")) {
    const flagged = data.contacts.filter((c) => c.followUp);
    if (!flagged.length) return "You're all caught up — no contacts are flagged for follow-up right now.";
    const lines = flagged.map((c) => `• ${c.name} (${c.rel}) — last contact ${c.lastDate}. ${c.lastNote}.`);
    return `These contacts could use a follow-up:\n\n${lines.join("\n")}`;
  }
  if (q.includes("weekly review") || q.includes("gtd")) {
    const openCount = [...data.todayTasks, ...data.upcoming].filter((t) => !t.done).length;
    const activeProjects = data.projects.filter((p) => p.status === "active");
    const waiting = [...data.todayTasks, ...data.upcoming].filter((t) => t.state === "waiting" && !t.done);
    return `Let's run a quick weekly review.\n\n1. Open loops: you have ${openCount} open tasks and ${data.someday.length} someday items.\n2. Active projects (${activeProjects.length}): ${activeProjects.map((p) => `${p.title} (${Math.round(p.progress * 100)}%)`).join(", ")}.\n3. Waiting on: ${waiting.length ? waiting.map((t) => `${t.text} — ${t.waitFor}`).join("; ") : "nothing"}.\n4. Each active project has a flagged next action — good GTD hygiene.\n\nSuggestion: clear the two "Today" next actions first, then review the someday list for anything to promote.`;
  }
  if (q.includes("draft") && q.includes("email")) {
    return `Open the project, find the latest status update, and hit "Draft email" — I'll compose it from the project's milestone status and the update text. Or tell me which project and I'll summarize it here.`;
  }
  const active = data.projects.filter((p) => p.status === "active");
  return `Here's a quick snapshot: ${active.length} active projects, ${[...data.todayTasks, ...data.upcoming].filter((t) => !t.done).length} open tasks, and ${data.habits.filter((h) => !h.doneToday).length} habits left today. Ask me about next actions, contacts to follow up with, or a weekly review.\n\n(Add your Anthropic API key in Settings to unlock full conversational AI.)`;
}

export async function askAssistant(
  question: string,
  history: { role: "user" | "assistant"; content: string }[],
  ws: Workspace,
  data: WorkspaceData,
  user: User,
): Promise<string> {
  // Always handle contact paste locally — no API key needed
  const contacts = parseContactRows(question);
  if (contacts) {
    await new Promise((r) => setTimeout(r, 400));
    return `<import-contacts>${JSON.stringify(contacts)}</import-contacts>Found ${contacts.length} contact${contacts.length !== 1 ? "s" : ""} — review and import below.`;
  }

  if (!devApiKey && !supabaseConfigured) {
    await new Promise((r) => setTimeout(r, 700));
    return localAssistant(question, data);
  }
  const system = `You are the MakeItHappen AI assistant — a sharp, concise personal chief-of-staff. Answer from the user's data snapshot below. Keep answers short and actionable.\n\n${serializeContext(ws, data, user)}`;
  try {
    return await callClaude(system, [...history, { role: "user", content: question }]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "not_authenticated") {
      return "You need to be signed in to use the AI assistant.";
    }
    const status = msg.startsWith("proxy_") ? ` (${msg.replace("proxy_", "status ")})` : "";
    return `Couldn't reach the AI right now${status}. Make sure your Anthropic API key is saved in Settings (⚙) and is valid, then try again.`;
  }
}
