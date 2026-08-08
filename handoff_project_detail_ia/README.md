# Handoff: Project Detail — information-architecture pass

## Overview
The **Project Detail** page in MakeItHappen grew to the point where Decisions, Issues, Risks,
Project Tasks and Meeting Agendas were all stacked full-width below the two-column grid, so the
page scrolled forever and every section carried the same visual weight as Milestones.

This is an **information-architecture / layout pass only**. No visual restyle: same Geist type,
same card style, same design tokens, same accent system. Nothing is cut — every section that
exists today is still on the page and still reachable.

Three things change:
1. A **shortcut row** under the project header jumps to sections on the same page (it is *not* tabs
   and never changes screens).
2. The five registers (Decisions, Issues, Risks, Tasks, Agendas) collapse into **one single-open
   accordion group** at the bottom of the page.
3. Completed task titles lose the strike-through and keep only the light-gray treatment.

Explicitly unchanged: the Risk / Timeline / Budget / Executive-update row stays exactly where it is,
full-width along the top, and *Coming up next* + Milestones/Workstreams stay the prominent content.

## About the Design Files
`mockup/` holds a **design reference built in HTML/CSS/vanilla JS** — a working prototype of the
intended layout and behavior. It is **not** production code to copy verbatim. Recreate this IA in
the existing React codebase using its established components and conventions. The mock deliberately
reuses the app's real `styles.css` and the real Lucide paths from `icons.jsx` so spacing, color and
iconography are already correct.

`Project Detail IA v1 (A-B study).html` is the earlier two-option exploration, included for context
only. **Build from v2.**

## Fidelity
**High-fidelity on layout, spacing and behavior.** All values below are final. Colors and type come
from the existing tokens — do not introduce new ones.

## Screens / Views
All screenshots are at ~914px content width; the real app has a 248px sidebar, so the left column
will be narrower — the layout rules below are written to survive that.

| Screenshot | State |
|---|---|
| `01-default-top.png` | Default load: header, shortcut row, KPI row |
| `02-default-milestones-collapsed.png` | Default: all milestones collapsed, rail collapsed except Internal team |
| `03-registers-collapsed.png` | Registers & records group, all five collapsed |
| `04-jump-decisions-open.png` | After clicking the **Decisions** shortcut |
| `05-jump-agendas-open.png` | After clicking the **Agendas** shortcut |
| `06-milestones-expanded.png` | Milestones expanded via **Toggle all** |
| `07-rail-status-updates-open.png` | Rail with Status updates expanded |

### Page structure, top to bottom
```
Project header  (unchanged)
Shortcut row    (NEW — sticky)
┌─ section#sec-overview ─────────────────────────────────┐
│ KPI row: Risk · Timeline · Budget · Executive update   │  ← unchanged position
│ ┌─ left column (3fr) ──────┬─ right rail (2fr) ─────┐  │
│ │ Coming up next            │ Status updates         │  │
│ │ Milestones / Workstreams  │ Stakeholders           │  │
│ │  + Add milestone          │ Internal team  (open)  │  │
│ │                           │ External team          │  │
│ │                           │ Resources              │  │
│ └───────────────────────────┴────────────────────────┘  │
└────────────────────────────────────────────────────────┘
Registers & records  (NEW grouping — single-open accordion)
  Decisions · Issues · Risks · Tasks · Agendas
Overlays (draft email, task edit, edit project) — unchanged
```

## Layout changes, one by one

### 1. Shortcut row (new)
- Sits directly under the project header, **`position:sticky; top:0; z-index:30`**, background
  `var(--bg)`, `border-bottom:1px solid var(--border)`.
- Six shortcuts in order: **Overview · Decisions · Issues · Risks · Tasks · Agendas**.
- Each shortcut: `font-size:13.5px; font-weight:550; color:var(--ink-3)`, padding `9px 13px 11px`,
  `border-bottom:2px solid transparent`, `margin-bottom:-1px`.
- Active shortcut: `color:var(--accent-ink)`, `border-bottom-color:var(--accent)`.
- Count pill after the label (all except Overview): 11px/600, `background:var(--surface-2)`,
  `border:1px solid var(--border)`, `border-radius:20px`, `padding:0 6px`, `min-width:19px`.
  Active state pill: `background:var(--accent-soft)`, no border, `color:var(--accent-ink)`.
  A zero count renders at `opacity:.55`.
- Counts are live: Decisions 3, Issues 1, Risks 1, Tasks 0, Agendas 2.
- **These are scroll anchors, not tabs.** No route change, no content hidden behind them.

### 2. Registers & records (new grouping)
- One `.card` at the bottom of the page containing five rows; section label
  **"REGISTERS & RECORDS"** above it using the existing `.section-h` style.
- Each row header: `padding:13px 16px`, chevron (rotates 90° when open), bold 13.5px label, a
  gray summary line (`.rg-sub`, 12px `var(--ink-3)`), and a right-aligned count chip.
- Row body: `background:var(--surface-2)`, `border-top:1px solid var(--border)`,
  `padding:14px 16px 18px`. It holds the register's **existing** table/filters/actions unchanged.
