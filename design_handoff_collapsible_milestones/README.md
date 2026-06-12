# Handoff: Collapsible Milestone Sections (MakeItHappen)

## Overview
This package documents a feature added to the **MakeItHappen** project-management app: the
**Milestone** list on a Project Detail view is now **collapsible**. Each milestone card can be
expanded or collapsed to show/hide its subtasks, with a "Toggle all" action and three
user-facing configuration controls (exposed in this prototype as a "Tweaks" panel).

The goal of the feature: on dense projects, let users collapse completed/parked milestones and
keep focus on the active one, while still seeing at-a-glance progress on collapsed rows.

## About the Design Files
The files in this bundle are **design references created in HTML/React-via-Babel** — a working
prototype that shows the intended look and behavior. They are **not** production code to copy
verbatim. The task is to **recreate this behavior in the target codebase** using its established
framework, component library, state-management, and styling conventions. If no front-end
environment exists yet, choose the framework that best fits the project and implement there.

The prototype uses React 18 transpiled in-browser with Babel and plain CSS custom properties.
Treat the JSX as a precise spec of structure/state, not as files to drop in.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and interaction timing are final and
should be reproduced precisely. Exact token values are listed under **Design Tokens** below.

## Screenshots
See the `screenshots/` folder:
- `01-default-active-open.png` — default load (`defaultState: "active"`): the active milestone is
  expanded, others collapsed with count badges.
- `03-all-collapsed.png` — every milestone collapsed (after "Toggle all"); note `done/total` chips
  on each header.
- `04-all-expanded.png` — every milestone expanded.
- `05-config-controls.png` — the three configuration controls (Collapsible / Default state / Count
  when collapsed) as exposed in the prototype's settings panel.

## Screens / Views

### Project Detail — Milestones column
- **Name:** Project Detail (`ProjectDetail`), left column titled "MILESTONES".
- **Purpose:** Review a project's milestones and their subtasks; check subtasks off; collapse
  milestones the user isn't focused on.
- **Layout:**
  - Page is centered, `max-width: 1100px`.
  - Body is a 2-column CSS grid: `grid-template-columns: 1.35fr 1fr; gap: 20px; align-items: start`.
    Left column = Milestones; right column = Status Updates (unchanged by this feature).
  - Milestones column: a section header row, then a vertical flex stack of milestone cards
    (`display: flex; flex-direction: column; gap: 12px`).

#### Section header ("MILESTONES")
- Uppercase label, `font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-4)`.
- Row is `display: flex; align-items: center`.
- Right-aligned **"Toggle all"** button (only shown when the *Collapsible* control is on):
  `margin-left: auto`, `font-size: 12px; font-weight: 500; color: var(--ink-3)`, a small
  chevron icon (11px) + text, `gap: 5px`. Clicking it opens all milestones if any are
  currently closed, otherwise closes all.

#### Milestone card (collapsed and expanded)
Each card is `.card` (white surface, 1px `--border`, `border-radius: 8px`, `--shadow-sm`).

**Header row** — becomes a full-width `<button>` when collapsible (else a `<div>`):
- `padding: 13px 16px; display: flex; align-items: center; gap: 10px; width: 100%; text-align: left`.
- `cursor: pointer` when collapsible.
- Bottom border: `1px solid var(--border)` when expanded, `1px solid transparent` when collapsed,
  with `transition: border-color .18s`.
- **Disclosure chevron** (only when collapsible): chevron-right icon, 14px, `color: var(--ink-4)`,
  `flex-shrink: 0`. Rotates with `transform: rotate(90deg)` when expanded, `none` when collapsed;
  `transition: transform .18s ease`.
