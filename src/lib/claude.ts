import { supabase, supabaseConfigured } from "./supabase";
import type { Project, StatusUpdate, User, Workspace, WorkspaceData } from "./types";

const devApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
const MODEL = "claude-sonnet-4-20250514";

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
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, messages }),
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

  const res = await fetch("/.netlify/functions/ai", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ system, messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; message?: string };
    if (err.error === "no_key") {
      return err.message ?? "No Anthropic API key saved. Open Settings (⚙) to add yours.";
    }
    throw new Error(`AI proxy error ${res.status}`);
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

function localEmailDraft(project: Project, update: StatusUpdate, user: User): string {
  const completeCount = project.milestones.filter((m) => m.status === "complete").length;
  const activeMs = project.milestones.find((m) => m.status === "active") || project.milestones[0];
  return `Hi team,

Quick status update on ${project.title}.

Where things stand: ${completeCount} of ${project.milestones.length} milestones are complete, and we're currently focused on "${activeMs.title}."

${update.text}

Next up, I'll keep things moving toward our ${project.due} target. I'll send another note once we hit the next milestone.

Best,
${user.name.split(" ")[0]}`;
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
  const milestoneSummary = project.milestones
    .map((m) => {
      const done = m.subtasks.filter((s) => s.done).length;
      return `- ${m.title} (${m.status}, ${done}/${m.subtasks.length} subtasks done, due ${m.due})`;
    })
    .join("\n");
  const system = `You draft concise, friendly status-update emails for ${user.name}. Plain text only, no subject line. Sign off with the sender's first name.`;
  const prompt = `Project: ${project.title} (due ${project.due})
Description: ${project.desc}
Milestones:
${milestoneSummary}

Latest status update from the project:
"${update.text}"

Draft a short status email to the team based on this.`;
  return callClaude(system, [{ role: "user", content: prompt }]);
}

/* ---------- assistant chat ---------- */

export function serializeContext(ws: Workspace, data: WorkspaceData, user: User): string {
  const projects = data.projects
    .map((p) => {
      const ms = p.milestones
        .map((m) => `    - ${m.title} [${m.status}] due ${m.due}: ${m.subtasks.map((s) => `${s.done ? "✓" : "○"} ${s.t}${s.next ? " (NEXT)" : ""}`).join("; ")}`)
        .join("\n");
      return `  ${p.title} [${p.status}] due ${p.due} — ${Math.round(p.progress * 100)}% done\n${ms}`;
    })
    .join("\n");
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

OPEN TASKS:
${tasks}

CONTACTS:
${contacts}

HABITS:
${habits}`;
}

/** Offline assistant: answers the suggested prompts directly from the data snapshot. */
function localAssistant(question: string, data: WorkspaceData): string {
  const q = question.toLowerCase();
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
  if (!devApiKey && !supabaseConfigured) {
    await new Promise((r) => setTimeout(r, 700));
    return localAssistant(question, data);
  }
  const system = `You are the MakeItHappen AI assistant — a sharp, concise personal chief-of-staff. Answer from the user's data snapshot below. Keep answers short and actionable.\n\n${serializeContext(ws, data, user)}`;
  return callClaude(system, [...history, { role: "user", content: question }]);
}