- **Single-open accordion:** opening one row closes the others.
- **All five collapsed by default.**
- Row summaries and chips used in the mock:
  | Row | Summary | Chip |
  |---|---|---|
  | Decisions | Log of what was decided, when, and by whom | `3` |
  | Issues | 1 critical · resolved | `1` (amber `.status-hold`) |
  | Risks | 1 medium risk open | `1 open` (amber `.status-hold`) |
  | Tasks | Loose tasks tagged to this project | `0` |
  | Agendas | Meeting agendas, notes & exports | `2` |

### 3. Right rail order (changed)
Top to bottom: **Status updates → Stakeholders → Internal team → External team → Resources.**
All are collapsible accordions; **only Internal team is expanded by default** (open question — see
below). Each header shows an item count on the right.

### 4. Completed tasks (changed)
Remove `text-decoration:line-through` from completed task titles. Keep the light-gray color only —
use a `.done-t { color: var(--ink-4) }`-equivalent rather than the shared `.strike` class.

### 5. Unchanged
- Project header: title, LS mark, status chip, description, meta chips, action icons, and the 72px
  progress dial (84%, 16/19). Same position, same size.
- KPI row: Risk, Timeline, Budget, Executive update, all four in **one** row, grid
  `grid-template-columns: 1fr .85fr 1fr 2fr; gap:14px` — matching the current live proportions.
  Do not let the Executive-update card wrap to its own row.
- Milestones/Workstreams behavior, *Coming up next*, and all three overlays.

## Interactions & Behavior

### Shortcut click
1. If the target is a register row and it is closed, **open it** (which closes any other open row).
2. Scroll the window so the section top sits just below the sticky bar:
   `y = section.getBoundingClientRect().top + window.scrollY − shortcutBarHeight − 14`,
   `behavior:'smooth'`, clamped at 0.
3. Do **not** use `scrollIntoView` — measure and scroll the window, so the sticky bar offset is
   respected.

### Active-shortcut tracking
On scroll (passive listener), the active shortcut is the last section whose top is at or above
`shortcutBarHeight + 24`. Overview is the fallback.

### Milestones
Unchanged from the collapsible-milestones work already shipped: click a header to toggle, a
**Toggle all** action in the section header opens all if any are closed (otherwise closes all),
collapsed headers show a `done/total` count chip, and the date range appears inside the expanded
body (`.ms-span`) rather than in the header — that is what keeps collapsed headers to one 45px row.

### Rail accordions
Independent (not single-open); clicking a header toggles that section only.

## Layout rules that must survive a narrower column
The real page has a 248px sidebar, so the left column is narrower than in these screenshots. Two
rules exist specifically to prevent truncation — keep them:

- **Milestone header** (`.ms-head`): `display:flex; flex-wrap:wrap`. The title is
  `flex:1 1 auto; min-width:120px` and **wraps** — it must never be `white-space:nowrap` +
  `text-overflow:ellipsis`. The trailing count/due/status chips and the edit button live in one
  `margin-left:auto; flex-shrink:0` group, so the *chips* wrap to a second line before the title
  ever truncates.
- **Task row** (`.task-row`): same pattern. `.task-t` is `flex:1 1 auto; min-width:110px` and wraps;
  the trailing Next/state chip, due chip, avatar and delete button sit in a
  `margin-left:auto; flex-shrink:0` group.

Register tables: keep the row-action cell a real `table-cell` (`width:62px; text-align:right;
vertical-align:top`) and put the two icon buttons in an inner `display:flex` span. The shared
`.icon-btn { display:grid }` rule stacks them otherwise, and flexing the `<td>` itself breaks the
row divider at the right edge.

## Design Tokens
No new tokens. Everything comes from `styles.css` `:root` — `--bg #FAFAFB`, `--surface #FFFFFF`,
`--surface-2 #F6F7F9`, `--border #E7E9ED`, `--border-strong #D6D9DF`, `--ink #1A1D23`,
`--ink-2 #4A4F58`, `--ink-3 #8A909B`, `--ink-4 #B4BAC4`, accent `--work #4F6BED` /
`--work-soft #EEF1FD` / `--work-ink #2E45B8` (personal swaps to amber), `--next #10B981` /
`--next-soft #E7F7F1` / `--next-ink #0A7D58`, `--radius 8px`, `--shadow-sm`.
Font: Geist / Geist Mono. Section labels 12px/600 uppercase `letter-spacing:.04em`.

## Assets
- **Icons** — Lucide, from the app's `icons.jsx`. The mock needs four glyphs that set does not yet
  contain: **Trash2, Download, ExternalLink, FileText**. Canonical Lucide paths for them are in
  `mockup/ia-partials.js` (marked with a comment) — add them to `icons.jsx` rather than inlining.
- No raster images.

## Files
```
handoff_project_detail_ia/
├─ README.md                         ← this file
├─ screenshots/                      ← 7 states, table above
└─ mockup/
   ├─ Project Detail IA v2.html      ← BUILD FROM THIS: layout, jump logic, accordion logic
   ├─ ia-mock.css                    ← all layout CSS for the mock
   ├─ ia-partials.js                 ← section markup + the sample data shape
   ├─ styles.css                     ← the app's real tokens and component classes
   ├─ icons.jsx                      ← the app's real icon set
   └─ Project Detail IA v1 (A-B study).html   ← earlier exploration, context only
```

## Open question for the team
The rail's default-open section is still **Internal team**, from before the reorder. Now that
**Status updates** sits first, confirm which should be open on load.
