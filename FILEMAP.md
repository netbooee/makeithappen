# FILEMAP — what every file does

A lookup so you can name the right files when opening a scoped brief.
**Keep this updated:** any new file added to `src/` gets a row here in the same commit.

## Three rules that save the most confusion

1. Adding a **field** to anything usually touches three files: `types.ts` (the shape) + the UI file (editing it) + `exportHtml.ts` (showing it in the export). They travel together.
2. The **live app** and the **exported HTML** are entirely separate code. Changing one never changes the other — say which you mean.
3. `ProjectDetail.tsx` is the page *frame*. The right-rail cards live in their own files. "Change the stakeholders card" → `StakeholderSection.tsx`.

---

## Top level / shell

| File | What it is | Name it when you're changing… |
|---|---|---|
| `src/App.tsx` | Route table (HashRouter) + login gate | adding a page, changing a URL |
| `src/main.tsx` | React entry point | almost never |
| `src/components/Shell.tsx` | Left nav, breadcrumbs, page chrome | nav items, breadcrumb labels |
| `src/styles.css` | All global CSS + design tokens (`--ink`, `--border`, `.card`, `.rail-card`) | colors, spacing, any shared class |
| `src/store/store.tsx` | Whole app state + every mutation (`updateProject`, etc.) | saving/persisting data, new mutations |
| `src/lib/types.ts` | Every data shape (`Project`, `Contact`, `Task`, `Milestone`…) | adding a *field* to anything |
| `src/data/seed.ts` | Demo data the app boots with | the sample content you see in demo mode |
| `src/vite-env.d.ts` | Vite type shims | almost never |

## Pages (one per nav item)

| File | What it is |
|---|---|
| `src/pages/Today.tsx` | Today dashboard |
| `src/pages/Tasks.tsx` | Task list / groups |
| `src/pages/Updates.tsx` | Cross-project status updates feed |
| `src/pages/Habits.tsx` | Habit list + habit detail |
| `src/pages/Contacts.tsx` | Contact list + contact detail |
| `src/pages/Assistant.tsx` | Claude chat page |
| `src/pages/ProjectSites.tsx` | Project links/sites index |
| `src/pages/ExecutiveUpdate.tsx` | Exec snapshot page + its ordering |
| `src/pages/Login.tsx` | Supabase sign-in (only shows if env-configured) |

## Project pages — `src/pages/projects/`

| File | What it is |
|---|---|
| `ProjectList.tsx` | The projects index grid |
| `ProjectDetail.tsx` | **The big one** — project page layout, header, tabs, right-rail assembly |
| `ProjectModal.tsx` | Create/edit project dialog |
| `MilestoneCard.tsx` | A milestone + its subtasks |
| `AddMilestone.tsx` | Add-milestone form |
| `PasteMilestones.tsx` | Paste-outline-to-milestones control: textarea + live preview, creates milestones + tasks in bulk |
| `AddProjectTaskRow.tsx` | Inline "add task" row |
| `StakeholderSection.tsx` | Stakeholders rail card (names, satisfaction faces, notes) |
| `ExternalTeamSection.tsx` | External team rail card |
| `ResourcesSection.tsx` | Links/resources rail card |
| `KpiSection.tsx` | Budget / risk / progress KPI strip |
| `NextActionsSection.tsx` | Next-action subtasks across all milestones, read-only with click-through to edit |
| `RiskTracker.tsx` | Risk register table |
| `IssueTracker.tsx` | Issue tracker table |
| `DecisionsTracker.tsx` | Decisions log table |
| `MeetingAgendasSection.tsx` | Meeting agendas: build, edit, export |
| `ProjectNotesSection.tsx` | Project notes: markdown notes + links, edit/view toggle |
| `DraftEmailPanel.tsx` | AI-drafted status email panel |
| `UpdateTypeTag.tsx` | The update / heads-up / blocked / win pills |

## Shared components

| File | What it is |
|---|---|
| `src/components/ui.tsx` | Shared primitives: `Avatar`, `StatusChip`, `Checkbox`, `DateInput`, `ProgressDial`, date formatters |
| `src/components/TaskEditPanel.tsx` | Slide-out task editor |
| `src/components/SubtaskEditPanel.tsx` | Slide-out subtask editor |
| `src/components/SearchModal.tsx` | Global search |
| `src/components/TweaksPanel.tsx` | Settings / preferences panel |

## Lib

| File | What it is |
|---|---|
| `src/lib/exportHtml.ts` | **All project exports** — project report HTML, PDF, agenda HTML, status CSV. Self-contained HTML strings, separate from the live UI |
| `src/lib/exportExecUpdateHtml.ts` | The exec-snapshot HTML export |
| `src/lib/claude.ts` | Every AI call: draft update, draft email, summarize next actions, assistant chat, contact import |
| `src/lib/tasks.ts` | `nextActionCount` — the shared undone-next-action count (Tasks + Subtasks) used by both the Tasks page and the Shell nav badge |
| `src/lib/supabase.ts` | Auth + cloud save/load (env-gated; app works without it) |
| `src/lib/safeUrl.ts` | URL sanitizer for user-entered links |
| `src/lib/constants.ts` | Context lists per workspace |
| `src/lib/projectContacts.ts` | Per-project contact pool (members + external team + stakeholders) for task assignment: option list, `kind:id` ref encode/parse, initials, avatar resolution |
| `src/lib/parseMilestonePaste.ts` | Pure parser: plain-text outline → ordered `{ title, tasks[] }[]` for the paste-milestones feature |
