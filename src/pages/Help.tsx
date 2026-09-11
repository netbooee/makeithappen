import { useState, type ReactNode } from "react";
import {
  ChevronRight, Compass, FolderKanban, ListTodo, Users, FileText, Link2, Sparkles, Flag, Keyboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

function HelpSection({
  title, icon: Icon, defaultOpen = false, children,
}: {
  title: string; icon: LucideIcon; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card rail-card">
      <div className={"rail-head" + (open ? " is-open" : "")} onClick={() => setOpen((v) => !v)}>
        <ChevronRight size={13} className="ic" />
        <Icon size={14} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
        <h3>{title}</h3>
      </div>
      {open && (
        <div className="rail-body" style={{ padding: "12px 16px 16px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="mono" style={{ fontSize: 12, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, padding: "0 5px" }}>
      {children}
    </kbd>
  );
}

export function Help() {
  return (
    <div className="page fade" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div className="page-title">Help &amp; Getting Started</div>
        <div className="page-sub">What each part of MakeItHappen does, and how to get going.</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <HelpSection title="Getting started" icon={Compass} defaultOpen>
          <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>
              Pick a workspace — <b>Work</b> or <b>Personal</b> — in the switch at the top left. Each workspace
              has its own projects, tasks and contacts, kept completely separate.
            </li>
            <li>
              Open a project from the <b>Projects</b> page, or press <Kbd>⌘K</Kbd> anywhere to jump straight to
              a project, task, or contact by name.
            </li>
            <li>
              Inside a project, add milestones and tasks with the "+ Add" rows. Use the up/down arrows on a
              milestone card to put it in the order you want — it stays that way everywhere the project shows up.
            </li>
            <li>
              Flag a task or subtask as your <b>Next action</b> (toggle in its edit panel) so it surfaces in
              Tasks, the project's "Coming up next" section, and exported reports.
            </li>
            <li>
              Log a status update on the project, then try <b>Export HTML</b> or <b>Export v2.0</b> at the top
              of the project page to generate a shareable, client-ready report.
            </li>
          </ol>
        </HelpSection>

        <HelpSection title="Projects" icon={FolderKanban}>
          <p style={{ margin: "0 0 10px" }}>
            Each project tracks milestones/workstreams, risk and budget, and has its own tabs for Next Actions,
            Decisions, Issues, Risks, Tasks, Agendas and Notes.
          </p>
          <p style={{ margin: "0 0 10px" }}>
            Milestones default to soonest-due-first. Move one with the up/down arrows to set a manual order —
            that override sticks and carries through to the projects grid and both HTML exports.
          </p>
          <p style={{ margin: 0 }}>
            The right-hand rail (Stakeholders, Internal Team, External Team, Resources) holds people and links
            tied to the project — used for assigning tasks and building the export's contact info.
          </p>
        </HelpSection>

        <HelpSection title="Tasks" icon={ListTodo}>
          <p style={{ margin: "0 0 10px" }}>
            The Tasks page pulls together every open item flagged <b>Next action</b> — both standalone tasks and
            milestone subtasks — grouped by project, across the whole workspace.
          </p>
          <p style={{ margin: 0 }}>
            While on the Tasks page, press <Kbd>T</Kbd> to jump to the quick-capture box and add a task without
            reaching for the mouse.
          </p>
        </HelpSection>

        <HelpSection title="Contacts" icon={Users}>
          <p style={{ margin: 0 }}>
            Track people you work with: company, role, relationship, and a log of touchpoints. Mark someone
            "Follow up" to have them surface as a nudge and show a badge in the sidebar.
          </p>
        </HelpSection>

        <HelpSection title="Status Updates" icon={FileText}>
          <p style={{ margin: 0 }}>
            The Updates page is a combined feed of every update logged across your projects — regular updates,
            heads-ups, blockers, wins, and executive-facing statements — newest first.
          </p>
        </HelpSection>

        <HelpSection title="Project Sites" icon={Link2}>
          <p style={{ margin: 0 }}>
            A single table of quick links per project — project site, meeting agenda location, SharePoint, and
            web server folder — so you don't have to dig through each project page to find a URL.
          </p>
        </HelpSection>

        <HelpSection title="AI Assistant" icon={Sparkles}>
          <p style={{ margin: "0 0 10px" }}>
            A chat that can see your current workspace's projects, tasks and contacts. Ask it things like "what's
            my next action across all projects?" or have it draft a status update, draft an email, summarize a
            project's next actions, or import a pasted list of contacts.
          </p>
          <p style={{ margin: 0 }}>
            Without an API key it runs in a limited demo mode. When Settings (the gear icon at the bottom of the
            sidebar) offers an API key field, add your Anthropic key there to unlock full conversational answers.
          </p>
        </HelpSection>

        <HelpSection title="Executive Update" icon={Flag}>
          <p style={{ margin: 0 }}>
            A single rollup page across every active project, meant for sharing upward — each project's status,
            what's coming next, and since-last-update notes. Reorder projects with the up/down controls, and
            export the whole thing as one HTML page.
          </p>
        </HelpSection>

        <HelpSection title="Tips &amp; shortcuts" icon={Keyboard}>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li><Kbd>⌘K</Kbd> / <Kbd>Ctrl K</Kbd> — search projects, tasks and contacts from anywhere.</li>
            <li><Kbd>T</Kbd> — quick-capture a task, while on the Tasks page.</li>
            <li>The gear icon at the bottom of the sidebar opens Settings — theme, collapsible sections, and your API key.</li>
            <li>The sidebar can be collapsed to icons only with the panel toggle next to the logo.</li>
          </ul>
        </HelpSection>
      </div>
    </div>
  );
}