- **Status dot:** 9×9px circle, `border-radius: 50%`, `flex-shrink: 0`. Color by milestone status:
  complete → `var(--next)` (#10B981), active → `var(--accent)` (#4F6BED work / #F59E0B personal),
  hold/other → `var(--ink-4)` (#B4BAC4).
- **Title:** `font-size: 14px; font-weight: 600; flex: 1` (takes remaining width).
- **Subtask count badge** (only when collapsible **and** "Count when collapsed" is on **and** the
  card is collapsed): a `.chip` showing a check-circle icon (11px) + `done/total` (e.g. `2/2`).
  Text color is `var(--next)` (#10B981) when `done === total`, else `var(--ink-3)`.
- **Due-date chip:** `.chip` with calendar icon (11px) + `m.due` (e.g. "May 30").
- **Status chip:** `.chip` styled by status — active = `.chip.status-active` (green-soft),
  hold = `.chip.status-hold` (amber-soft), complete = `.chip.status-complete` (gray).

**Subtasks body** — rendered only when the card is expanded:
- Container `padding: 6px 10px 8px`.
- Each subtask row: `.task-row`, `display: flex; align-items: center; gap: 11px; padding: 7px 8px; border-radius: 7px`.
  - Leading marker: checkbox (`.check`, 18×18, `border-radius: 5px`) for normal/next subtasks;
    or a delegate/wait state marker (`.state-mark`) for delegated/waiting items. Clicking it
    toggles `done`.
  - Label: `flex: 1; font-size: 13px`; gets `.strike` (line-through, `color: var(--ink-4)`) when done.
  - Optional state tag (Next / Delegated / Waiting) chip.
  - Assignee avatar, 20px.

## Interactions & Behavior
- **Toggle one milestone:** clicking a milestone header toggles only that card's open state
  (when collapsible is enabled). Chevron rotates and the subtask body shows/hides.
- **Toggle all:** the header button computes `anyOpen = some card open`. If any are open it closes
  all; otherwise it opens all.
- **Collapsible off:** every milestone is forced open, no chevron, header is a non-interactive
  `<div>` with default cursor, no "Toggle all" button — i.e. the original always-expanded layout.
- **Default open state** is recomputed whenever the user switches projects or changes the
  "Default state" control (see State Management).
- **Checking off a subtask** toggles `done` and recomputes the project's overall progress
  (fraction of all subtasks across all milestones that are done). This is existing behavior,
  preserved; collapsing does not affect it.
- **Transitions:** chevron rotation `.18s ease`; header bottom-border color `.18s`. No height
  animation in the prototype (subtask body is conditionally mounted) — if the target codebase
  prefers an animated expand/collapse, a height/`grid-template-rows` transition is acceptable as
  long as it doesn't leave content at `opacity:0` for non-JS render.

## State Management
Open/closed state is **lifted to the `ProjectDetail` container**, not stored per card, so
"Toggle all" can drive every card:

- `openMap`: an object keyed by milestone id → boolean (open?).
- **Seed function** runs on mount and is re-applied when `project.id` or the "Default state"
  control changes:
  - `defaultState === "all"` → every milestone `true`.
  - `defaultState === "none"` → every milestone `false`.
  - `defaultState === "active"` (default) → `true` only for milestones whose `status === "active"`;
    all others start collapsed.
- `toggleOne(id)` → flip `openMap[id]`.
- `toggleAll()` → if any open, set all `false`; else set all `true`.
- A milestone card renders expanded when `collapsible ? openMap[id] : true`.

### Configuration controls (the three "tweaks")
These are surfaced in the prototype via a floating Tweaks panel, but in production they would map
to whatever settings/preferences mechanism the app uses (user preference, view setting, etc.).
Defaults shown:

| Key            | Type            | Default    | Effect |
|----------------|-----------------|------------|--------|
| `collapsible`  | boolean         | `true`     | Master switch. Off = milestones always expanded, no chevron/Toggle-all. |
| `defaultState` | enum            | `"active"` | Which milestones are open on load: `all` / `active` (active only) / `none`. |
| `showCount`    | boolean         | `true`     | Show the `done/total` subtask count chip on a collapsed milestone header. |

## Design Tokens
From `styles.css` (`:root`). The live accent swaps by workspace (work = blue, personal = amber).

**Colors**
- `--bg #FAFAFB`, `--surface #FFFFFF`, `--surface-2 #F6F7F9`
- `--border #E7E9ED`, `--border-strong #D6D9DF`
- `--ink #1A1D23`, `--ink-2 #4A4F58`, `--ink-3 #8A909B`, `--ink-4 #B4BAC4`
- Accent (work): `--work #4F6BED`, `--work-soft #EEF1FD`, `--work-ink #2E45B8`
- Accent (personal): `--personal #F59E0B`, `--personal-soft #FEF5E7`, `--personal-ink #B5740A`
- Success/next: `--next #10B981`, `--next-soft #E7F7F1`, `--next-ink #0A7D58`
- Status-hold chip: bg `#FBF3E3`, text `#97650B`

**Typography**
- Font: `"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Mono: `"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace`
- Base size 14px / line-height 1.5. Milestone title 14px/600. Subtask label 13px. Chips 11.5px/550.
  Section header 12px/600 uppercase, `letter-spacing 0.04em`.

**Radii**
- `--radius 8px` (cards), `--radius-sm 6px`, `--radius-lg 12px`. Checkbox/marker 5px. Subtask row 7px. Chips 20px (pill).

**Shadows**
- `--shadow-sm 0 1px 2px rgba(20,23,28,0.04), 0 1px 1px rgba(20,23,28,0.03)` (cards)
- `--shadow`, `--shadow-lg` available for elevated surfaces.

**Spacing of note**
- Milestone stack gap 12px; header padding `13px 16px`; subtask body padding `6px 10px 8px`;
  subtask row padding `7px 8px`, gap 11px; header element gap 10px.

## Assets
- **Icons:** inline SVG React components from `icons.jsx` — used here: `Icon.ChevronRight`,
  `Icon.Calendar`, `Icon.CheckCircle` (plus `Icon.User`, `Icon.Flag`, etc. elsewhere). Replace
  with the target codebase's icon set (e.g. Lucide — these match Lucide's shapes closely).
- **Fonts:** Geist / Geist Mono via Google Fonts. Use the codebase's existing font stack if it
  has one.
- No raster images are involved in this feature.

## Files
The relevant prototype files are included in this folder for reference:
- `MakeItHappen.html` — entry point / script load order.
- `projects.jsx` — **primary file for this feature**: `ProjectDetail`, `MilestoneCard`, the
  `openMap` state, `toggleOne`, `toggleAll`, and the "Toggle all" header button.
- `app.jsx` — top-level `App`; holds the three config values and passes them down as `tweaks`
  to `Projects` → `ProjectDetail`.
- `tweaks-panel.jsx` — the prototype's settings-panel UI (reference only; not production-bound).
- `styles.css` — all design tokens and component classes (`.card`, `.chip`, `.task-row`, etc.).
- `icons.jsx` — inline SVG icons used by the milestone card.
- `data.js` — sample project/milestone/subtask shape (see `milestones[]` and `subtasks[]`).

### Data shape (for reference)
```js
project = {
  id, title, status: "active"|"hold"|"complete", owner, due, desc, progress, active,
  milestones: [
    { id, title, due, status: "complete"|"active"|"hold",
      subtasks: [ { id, t, done, next?, who, state?: "delegated"|"waiting" } ] }
  ],
  updates: [ ... ]
}
```
