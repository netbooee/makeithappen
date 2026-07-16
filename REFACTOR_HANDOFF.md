# Handoff: split Projects.tsx into src/pages/projects/*.tsx

Paste this whole file as your first message in the new session (or just say
"read REFACTOR_HANDOFF.md and continue"). This file is scratch/instructions
only — not part of the app, delete it once the refactor is committed.

## Governing constraints (do not violate)

- User's original ask: "Let's look into breaking the project's TSX file into
  components. Do an analysis first on how safe this would be. I don't want to
  lose any user's data or mine." Safety of the split matters more than speed.
- User confirmed: **one big commit** at the end of the whole refactor — do not
  commit incrementally, do not commit per-file. The user will do the final
  commit themselves once everything is verified.
- User instruction: **work in smaller chunks** (smaller tool calls / edits at
  a time) to manage context, while still landing as a single final commit.
- No feature branches — this repo commits straight to `main`.
- Persistence model: all data reads/writes go through `useStore()`
  (`src/store/store.tsx`). `src/pages/Projects.tsx` itself holds no persisted
  state, so extracting components is purely a code-organization change with
  no data-migration risk — confirm this holds as you go.

## Current state (verified against the live repo just now)

- `src/pages/Projects.tsx` — **3165 lines, untouched, original, still fully
  intact.** Nothing has been deleted from it yet.
- `src/App.tsx` line 7 — still imports from the original:
  `import { ProjectDetail, ProjectList } from "./pages/Projects";`
  **Not yet repointed.** This is the only file that references Projects.tsx.
- 6 files already extracted into `src/pages/projects/`, done and verified,
  currently **untracked** (not committed):
  - `AddMilestone.tsx` (61 lines)
  - `KpiSection.tsx` (137 lines)
  - `UpdateTypeTag.tsx` (47 lines) — exports both `UpdateTypeTag` and `UpdateTypePicker`
  - `AddProjectTaskRow.tsx` (78 lines)
  - `ExternalTeamSection.tsx` (124 lines)
  - `ResourcesSection.tsx` (131 lines)
- Because nothing imports these 6 yet, they are inert — safe, additive,
  don't affect the running app either way.

## Remaining components to extract (current line numbers in Projects.tsx)

Verified via `grep -n "^function \|^export function " src/pages/Projects.tsx`
just before writing this handoff:

| New file | Source line range | Contents |
|---|---|---|
| `MilestoneCard.tsx` | 446–488, 548–809 (skip 489–547, that's `AddMilestone`, already done) | `AddSubtaskRow`, `SubtaskRow`, `MilestoneCard` |
| `MeetingAgendasSection.tsx` | 1550–1972 | `fmtAgendaDate`, `MeetingAgendasSection` |
| `StakeholderSection.tsx` | 1973–2149 | `extInitials`, `normalizeSat`, `SatIcon`, `StakeholderSection` |
| `RiskTracker.tsx` | 2434–2730 | `calcSeverity`, `RiskForm`, `RiskTracker` |
| `IssueTracker.tsx` | 2731–2999 | `IssueForm`, `IssueTracker` |
| `DraftEmailPanel.tsx` | 3040–3165 (end of file) | `DraftEmailPanel` |
| `ProjectModal.tsx` | 17–198 | `ProjectModal` |
| `ProjectList.tsx` | 199–445 | `export function ProjectList` |
| `ProjectDetail.tsx` | 1017–1549 | `export function ProjectDetail` (imports all the above subcomponents) |

Do these in roughly this order — leaves the two page-level exports
(`ProjectList`, `ProjectDetail`) for last since they depend on everything else.

Note: `extInitials` also exists as a local helper duplicated inside the
already-done `ExternalTeamSection.tsx` — that's fine, keep them as separate
local copies per file rather than sharing a util, matching the pattern
already used.

## Conventions used in the 6 done files (match these exactly)

- Relative imports: `useStore` from `"../../store/store"`, `DateInput` from
  `"../../components/ui"`, types from `"../../lib/types"`, constants (e.g.
  `CONTEXTS`) from `"../../lib/constants"`, icons from `"lucide-react"`.
- Extract verbatim — no behavior changes, no renames, no "while I'm here"
  cleanup. This is a pure move/split.
- Read the target line range out of the current `Projects.tsx` fresh each
  time before extracting (don't trust cached line numbers from this table if
  the file has changed since — re-grep first).

## Final steps once all 9 remaining files are extracted

1. Update `src/App.tsx` line 7 to import `ProjectDetail`/`ProjectList` from
   `./pages/projects/ProjectDetail` / `./pages/projects/ProjectList` (or a
   barrel file if that fits the pattern better — your call).
2. Delete the original `src/pages/Projects.tsx`.
3. Run typecheck/build (`npm run build` or equivalent — check `package.json`
   for the actual script) and fix any import errors.
4. Manually sanity-check the app still renders project list + project detail.
5. **One single commit** for the entire refactor (all 15 new files, the
   App.tsx change, and the deletion of the original). Do not push unless the
   user explicitly asks.
